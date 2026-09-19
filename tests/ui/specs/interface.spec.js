import { test, expect } from '@playwright/test';
import { installFixtureRoutes, fixturePath } from '../routes.js';

const tab = (page, name) => page.locator(`.app-tabs [data-screen="${name}"]`).click();
const turn = page => page.locator('#turn-control');
const dialog = page => page.getByRole('dialog');
const apply = page => page.locator('#dialog-apply').click();
const cancel = page => page.locator('#dialog-cancel').click();
const scenario = (page, name) => page.locator('#scenario').selectOption(name);
async function fixture(page) {
    await installFixtureRoutes(page.context());
    await page.goto(fixturePath);
    await expect(turn(page)).toBeEnabled();
}
async function action(page, id, name) {
    await page.locator(`[data-workspace]:not([hidden]) [data-entry-id="${id}"] .entry-more`).click();
    await page.locator(`[data-entry-action="${name}"]`).click();
}
async function lifecycle(page, name) {
    await page.locator('#session-actions').click();
    await page.locator(`.entry-menu [data-lifecycle="${name}"]`).click();
}
test('ordinary application is empty, bilingual and makes only local asset requests', async ({ page }) => {
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () => { throw new Error('Unexpected microphone request'); };
    });
    await page.goto('/?fixture=ready');
    await expect(page.locator('#session-empty')).toBeVisible();
    await expect(turn(page)).toBeDisabled();
    for (const name of ['character', 'knowledge', 'transcript', 'diagnostics', 'session']) await tab(page, name);
    await page.locator('#session-empty [data-lifecycle="startSession"]').click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator('#dialog-apply')).toBeDisabled();
    await page.locator('#dialog-name').fill('Draft session');
    await page.locator('.head-side [data-lang="ru"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('#dialog-name')).toHaveValue('Draft session');
    await expect(dialog(page)).toContainText('Начать сессию');
    await cancel(page);
    await tab(page, 'diagnostics');
    await page.locator('[data-diagnostic="connections"]').click();
    await page.locator('[data-edit="connector:stt"]').click();
    await expect(page.locator('#credential')).toBeDisabled();
    await expect(page.locator('#credential')).toHaveValue('');
    await expect(page.locator('#dialog-apply')).toBeDisabled();
    expect(errors).toEqual([]);
    expect(requests.every(path => path === '/' || path.startsWith('/js/') || path.startsWith('/css/'))).toBeTruthy();
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    const response = await page.request.get(fixturePath);
    expect(response.status()).toBe(404);
});

test('shared transcript edit, assignment, repeated split and exclusion', async ({ page }) => {
    await fixture(page);
    await action(page, 'u1', 'edit');
    await page.locator('#dialog-text').fill('First second third 😀 end');
    await apply(page);
    await expect(page.locator('#sidebar-transcript [data-entry-id="u1"]')).toContainText('First second third');
    await tab(page, 'transcript');
    await expect(page.locator('#full-transcript [data-entry-id="u1"]')).toContainText('First second third');
    await action(page, 'u1', 'assign');
    await page.locator('#dialog-speaker').selectOption('player');
    await apply(page);
    await expect(page.locator('#full-transcript [data-entry-id="u1"] .entry-author')).toHaveText('Антон');
    await action(page, 'u1', 'split');
    const split = page.locator('#full-transcript textarea');
    await split.evaluate(input => input.setSelectionRange(6, 6));
    await split.press('Enter');
    await expect(page.locator('#full-transcript [data-entry-id="u1"]')).toHaveCount(0);
    await expect(page.locator('#full-transcript .chat-entry')).toHaveCount(8);
    const id = await page.locator('#full-transcript .chat-entry').nth(1).getAttribute('data-entry-id');
    await action(page, id, 'split');
    await page.locator('#full-transcript textarea').evaluate(input => input.setSelectionRange(7, 7));
    await page.locator('#full-transcript textarea').press('Enter');
    await expect(page.locator('#full-transcript .chat-entry')).toHaveCount(9);
    const firstId = await page.locator('#full-transcript .chat-entry').first().getAttribute('data-entry-id');
    await action(page, firstId, 'exclude');
    await expect(page.locator(`#full-transcript [data-entry-id="${firstId}"]`)).toHaveClass(/entry-excluded/);
    await tab(page, 'session');
    await expect(page.locator('#sidebar-transcript .chat-entry')).toHaveCount(9);
    await expect(page.locator(`#sidebar-transcript [data-entry-id="${firstId}"]`)).toHaveClass(/entry-excluded/);
    await tab(page, 'knowledge');
    await expect(page.locator('#summary-validity')).toContainText('Invalidated');
});

