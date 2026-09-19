import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { installFixtureRoutes, fixturePath } from './routes.js';

const baseURL = process.env.PERSONA_UI_BASE_URL || 'http://localhost:5191';
const output = new URL('../../.agents/local/interface-captures/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium' });
try {
    const context = await browser.newContext();
    await installFixtureRoutes(context);
    const reference = await readFile(new URL('../../docs/ux-wireframes.html', import.meta.url), 'utf8');
    await context.route('**/__persona_reference__/', route => route.fulfill({ contentType: 'text/html', body: reference }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const kind of ['reference', 'application']) {
        await page.goto(new URL(kind === 'reference' ? '/__persona_reference__/' : fixturePath, baseURL).href);
        for (const width of [1348, 820, 540, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const language of ['en', 'ru']) {
                await page.locator(`.application [data-lang="${language}"]`).click();
                for (const workspace of ['session', 'character', 'knowledge', 'transcript', 'diagnostics']) {
                    await page.locator(`.app-tabs [data-screen="${workspace}"]`).click();
                    await page.locator('.application').screenshot({ path: fileURLToPath(new URL(`${kind}-${width}-${language}-${workspace}.png`, output)) });
                }
            }
        }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.locator('#session-actions').click();
    await page.screenshot({ path: fileURLToPath(new URL('application-390-ru-menu.png', output)) });
    await page.locator('.entry-menu [data-lifecycle="startSession"]').click();
    await page.screenshot({ path: fileURLToPath(new URL('application-390-ru-dialog.png', output)) });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Captured application rectangles for all five workspaces, EN/RU, at 1348/820/540/390 pixels, plus menu and dialog.');
} finally { await browser.close(); }
