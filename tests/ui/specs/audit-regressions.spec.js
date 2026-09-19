import { test, expect } from '@playwright/test';
import { installFixtureRoutes, fixturePath } from '../routes.js';

const tab = (page, name) => page.locator(`.app-tabs [data-screen="${name}"]`).click();
const turn = page => page.locator('#turn-control');
const feed = page => page.locator('.chat-feed');
const bottomGap = page => feed(page).evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight);
async function action(page, id, name) {
    await page.locator(`[data-workspace]:not([hidden]) [data-entry-id="${id}"] .entry-more`).click();
    await page.locator(`[data-entry-action="${name}"]`).click();
}

test.beforeEach(async ({ page }) => {
    await installFixtureRoutes(page.context());
    await page.goto(fixturePath);
    await expect(turn(page)).toBeEnabled();
});

test('audit: keyboard-only split moves the caret without editing the utterance', async ({ page }) => {
    await action(page, 'u1', 'edit');
    await page.locator('#dialog-text').fill('Alpha 😀 Beta');
    await page.locator('#dialog-apply').click();
    await tab(page, 'transcript');
    await page.locator('#full-transcript [data-entry-id="u1"] .entry-more').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const input = page.locator('#full-transcript textarea');
    await expect(input).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    for (let count = 0; count < 6; count++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('x');
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('Alpha 😀 Beta');
    await page.keyboard.press('Enter');
    await expect(page.locator('#full-transcript [data-entry-id="u1"]')).toHaveCount(0);
    await expect(page.locator('#full-transcript .entry-text').first()).toHaveText('Alpha');
    await expect(page.locator('#full-transcript .entry-text').nth(1)).toHaveText('😀 Beta');
});

test('audit: changed source text invalidates a pending split position', async ({ page }) => {
    const original = await page.locator('#sidebar-transcript [data-entry-id="u1"] .entry-text').textContent();
    await action(page, 'u1', 'edit');
    await page.locator('#dialog-text').fill('Alpha Beta');
    await page.locator('#dialog-apply').click();
    await tab(page, 'transcript');
    await action(page, 'u1', 'split');
    const input = page.locator('#full-transcript textarea');
    for (let count = 0; count < 6; count++) await input.press('ArrowRight');
    await page.locator('#scenario').selectOption('ready');
    await expect(input).toHaveValue(original);
    await expect(page.locator('#full-transcript .inline-validation')).toContainText('changed');
    await input.press('Enter');
    await expect(page.locator('#full-transcript [data-entry-id="u1"]')).toHaveCount(1);
    await expect(turn(page)).toBeDisabled();
    for (let count = 0; count < 2; count++) await input.press('ArrowRight');
    await tab(page, 'session');
    await page.locator('.head-side [data-lang="ru"]').click();
    await page.locator('#sidebar-transcript textarea').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#sidebar-transcript [data-entry-id="u1"]')).toHaveCount(0);
    await expect(page.locator('#sidebar-transcript .entry-text').first()).toHaveText(original.slice(0, 2).trim());
    await expect(page.locator('#sidebar-transcript .entry-text').nth(1)).toHaveText(original.slice(2).trim());
});

test('audit: agent behavior follows participant roles rather than IDs', async ({ page }) => {
    const last = await page.locator('#last-response').textContent();
    await page.locator('#scenario').selectOption('participantIds');
    await expect(page.locator('#last-response')).toHaveText(last);
    await expect(page.locator('#sidebar-transcript [data-entry-id="u7"]')).toHaveClass(/agent-entry/);
    for (const workspace of ['session', 'transcript']) {
        await tab(page, workspace);
        const view = page.locator(`[data-workspace="${workspace}"]`);
        await view.locator('[data-entry-id="u7"] .entry-more').click();
        await expect(page.locator('[data-entry-action="assign"]')).toBeDisabled();
        await page.keyboard.press('Escape');
        await action(page, 'u1', 'assign');
        await expect(page.locator('#dialog-speaker option[value="participant-42"]')).toHaveCount(0);
        await page.locator('#dialog-speaker').selectOption('participant-23');
        await page.locator('#dialog-apply').click();
        await expect(view.locator('[data-entry-id="u1"] .entry-author')).toHaveText('Антон');
    }
});

test('audit: hidden arrivals preserve both following and older-message reading', async ({ page }) => {
    await expect.poll(() => bottomGap(page)).toBeLessThan(2);
    await tab(page, 'character');
    await page.locator('#append').click();
    await page.locator('#append').click();
    await tab(page, 'session');
    await expect.poll(() => bottomGap(page)).toBeLessThan(2);
    await expect(page.locator('.new-messages')).toBeHidden();
    await feed(page).evaluate(node => { node.scrollTop = 50; });
    await page.waitForTimeout(100);
    await tab(page, 'knowledge');
    await page.locator('#append').click();
    await page.locator('#append').click();
    await tab(page, 'session');
    await expect.poll(() => feed(page).evaluate(node => node.scrollTop)).toBe(50);
    await expect(page.locator('.new-messages')).toBeVisible();
    await page.locator('.new-messages').click();
    await expect.poll(() => bottomGap(page)).toBeLessThan(2);
});

test('audit: source publications retain focused workspace actions', async ({ page }) => {
    for (const [workspace, target] of [['diagnostics', 'connector:llm'], ['knowledge', 'summary'], ['knowledge', 'addFact'], ['transcript', 'participant:player']]) {
        await tab(page, workspace);
        if (workspace === 'diagnostics') await page.locator('[data-diagnostic="connections"]').click();
        const control = page.locator(`[data-edit="${target}"]`);
        await control.focus();
        await page.locator('#append').evaluate(node => node.click());
        await expect(control).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(control).toBeFocused();
    }
});

test('audit: save-error transitions retain the original focus return target', async ({ page }) => {
    await page.locator('#end-session').click();
    await page.locator('#dialog-apply').click();
    await expect(page.locator('#dialog-title')).toHaveText('Save error / retry');
    await page.locator('#dialog-apply').click();
    await page.locator('#dialog-cancel').click();
    await expect(page.locator('#end-session')).toBeFocused();
    await page.locator('#session-actions').click();
    await page.locator('.entry-menu [data-lifecycle="exitAndSave"]').click();
    await page.locator('#dialog-apply').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#session-actions')).toBeFocused();
});
