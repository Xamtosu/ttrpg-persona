import { createUiState, activeTurn, canGiveTurn, canEdit } from './ui-state.js';
import { translator, translate } from './i18n.js';
import { label, button } from './dom.js';
import { createDialog } from './components/dialog.js';
import { editCapability, openEditor } from './components/editors.js';
import { createSession } from './views/session.js';
import { createCharacter } from './views/character.js';
import { createKnowledge } from './views/knowledge.js';
import { createTranscriptView } from './views/transcript.js';
import { createDiagnostics } from './views/diagnostics.js';

/** Mounts the five workspaces against one session source; returns a disposer. */
export function mount(root, source) {
    const state = createUiState();
    const t = translator(state);
    const workspaces = ['session', 'character', 'knowledge', 'transcript', 'diagnostics'];
    root.innerHTML = `<div class="application"><header class="app-head"><div class="identity-head"><div class="brand"><span class="brand-category">TTRPG</span><span class="brand-word">PERSONA</span></div><div class="session-meta"></div></div><section class="control-stage" data-label="turnControls"><button class="hero-turn" id="turn-control"></button></section><div class="head-side"><span class="badge" id="turn-status"></span><button class="hero-mic" id="mic-control"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"></path></svg>${label('microphone')}</button><span class="locale" data-label="language"><button data-lang="en">EN</button><button data-lang="ru">RU</button></span>${button('endSession', 'id="end-session" data-lifecycle="endSession"')}<button class="app-button" id="session-actions" data-label="sessionActions" aria-haspopup="menu" aria-expanded="false">⋯</button></div></header><nav class="app-tabs" data-label="workspaces">${workspaces.map(key => `<button data-screen="${key}">${label(key)}</button>`).join('')}</nav><div class="notice" id="state-notice" role="status" hidden></div><div class="notice error" id="error-notice" role="status" hidden></div><div class="app-body">${workspaces.map(key => `<section data-workspace="${key}" data-label="${key}" ${key === 'session' ? '' : 'hidden'}></section>`).join('')}</div></div>`;
    let disposed = false;
    const app = {
        root, state, t, snapshot: source.getSnapshot(),
        locked: () => activeTurn(state, app.snapshot),
        editable: capability => canEdit(state, app.snapshot, capability),
        refresh, refreshHeader, execute
    };
    const views = [createSession, createCharacter, createKnowledge, createTranscriptView, createDiagnostics].map((create, i) => create(root.querySelector(`[data-workspace="${workspaces[i]}"]`), app));
    app.dialog = createDialog(root, app);
    const menu = document.createElement('div');
    menu.className = 'entry-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    root.append(menu);
    let menuTrigger = null, menuEntry = null;
    const events = new AbortController();

    async function execute(command) {
        const type = command.type;
        if (type === 'stopTurn') {
            if (!app.locked() || state.pending.has(type)) return { ok: false, code: 'unavailable' };
        } else if (type === 'requestTurn') {
            if (!canGiveTurn(state, app.snapshot)) return { ok: false, code: 'draftBlocked' };
        } else if (type === 'microphone') {
            if (!app.snapshot.capabilities.microphone || state.pending.has(type)) return { ok: false, code: 'unavailable' };
        } else if (!app.editable(type)) return { ok: false, code: 'unavailable' };
        const revision = app.snapshot.revision;
        state.pending.set(type, command);
        state.error = null;
        refresh();
        let result;
        try {
            result = await source.execute(command);
            if (result.ok && (app.snapshot.revision <= revision || source.getSnapshot() !== app.snapshot)) result = { ok: false, code: 'sourceContractError' };
            if (!result.ok) result = { ok: false, code: knownError(result.code) };
        } catch { result = { ok: false, code: 'commandFailed' }; }
        state.pending.delete(type);
        if (!result.ok) state.error = result.code;
        if (!disposed) refresh();
        return result;
    }

    function knownError(code) {
        return ['unavailable', 'sourceUnavailable', 'invalidSnapshot', 'saveFailed', 'summaryFailed', 'budgetExceeded', 'commandFailed', 'sourceContractError', 'splitEntryUnavailable'].includes(code) ? code : 'commandFailed';
    }

    function refreshHeader() {
        const locked = app.locked();
        const turn = root.querySelector('#turn-control');
        turn.textContent = t(locked ? 'stop' : 'giveTurn');
        turn.disabled = !locked && !canGiveTurn(state, app.snapshot);
        turn.classList.toggle('is-stop', locked);
        const status = root.querySelector('#turn-status');
        status.textContent = t(state.pending.has('requestTurn') ? 'finalizing' : app.snapshot.response.phase);
        status.classList.toggle('busy', locked);
        root.querySelector('.session-meta').textContent = app.snapshot.session ? `${app.snapshot.session.name} · ${t('saveHint')}` : t('noSession');
        const mic = root.querySelector('#mic-control');
        const microphone = app.snapshot.microphone;
        const micKey = !microphone.connected ? 'connectMic' : microphone.muted ? 'unmute' : 'mute';
        mic.disabled = !app.snapshot.capabilities.microphone || state.pending.has('microphone');
        mic.classList.toggle('is-off', !microphone.connected || microphone.muted);
        mic.setAttribute('aria-label', t(micKey));
        mic.setAttribute('aria-pressed', String(microphone.connected && !microphone.muted));
        mic.title = t(!microphone.connected ? 'micOff' : microphone.muted ? 'micMuted' : app.snapshot.response.phase === 'speaking' ? 'capturePaused' : 'listening');
        const notice = root.querySelector('#state-notice');
        const draftBlocked = state.dialog || state.split || state.drafts.size || state.pending.size;
        notice.hidden = !locked && !draftBlocked;
        notice.textContent = t(locked ? 'lockNotice' : 'controlDraft');
        const error = state.error || app.snapshot.error;
        root.querySelector('#error-notice').hidden = !error;
        root.querySelector('#error-notice').textContent = error ? t(knownError(error)) : '';
        root.querySelector('#session-actions').disabled = !!state.dialog;
        root.querySelectorAll('[data-lifecycle]').forEach(control => { control.disabled = !!state.dialog; });
    }

    function refresh() {
        if (disposed) return;
        if (state.split && !state.pending.has('splitUtterance')) {
            const entry = app.snapshot.transcript.find(item => item.id === state.split.id);
            if (!entry) {
                state.split = null;
                state.error = 'splitEntryUnavailable';
            } else if (state.split.text !== entry.text) {
                state.split.text = entry.text;
                state.split.position = 0;
                state.split.error = 'splitTextChanged';
            }
        }
        for (const section of root.querySelectorAll('[data-workspace]')) section.hidden = section.dataset.workspace !== state.workspace;
        root.querySelectorAll('.app-tabs [data-screen]').forEach(control => {
            if (control.dataset.screen === state.workspace) control.setAttribute('aria-current', 'page');
            else control.removeAttribute('aria-current');
        });
        for (const view of views) view.update();
        root.querySelectorAll('[data-edit]').forEach(control => {
            control.disabled = !!state.dialog || (control.dataset.edit.startsWith('connector:') ? app.locked() : !app.editable(editCapability(control.dataset.edit)));
        });
        refreshHeader();
        app.dialog.update();
        translate(root, state, t);
        if (!menu.hidden) renderMenu();
    }

    function closeMenu(restore = false) {
        menu.hidden = true;
        if (menuTrigger?.isConnected) {
            menuTrigger.setAttribute('aria-expanded', 'false');
            if (restore) menuTrigger.focus({ preventScroll: true });
        }
    }

    function renderMenu() {
        const focusIndex = [...menu.querySelectorAll('button')].indexOf(document.activeElement);
        if (menuEntry) {
            const entry = app.snapshot.transcript.find(item => item.id === menuEntry);
            if (!entry) { closeMenu(); return; }
            const person = app.snapshot.participants.find(item => item.id === entry.speaker);
            menu.innerHTML = [['edit', 'editUtterance'], ['assign', 'assignSpeaker'], ['split', 'splitUtterance'], [entry.excluded ? 'include' : 'exclude', 'excludeUtterance']].map(([key, capability]) => `<button role="menuitem" data-entry-action="${key}" ${app.editable(capability) && !(key === 'assign' && person?.role === 'agent') && !state.split ? '' : 'disabled'}>${t(key)}</button>`).join('');
        } else {
            const session = app.snapshot.session;
            const actions = ['startSession', 'openSession', 'endSession', 'exitAndSave', ...(session?.saveFailed ? ['retrySave'] : []), ...(session?.completed && session.summaryReviewed ? ['deleteTranscript'] : [])];
            menu.innerHTML = actions.map(key => `<button role="menuitem" data-lifecycle="${key}">${t(key)}</button>`).join('');
        }
        const rect = menuTrigger.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, rect.right - menu.offsetWidth))}px`;
        menu.style.top = `${Math.max(8, Math.min(innerHeight - menu.offsetHeight - 8, rect.bottom + 5))}px`;
        if (focusIndex >= 0) menu.querySelectorAll('button')[focusIndex]?.focus({ preventScroll: true });
    }

    root.addEventListener('click', event => {
        const control = event.target.closest('button');
        if (!control || control.disabled) return;
        const data = control.dataset;
        if (!control.closest('.entry-menu') && control !== menuTrigger) closeMenu();
        if (data.screen) { state.workspace = data.screen; closeMenu(); refresh(); }
        else if (data.lang) { state.locale = data.lang; refresh(); }
        else if (data.knowledge) { state.knowledge = data.knowledge; refresh(); }
        else if (data.diagnostic) { state.diagnostics = data.diagnostic; refresh(); }
        else if (data.lifecycle) { closeMenu(!!control.closest('.entry-menu')); app.dialog.openLifecycle(data.lifecycle); }
        else if (data.edit) openEditor(app, data.edit);
        else if (control.id === 'turn-control') execute({ type: app.locked() ? 'stopTurn' : 'requestTurn' });
        else if (control.id === 'mic-control') execute({ type: 'microphone', enabled: !app.snapshot.microphone.connected || app.snapshot.microphone.muted });
        else if (data.entryMenu || control.id === 'session-actions') {
            menuTrigger = control; menuEntry = data.entryMenu ?? null;
            menu.hidden = false; control.setAttribute('aria-expanded', 'true'); renderMenu();
            menu.querySelector('button:not(:disabled)')?.focus();
        } else if (data.entryAction) {
            const id = menuEntry;
            closeMenu(true);
            if (data.entryAction === 'edit' || data.entryAction === 'assign') openEditor(app, `${data.entryAction === 'edit' ? 'entry' : 'assign'}:${id}`);
            else if (data.entryAction === 'split' && app.editable('splitUtterance')) {
                state.split = { id, text: app.snapshot.transcript.find(entry => entry.id === id).text, position: 0, error: null }; refresh();
                const input = root.querySelector(`[data-workspace="${state.workspace}"] textarea[data-split-id]`);
                input.focus({ preventScroll: true }); input.setSelectionRange(0, 0);
            } else if (['exclude', 'include'].includes(data.entryAction)) execute({ type: 'excludeUtterance', id, excluded: data.entryAction === 'exclude' });
        }
    }, { signal: events.signal });
    document.addEventListener('pointerdown', event => { if (!menu.contains(event.target) && event.target !== menuTrigger) closeMenu(); }, { signal: events.signal });
    document.addEventListener('keydown', event => {
        if (menu.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const controls = [...menu.querySelectorAll('button:not(:disabled)')];
            if (!controls.length) return;
            const index = controls.indexOf(document.activeElement);
            controls[event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length].focus();
        }
        if (event.key === 'Tab') closeMenu();
    }, { signal: events.signal });
    window.addEventListener('resize', () => closeMenu(), { signal: events.signal });
    const unsubscribe = source.subscribe(snapshot => { app.snapshot = snapshot; refresh(); });
    refresh();
    return () => { disposed = true; unsubscribe(); events.abort(); app.dialog.dispose(); root.replaceChildren(); };
}
