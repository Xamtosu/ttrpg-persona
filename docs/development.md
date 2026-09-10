# Development and local launch

## Current scope

The repository contains an ASP.NET Core scaffold with one local page. Audio, cloud APIs, session storage, character templates, and Docker packaging are not implemented yet.

The application targets `net10.0` without mandatory Windows dependencies. Browser-based microphone capture and playback on the user's computer are a future requirement; the scaffold does not select an audio library.

## Prerequisites and layout

- .NET SDK 10.0.202 or a later patch in the same SDK feature band, as specified in [global.json](../global.json). Preview SDKs are excluded.
- [TtrpgPersona.slnx](../TtrpgPersona.slnx): the solution.
- [src/TtrpgPersona](../src/TtrpgPersona/TtrpgPersona.csproj): the single application project, using `Microsoft.NET.Sdk.Web` with no external package references.
- [Program.cs](../src/TtrpgPersona/Program.cs): application startup, loopback binding, and browser launch.
- [wwwroot/index.html](../src/TtrpgPersona/wwwroot/index.html): the initial page.

## Build and run

Run from the repository root:

```sh
dotnet build TtrpgPersona.slnx
dotnet run --project src/TtrpgPersona
```

The application listens only on localhost and opens `http://localhost:5180/` in the system's default browser after the server starts. Keep the console open; use Ctrl+C to stop the application. Closing the browser tab leaves the server running.

If launching the browser reports an error, the server remains available at the printed address for manual navigation.

## Port configuration

The default port is configured by `Application:Port` in [appsettings.json](../src/TtrpgPersona/appsettings.json). To override it for one run:

```sh
dotnet run --project src/TtrpgPersona -- --Application:Port=5181
```

The port must be an integer from 1 to 65535. An invalid or occupied port produces an error and exits with code 1 without opening the browser. The application does not select a replacement port automatically. A changed port takes effect on the next launch.

## Publish

From the repository root:

```sh
dotnet publish src/TtrpgPersona -c Release -o .agents/local/publish
```

This creates a framework-dependent application in the Git-ignored local workspace. Run the published executable on the build machine, or run `dotnet TtrpgPersona.dll` from the published directory on a machine with the .NET 10 ASP.NET Core Runtime. The generated native executable is platform-specific; targeting `net10.0` does not make that executable portable across operating systems.

Configuration and page files are resolved relative to the application's directory, independently of the working directory. Keep the published files together. The `wwwroot` files are also copied to the build output for local runs.

## Verification

The scaffold was checked on Windows with SDK 10.0.202:

- Build and Release publish completed without warnings or errors.
- The page returned HTTP 200 and opened in the system's default browser.
- The server listened on IPv4 and IPv6 loopback addresses only.
- An occupied port and a nonnumeric port produced the expected errors and exit code 1.
- The published executable served the page on an overridden port when launched from a different working directory.
- Stopping the application released the listening ports.

Linux/macOS execution and Docker packaging have not been verified. These checks do not measure microphone quality, cloud latency, or API costs.
