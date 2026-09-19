import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { installFixtureRoutes, fixturePath } from './routes.js';

const baseURL = process.env.PERSONA_UI_BASE_URL || 'http://localhost:5191';
let server, browser;
try {
    if (!process.env.PERSONA_UI_BASE_URL) {
        server = spawn('dotnet', ['run', '--project', 'src/TtrpgPersona', '--', '--Application:Port=5191'], {
            cwd: fileURLToPath(new URL('../../', import.meta.url)), windowsHide: true, stdio: 'ignore'
        });
        server.on('error', error => { throw error; });
        let ready = false;
        for (let attempt = 0; attempt < 120 && !ready; attempt++) {
            if (server.exitCode !== null) throw new Error('Application startup failed. Check whether port 5191 is already occupied.');
            try { ready = (await fetch(baseURL)).ok; } catch {}
            if (!ready) await setTimeout(500);
        }
        if (!ready) throw new Error('Application did not become ready within 60 seconds.');
    }
    browser = await chromium.launch({ channel: 'chromium', headless: false });
    const context = await browser.newContext({ viewport: { width: 1348, height: 1000 } });
    await installFixtureRoutes(context);
    const page = await context.newPage();
    await page.goto(new URL(fixturePath, baseURL).href);
    console.log('Fictional UI preview opened. Close the preview browser to finish.');
    await new Promise(resolve => browser.on('disconnected', resolve));
} finally {
    await browser?.close();
    if (server) {
        if (process.platform === 'win32') {
            const stop = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
            await new Promise(resolve => stop.on('exit', resolve));
        } else server.kill('SIGTERM');
    }
}
