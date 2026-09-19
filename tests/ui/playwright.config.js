import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.PERSONA_UI_BASE_URL || 'http://localhost:5191';
export default defineConfig({
    testDir: './specs',
    outputDir: '../../.agents/local/ui-results',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: { baseURL, browserName: 'chromium', channel: 'chromium', viewport: { width: 1348, height: 1000 }, trace: 'retain-on-failure' },
    webServer: process.env.PERSONA_UI_BASE_URL ? undefined : {
        command: 'dotnet run --project src/TtrpgPersona -- --Application:Port=5191',
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        url: baseURL,
        timeout: 60000,
        reuseExistingServer: false,
        stdout: 'ignore'
    }
});
