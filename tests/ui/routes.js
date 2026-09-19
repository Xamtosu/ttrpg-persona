import { readFile } from 'node:fs/promises';

export const fixturePath = '/__persona_fixture__/';
export async function installFixtureRoutes(context) {
    const files = new Map(await Promise.all(['index.html', 'main.js', 'source.js', 'data.js'].map(async name => [name, await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')])));
    await context.route('**/__persona_fixture__/**', route => {
        const name = new URL(route.request().url()).pathname.slice(fixturePath.length) || 'index.html';
        if (!files.has(name)) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ status: 200, contentType: name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', body: files.get(name) });
    });
}
