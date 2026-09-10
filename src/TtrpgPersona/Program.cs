using System.ComponentModel;
using System.Diagnostics;
using Microsoft.AspNetCore.Connections;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

if (!int.TryParse(builder.Configuration["Application:Port"], out var port) || port is < 1 or > 65535)
{
    Console.Error.WriteLine("Application:Port must be an integer from 1 to 65535.");
    return 1;
}

builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(port));

await using var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

try
{
    await app.StartAsync();
}
catch (IOException exception) when (exception.InnerException is AddressInUseException)
{
    Console.Error.WriteLine($"Port {port} is already in use. Close the other application instance or change Application:Port, then restart the application.");
    return 1;
}

var address = $"http://localhost:{port}/";

try
{
    using var browser = Process.Start(new ProcessStartInfo(address) { UseShellExecute = true });
}
catch (Exception exception) when (exception is Win32Exception or InvalidOperationException)
{
    Console.Error.WriteLine($"Could not open the default browser. Open {address} manually.");
}

await app.WaitForShutdownAsync();
return 0;
