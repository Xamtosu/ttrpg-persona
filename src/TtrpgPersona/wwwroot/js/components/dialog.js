import { escapeHtml, button, label } from '../dom.js';
import { translate } from '../i18n.js';

export function createDialog(root, app) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.hidden = true;
    backdrop.innerHTML = `<section class="modal" role="dialog" aria-labelledby="dialog-title"><button class="modal-close" data-label="close">×</button><div class="dialog-tools"><span class="locale" data-label="language"><button type="button" data-lang="en">EN</button><button type="button" data-lang="ru">RU</button></span><button class="app-button dialog-stop" type="button" hidden data-dialog-stop>${label('stop')}</button></div><h2 id="dialog-title"></h2><p class="muted" id="dialog-description"></p><p id="dialog-context" class="prose"></p><form novalidate><div id="dialog-fields"></div><p id="dialog-error" class="editor-validation" role="status"></p><p id="dialog-unavailable" class="micro"></p><div class="modal-actions">${button('cancel', 'type="button" id="dialog-cancel"')}${button('apply', 'type="submit" id="dialog-apply"', 'primary')}</div></form></section>`;
    root.append(backdrop);
    const form = backdrop.querySelector('form');
    let previousFocus;
    let previousEdit;

    function close() {
        app.state.dialog = null;
        backdrop.hidden = true;
        app.refresh();
        const editorTrigger = [...root.querySelectorAll('[data-edit]')].find(control => control.dataset.edit === previousEdit && control.getClientRects().length);
        if (editorTrigger && !editorTrigger.disabled) editorTrigger.focus({ preventScroll: true });
        else if (previousFocus?.isConnected && previousFocus.getClientRects().length && !previousFocus.disabled) previousFocus.focus({ preventScroll: true });
        else app.root.querySelector(`[data-screen="${app.state.workspace}"]`).focus();
    }

    function validate(draft) {
        let error = null;
        for (const field of draft.fields) {
            const value = String(draft.values[field.key]).trim();
            let invalid = null;
            if (field.required !== false && !value) invalid = 'requiredText';
            if (value && field.type === 'number' && (!Number.isSafeInteger(Number(value)) || Number(value) < (field.min ?? 0))) invalid = field.min === 1 ? 'positiveLevel' : 'nonnegativeNumber';
            if (value && field.type === 'url') {
                try {
                    const url = new URL(value);
                    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) invalid = 'invalidEndpoint';
                } catch { invalid = 'invalidEndpoint'; }
            }
            if (value && field.reference && /[\u0000-\u001f]/u.test(value)) invalid = 'invalidReference';
            form.elements[field.key].setAttribute('aria-invalid', String(!!invalid));
            if (invalid && !error) error = invalid;
        }
        draft.error = error;
        return !error;
    }

    function open(spec) {
        if (!app.state.dialog) {
            previousFocus = document.activeElement;
            previousEdit = previousFocus.dataset.edit;
        }
        const draft = { fields: [], action: 'apply', description: 'applyHint', ...spec, values: {}, error: null };
        for (const field of draft.fields) draft.values[field.key] = String(field.value ?? '');
        app.state.dialog = draft;
        backdrop.querySelector('#dialog-fields').innerHTML = draft.fields.map(field => {
            const attributes = `name="${escapeHtml(field.key)}" id="dialog-${escapeHtml(field.key)}" class="editor-input" autocomplete="off"`;
            let control;
            if (field.options) control = `<select ${attributes}>${field.options.map(option => `<option value="${escapeHtml(option.value)}" ${option.key ? `data-i="${option.key}"` : ''}>${escapeHtml(option.text ?? '')}</option>`).join('')}</select>`;
            else if (field.type === 'textarea') control = `<textarea ${attributes}></textarea>`;
            else control = `<input ${attributes} type="${field.type === 'number' ? 'number' : 'text'}" ${field.type === 'number' ? `min="${field.min ?? 0}" step="1"` : ''}>`;
            return `<div class="editor-field"><label for="dialog-${escapeHtml(field.key)}">${label(field.label)}${escapeHtml(field.suffix ?? '')}</label>${control}</div>`;
        }).join('') + (draft.credential ? `<div class="editor-field"><label for="credential">${label('apiKey')}</label><input id="credential" type="password" class="editor-input" disabled value="" autocomplete="off"><p class="micro">${label('credentialUnavailable')}</p></div>` : '');
        for (const field of draft.fields) form.elements[field.key].value = draft.values[field.key];
        backdrop.hidden = false;
        app.refresh();
        (form.querySelector('input:not(:disabled),textarea,select') ?? backdrop.querySelector('.modal-close')).focus({ preventScroll: true });
    }

    function update() {
        const draft = app.state.dialog;
        if (!draft) return;
        const stop = backdrop.querySelector('[data-dialog-stop]');
        const stopFocused = document.activeElement === stop;
        stop.hidden = !app.locked();
        if (stop.hidden && stopFocused) backdrop.querySelector('.modal-close').focus({ preventScroll: true });
        backdrop.querySelector('#dialog-title').textContent = app.t(draft.title);
        backdrop.querySelector('#dialog-description').textContent = app.t(draft.description);
        backdrop.querySelector('#dialog-context').textContent = draft.context ?? '';
        backdrop.querySelector('#dialog-error').textContent = draft.error ? app.t(draft.error) : '';
        backdrop.querySelector('#dialog-unavailable').textContent = app.snapshot.capabilities[draft.command.type] ? '' : app.t('unavailable');
        backdrop.querySelector('#dialog-apply').disabled = !app.editable(draft.command.type);
        backdrop.querySelector('#dialog-apply span').dataset.i = app.state.pending.has(draft.command.type) ? 'applying' : draft.action;
        for (const field of draft.fields) form.elements[field.key].disabled = app.locked() || app.state.pending.has(draft.command.type);
        translate(backdrop, app.state, app.t);
    }

    form.addEventListener('input', event => {
        const draft = app.state.dialog;
        draft.values[event.target.name] = event.target.value;
        if (draft.error) validate(draft);
        update();
    });
    form.addEventListener('focusout', event => {
        if (event.target.name && app.state.dialog) { validate(app.state.dialog); update(); }
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const draft = app.state.dialog;
        if (!validate(draft) || !app.editable(draft.command.type)) { update(); return; }
        const values = Object.fromEntries(draft.fields.map(field => [field.key, field.type === 'number' ? Number(draft.values[field.key]) : draft.values[field.key].trim()]));
        const result = await app.execute({ ...draft.command, values });
        if (app.state.dialog !== draft) return;
        if (result.ok) close();
        else {
            draft.error = result.code;
            if (result.code === 'saveFailed') openLifecycle('retrySave');
            else update();
        }
    });
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.querySelector('[data-dialog-stop]').addEventListener('click', () => app.execute({ type: 'stopTurn' }));
    backdrop.querySelector('#dialog-cancel').addEventListener('click', close);
    backdrop.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
            const controls = [...backdrop.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(control => control.getClientRects().length);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });

    function openLifecycle(type) {
        const session = app.snapshot.session;
        if (type === 'deleteTranscript' && !(session?.completed && session.summaryReviewed)) return;
        const fields = type === 'startSession' ? [
            { key: 'name', label: 'sessionName' },
            { key: 'characterReference', label: 'characterReference', reference: true },
            { key: 'knowledgeReference', label: 'knowledgeReference', reference: true, required: false }
        ] : type === 'openSession' ? [{ key: 'reference', label: 'savedReference', reference: true }] : [];
        const description = type === 'endSession' && session?.summaryFailure ? session.summaryFailure : `${type}Body`;
        open({ title: type, description, action: type === 'retrySave' ? 'retry' : type,
            fields, command: { type }, context: type === 'deleteTranscript' ? session.name : '' });
    }
    return { open, close, update, openLifecycle, dispose: () => backdrop.remove() };
}
