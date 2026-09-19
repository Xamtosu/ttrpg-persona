import { label, button } from '../dom.js';

export function createTranscript(container, app, sidebar = false) {
    container.innerHTML = `<div class="${sidebar ? 'chat-feed' : 'transcript-table'}" data-label="liveTranscript" tabindex="0"></div>${sidebar ? '<button class="new-messages" hidden></button>' : ''}`;
    const feed = container.firstElementChild;
    const indicator = container.querySelector('.new-messages');
    const rows = new Map();
    let lastIds = new Set(), initialized = false, following = true, pendingFollow = true, unread = 0, savedTop = 0;

    function update() {
        const entries = app.snapshot.transcript;
        const visible = feed.getClientRects().length > 0;
        const oldTop = visible ? feed.scrollTop : savedTop;
        const added = entries.filter(entry => !lastIds.has(entry.id)).length;
        if (added && following) pendingFollow = true;
        if (initialized && added && !following) unread += added;
        for (const [id, row] of rows) if (!entries.some(entry => entry.id === id)) { row.remove(); rows.delete(id); }
        const empty = feed.querySelector('.empty-feed');
        if (entries.length) empty?.remove();
        else if (!empty) feed.innerHTML = `<p class="muted empty-feed">${label('noTranscript')}</p>`;
        entries.forEach((entry, index) => {
            let row = rows.get(entry.id);
            if (!row) {
                row = document.createElement('article');
                row.dataset.entryId = entry.id;
                row.innerHTML = `<div class="entry-top"><div><span class="entry-author"></span><time class="entry-time"></time></div><button class="entry-more" data-label="utteranceActions" aria-haspopup="menu" aria-expanded="false">…</button></div><div class="entry-body"></div><div class="entry-status"></div>`;
                rows.set(entry.id, row);
            }
            if (feed.children[index] !== row) feed.insertBefore(row, feed.children[index] ?? null);
            const person = app.snapshot.participants.find(item => item.id === entry.speaker);
            row.className = `chat-entry ${person?.role === 'agent' ? 'agent-entry' : ''} ${entry.excluded ? 'entry-excluded' : ''}`;
            row.querySelector('.entry-author').textContent = person?.name || app.t('unknownSpeaker');
            row.querySelector('.entry-time').textContent = entry.time;
            row.querySelector('.entry-more').dataset.entryMenu = entry.id;
            row.querySelector('.entry-more').disabled = !!entry.interim;
            row.querySelector('.entry-status').textContent = app.t(entry.interim ? 'interim' : entry.excluded ? 'excluded' : entry.playback ?? 'included');
            const body = row.querySelector('.entry-body');
            if (app.state.split?.id === entry.id) {
                if (!body.querySelector('textarea')) {
                    body.innerHTML = `<div class="inline-split"><textarea aria-readonly="true" spellcheck="false" data-label="choosePosition"></textarea><p class="inline-validation" role="status"></p>${button('cancel', 'data-cancel-split', 'small')}</div>`;
                    const input = body.querySelector('textarea');
                    input.dataset.splitId = entry.id;
                }
                const input = body.querySelector('textarea');
                const textChanged = input.value !== app.state.split.text;
                if (textChanged) input.value = app.state.split.text;
                if (textChanged || document.activeElement !== input) input.setSelectionRange(app.state.split.position, app.state.split.position);
                body.querySelector('.inline-validation').textContent = app.state.split.error ? app.t(app.state.split.error) : '';
                input.disabled = !app.editable('splitUtterance');
            } else {
                if (!body.querySelector('.entry-text')) body.innerHTML = '<p class="entry-text"></p>';
                body.firstElementChild.textContent = entry.text;
            }
        });
        lastIds = new Set(entries.map(entry => entry.id));
        if (sidebar && visible) {
            feed.scrollTop = following && (!initialized || pendingFollow) ? feed.scrollHeight : oldTop;
            pendingFollow = false;
            savedTop = feed.scrollTop;
        }
        if (visible) initialized = true;
        if (indicator) { indicator.hidden = unread === 0; indicator.textContent = `${app.t('newMessages')} (${unread})`; }
    }

    feed.addEventListener('scroll', () => {
        if (!feed.getClientRects().length) return;
        savedTop = feed.scrollTop;
        following = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 30;
        if (following) { unread = 0; if (indicator) indicator.hidden = true; }
    });
    indicator?.addEventListener('click', () => { following = true; unread = 0; feed.scrollTop = feed.scrollHeight; indicator.hidden = true; });
    async function split(input) {
        if (!app.editable('splitUtterance')) return;
        const draft = app.state.split;
        const entry = app.snapshot.transcript.find(item => item.id === draft.id);
        if (!entry || input.value !== entry.text || draft.text !== entry.text) { app.refresh(); return; }
        const position = input.selectionStart;
        draft.position = position;
        const boundaries = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(entry.text)].map(part => part.index);
        if (position !== input.selectionEnd || !entry.text.slice(0, position).trim() || !entry.text.slice(position).trim() || !boundaries.includes(position)) {
            draft.error = 'splitPositionError'; app.refresh(); return;
        }
        const result = await app.execute({ type: 'splitUtterance', id: entry.id, position });
        if (app.state.split === draft) {
            if (result.ok) app.state.split = null;
            else draft.error = result.code;
        }
        app.refresh();
    }
    feed.addEventListener('click', event => {
        if (event.target.matches('[data-split-id]')) split(event.target);
        if (event.target.closest('[data-cancel-split]')) { app.state.split = null; app.refresh(); }
    });
    feed.addEventListener('beforeinput', event => {
        if (event.target.matches('[data-split-id]')) event.preventDefault();
    });
    feed.addEventListener('input', event => {
        if (event.target.matches('[data-split-id]')) {
            event.target.value = app.state.split.text;
            event.target.setSelectionRange(app.state.split.position, app.state.split.position);
        }
    });
    feed.addEventListener('keyup', event => {
        if (event.target.matches('[data-split-id]') && app.state.split) app.state.split.position = event.target.selectionStart;
    });
    feed.addEventListener('keydown', event => {
        if (!event.target.matches('[data-split-id]')) return;
        if (event.key === 'Enter') { event.preventDefault(); split(event.target); }
        if (event.key === 'Escape') { app.state.split = null; app.refresh(); }
    });
    return { update };
}