test('split persists across navigation and language, rejecting empty and Unicode boundaries', async ({ page }) => {
    await fixture(page);
    await action(page, 'u1', 'edit');
    await page.locator('#dialog-text').fill('A 😀 é B');
    await apply(page);
    await tab(page, 'transcript');
    await action(page, 'u1', 'split');
    const split = page.locator('#full-transcript textarea');
    for (const position of [0, 3, 6, 9]) {
        await split.evaluate((input, pos) => input.setSelectionRange(pos, pos), position);
        await split.press('Enter');
        await expect(page.locator('#full-transcript .inline-validation')).not.toBeEmpty();
        await expect(page.locator('#full-transcript .chat-entry')).toHaveCount(7);
    }
    await tab(page, 'session');
    await page.locator('.head-side [data-lang="ru"]').click();
    await expect(turn(page)).toBeDisabled();
    await page.locator('#sidebar-transcript [data-cancel-split]').click();
    await expect(turn(page)).toBeEnabled();
});

test('delayed and rejected drafts remain blockers across navigation and source updates', async ({ page }) => {
    await fixture(page);
    await tab(page, 'knowledge');
    await page.locator('[data-knowledge="notes"]').click();
    await page.locator('[data-edit="notes"]').click();
    await page.locator('#dialog-notes').fill('Retained draft');
    await page.locator('#refresh-source').click();
    await expect(page.locator('#dialog-notes')).toHaveValue('Retained draft');
    await page.locator('.head-side [data-lang="ru"]').click();
    await expect(page.locator('#dialog-notes')).toHaveValue('Retained draft');
    await page.locator('#command-mode').selectOption('delay');
    await apply(page);
    await tab(page, 'session');
    await cancel(page);
    await expect(turn(page)).toBeDisabled();
    await page.locator('#release').click();
    await expect(turn(page)).toBeEnabled();
    await tab(page, 'knowledge');
    await expect(page.locator('.notes-editor')).toHaveText('Retained draft');
    await page.locator('[data-edit="notes"]').click();
    await page.locator('#dialog-notes').fill('Rejected draft');
    await page.locator('#command-mode').selectOption('reject');
    await apply(page);
    await expect(page.locator('#dialog-error')).not.toBeEmpty();
    await expect(page.locator('#dialog-notes')).toHaveValue('Rejected draft');
    await expect(turn(page)).toBeDisabled();
    await cancel(page);
    await expect(turn(page)).toBeEnabled();
});

test('every editor gates Give turn and Stop takes precedence', async ({ page }) => {
    await fixture(page);
    for (const [workspace, target] of [['character', 'addItem'], ['knowledge', 'summary'], ['diagnostics', 'connector:llm']]) {
        await tab(page, workspace);
        if (workspace === 'diagnostics') await page.locator('[data-diagnostic="connections"]').click();
        await page.locator(`[data-edit="${target}"]`).click();
        await expect(turn(page)).toBeDisabled();
        await scenario(page, 'thinking');
        await expect(turn(page)).toBeEnabled();
        await expect(turn(page)).toHaveText('Stop');
        await expect(page.locator('#dialog-apply')).toBeDisabled();
        await turn(page).click();
        await expect(turn(page)).toHaveText('Give turn');
        await expect(turn(page)).toBeDisabled();
        await cancel(page);
    }
    await page.locator('#command-mode').selectOption('delay');
    await turn(page).click();
    await expect(turn(page)).toHaveText('Stop');
    await expect(turn(page)).toBeEnabled();
    await tab(page, 'character');
    await expect(page.locator('[data-sheet="className"]')).toBeDisabled();
    await expect(page.locator('[data-edit="addItem"]')).toBeDisabled();
    await tab(page, 'transcript');
    await page.locator('#full-transcript .entry-more').first().click();
    await expect(page.locator('[data-entry-action="edit"]')).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.locator('#release').click();
    await turn(page).click();
    await expect(turn(page)).toHaveText('Give turn');
});

test('inventory zero quantity, explicit removal, validation and rejected add', async ({ page }) => {
    await fixture(page);
    await tab(page, 'character');
    const item = page.locator('[data-item-id="i0"]');
    await item.locator('[data-inventory-action="decrease"]').click();
    await expect(item.locator('output')).toHaveText('0');
    await expect(item.locator('[data-inventory-action="decrease"]')).toBeDisabled();
    await expect(item).toBeVisible();
    await item.locator('[data-inventory-action="remove"]').click();
    await expect(item).toHaveCount(0);
    await page.locator('[data-edit="addItem"]').click();
    await apply(page);
    await expect(page.locator('#dialog-error')).not.toBeEmpty();
    await expect(dialog(page).locator('input:not(:disabled)')).toHaveCount(1);
    await page.locator('#dialog-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#command-mode').selectOption('reject');
    await apply(page);
    await expect(page.locator('#dialog-name')).toHaveValue('<img src=x onerror=alert(1)>');
    await page.locator('#command-mode').selectOption('accept');
    await apply(page);
    await expect(page.locator('.inventory-row').last()).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('.inventory-row').last().locator('output')).toHaveText('1');
    await expect(page.locator('#app img')).toHaveCount(0);
});

test('inline validation and connector metadata preserve values and locks', async ({ page }) => {
    await fixture(page);
    await tab(page, 'character');
    await page.locator('#sheet-level').fill('0');
    await page.locator('#sheet-level').press('Enter');
    await expect(page.locator('#sheet-validation')).not.toBeEmpty();
    await tab(page, 'session');
    await expect(turn(page)).toBeDisabled();
    await tab(page, 'character');
    await page.locator('#discard-sheet').click();
    await page.locator('#sheet-level').fill('4');
    await page.locator('#sheet-level').press('Enter');
    await expect(turn(page)).toBeEnabled();
    await tab(page, 'diagnostics');
    await page.locator('[data-diagnostic="connections"]').click();
    await page.locator('[data-edit="connector:stt"]').click();
    await page.locator('#dialog-endpoint').fill('not a URL');
    await apply(page);
    await expect(page.locator('#dialog-error')).not.toBeEmpty();
    await page.locator('#dialog-endpoint').fill('https://stt.example.invalid');
    await page.locator('#dialog-project').fill('Fictional project');
    await apply(page);
    await expect(page.locator('#mic-control')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('[data-edit="connector:stt"]').click();
    await expect(page.locator('#dialog-project')).toHaveValue('Fictional project');
    await expect(page.locator('#credential')).toHaveValue('');
});

test('all lifecycle surfaces expose failures without real persistence in both languages', async ({ page }) => {
    await fixture(page);
    for (const locale of ['en', 'ru']) {
        await page.locator(`.head-side [data-lang="${locale}"]`).click();
        for (const type of ['startSession', 'openSession']) {
            await lifecycle(page, type);
            await apply(page);
            await expect(page.locator('#dialog-error')).not.toBeEmpty();
            if (type === 'startSession') {
                await page.locator('#dialog-name').fill('Fictional session');
                await page.locator('#dialog-characterReference').fill('fictional-character');
            } else await page.locator('#dialog-reference').fill('fictional-snapshot');
            await apply(page);
            await expect(page.locator('#dialog-error')).not.toBeEmpty();
            await expect(dialog(page).locator('input').first()).not.toHaveValue('');
            await cancel(page);
        }
        for (const type of ['endSession', 'exitAndSave']) {
            await lifecycle(page, type);
            if (type === 'exitAndSave') await expect(dialog(page)).toContainText('LLM');
            await apply(page);
            await expect(page.locator('#dialog-title')).toHaveText(locale === 'en' ? 'Save error / retry' : 'Ошибка сохранения / повтор');
            await apply(page);
            await expect(dialog(page)).toBeVisible();
            await cancel(page);
            await expect(page.locator('#home-character')).toHaveText('Mira Vale');
        }
        for (const value of ['summaryFailed', 'budgetExceeded']) {
            await scenario(page, value);
            await lifecycle(page, 'endSession');
            await expect(page.locator('#dialog-description')).not.toBeEmpty();
            await cancel(page);
        }
        await scenario(page, 'saveFailed');
        await lifecycle(page, 'retrySave');
        await cancel(page);
        await scenario(page, 'unreviewed');
        await page.locator('#session-actions').click();
        await expect(page.locator('[data-lifecycle="deleteTranscript"]')).toHaveCount(0);
        await page.keyboard.press('Escape');
        await scenario(page, 'completed');
        await lifecycle(page, 'deleteTranscript');
        await expect(page.locator('#dialog-description')).toContainText(locale === 'en' ? 'backup' : 'резервных');
        await apply(page);
        await expect(page.locator('#dialog-error')).not.toBeEmpty();
        await cancel(page);
        await expect(page.locator('#sidebar-transcript .chat-entry')).toHaveCount(7);
    }
});

test('sidebar reading position survives edits, locale and navigation; arrivals show an indicator', async ({ page }) => {
    await fixture(page);
    const feed = page.locator('.chat-feed');
    await feed.evaluate(node => { node.scrollTop = 50; });
    await page.waitForTimeout(100);
    await page.locator('#append').click();
    await expect(page.locator('.new-messages')).toBeVisible();
    expect(await feed.evaluate(node => node.scrollTop)).toBe(50);
    await page.locator('.head-side [data-lang="ru"]').click();
    expect(await feed.evaluate(node => node.scrollTop)).toBe(50);
    await tab(page, 'transcript');
    await action(page, 'u2', 'edit');
    await page.locator('#dialog-text').fill('Изменённая реплика.');
    await apply(page);
    await tab(page, 'session');
    expect(await feed.evaluate(node => node.scrollTop)).toBe(50);
    await page.locator('.new-messages').click();
    await expect(page.locator('.new-messages')).toBeHidden();
    expect(await feed.evaluate(node => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(2);
});

test('source must publish acceptance before the draft is cleared', async ({ page }) => {
    await fixture(page);
    await tab(page, 'knowledge');
    await page.locator('[data-edit="summary"]').click();
    await page.locator('#dialog-text').fill('Unconfirmed summary');
    await page.locator('#command-mode').selectOption('badOrder');
    await apply(page);
    await expect(page.locator('#dialog-error')).toContainText('did not confirm');
    await expect(page.locator('#dialog-text')).toHaveValue('Unconfirmed summary');
    await expect(turn(page)).toBeDisabled();
    await page.locator('#command-mode').selectOption('publishWait');
    await apply(page);
    await expect(page.locator('.session-summary')).toHaveText('Unconfirmed summary');
    await expect(page.locator('#dialog-apply')).toBeDisabled();
    await expect(turn(page)).toBeDisabled();
    await page.locator('#release').click();
    await expect(dialog(page)).toBeHidden();
    await expect(turn(page)).toBeEnabled();
});

test('pointer splitting uses the selected text position', async ({ page }) => {
    await fixture(page);
    await action(page, 'u1', 'split');
    const input = page.locator('#sidebar-transcript textarea');
    await input.click({ position: { x: 85, y: 20 } });
    await expect(page.locator('#sidebar-transcript .chat-entry')).toHaveCount(8);
    await expect(page.locator('#sidebar-transcript [data-entry-id="u1"]')).toHaveCount(0);
});

test('all sheet and knowledge editors accept manual fields in both languages', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await fixture(page);
    for (const locale of ['en', 'ru']) {
        await page.locator(`.head-side [data-lang="${locale}"]`).click();
        await tab(page, 'character');
        for (const target of ['identity', 'skills', 'resources', 'features', 'spells']) {
            await page.locator(`[data-edit="${target}"]`).click();
            await expect(dialog(page)).toBeVisible();
            await apply(page);
            await expect(dialog(page)).toBeHidden();
        }
        await tab(page, 'knowledge');
        await page.locator('[data-knowledge="persona"]').click();
        await page.locator('[data-edit="persona"]').click();
        await apply(page);
        await expect(dialog(page)).toBeHidden();
        await page.locator('[data-knowledge="world"]').click();
        await page.locator('[data-edit="fact:f0"]').click();
        await apply(page);
        await page.locator('[data-edit="addFact"]').click();
        await page.locator('#dialog-text').fill('Вымышленный факт');
        await page.locator('#dialog-source').fill('Вымышленный источник');
        await apply(page);
        await tab(page, 'transcript');
        await page.locator('[data-edit="participant:player"]').click();
        await apply(page);
    }
    expect(errors).toEqual([]);
});

test('locale dictionaries cover the same product keys', async ({ page }) => {
    await page.goto('/');
    const keys = await page.evaluate(async () => {
        const { dictionaries } = await import('/js/i18n.js');
        return Object.fromEntries(Object.entries(dictionaries).map(([locale, values]) => [locale, Object.keys(values).sort()]));
    });
    expect(keys.en).toEqual(keys.ru);
});

test('menus and dialogs support keyboard focus and Escape', async ({ page }) => {
    await fixture(page);
    await page.locator('#session-actions').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.entry-menu button').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#dialog-reference')).toBeFocused();
    await page.locator('#dialog-reference').fill('Saved draft');
    await dialog(page).locator('[data-lang="ru"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('#dialog-reference')).toHaveValue('Saved draft');
    await scenario(page, 'thinking');
    await dialog(page).locator('[data-dialog-stop]').focus();
    await page.keyboard.press('Enter');
    await expect(turn(page)).toHaveText('Дать слово');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#session-actions')).toBeFocused();
});

test('EN/RU screens fit desktop and narrow widths without page overflow or errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await fixture(page);
    for (const width of [1348, 820, 540, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const locale of ['en', 'ru']) {
            await page.locator(`.head-side [data-lang="${locale}"]`).click();
            for (const workspace of ['session', 'character', 'knowledge', 'transcript', 'diagnostics']) {
                await tab(page, workspace);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
            }
            await lifecycle(page, 'startSession');
            const box = await dialog(page).boundingBox();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            await cancel(page);
        }
    }
    await page.setViewportSize({ width: 1348, height: 1000 });
    const dimensions = await turn(page).boundingBox();
    expect(dimensions.width).toBe(273);
    expect(dimensions.height).toBeCloseTo(79.2, 1);
    expect(errors).toEqual([]);
});
