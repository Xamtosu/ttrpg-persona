import { escapeHtml as h, label, editButton, button, replaceContent } from '../dom.js';

export function createKnowledge(node, app) {
    node.innerHTML = `<div class="workspace-intro"><p>${label('knowledgeSubtitle')}</p></div><nav class="knowledge-tabs" data-label="knowledge">${[['world', 'world'], ['persona', 'personality'], ['notes', 'sessionNotes']].map(([key, text]) => button(text, `data-knowledge="${key}"`)).join('')}</nav><div class="knowledge-grid"><div id="knowledge-content"></div><aside class="memory-panel"><div class="panel-head"><h3>${label('sessionMemory')}</h3><span class="tag">${label('aiSummary')}</span></div><span class="badge" id="summary-validity"></span><p class="session-summary"></p><p class="memory-cutoff"></p><details class="memory-explanation"><summary>${label('whatIsMemory')}</summary><p>${label('memoryScope')}</p></details>${button('editSummary', 'data-edit="summary"', 'small')}</aside></div>`;
    return { update() {
        const k = app.snapshot.knowledge;
        node.querySelectorAll('[data-knowledge]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.knowledge === app.state.knowledge)));
        let content;
        if (app.state.knowledge === 'world') content = `<section class="panel"><div class="panel-head"><h3>${label('facts')}</h3>${button('addFact', 'data-edit="addFact"', 'small')}</div>${(k?.world ?? []).map(fact => `<article class="fact"><div class="panel-head"><span class="tag">${label(fact.status)}</span>${editButton(`fact:${fact.id}`)}</div><p>${h(fact.text)}</p><span class="micro">${label('source')}: ${h(fact.source)}</span></article>`).join('') || '<p class="muted">—</p>'}</section>`;
        else if (app.state.knowledge === 'persona') content = `<section class="panel"><div class="panel-head"><h3>${label('biography')}</h3>${editButton('persona')}</div><p class="prose">${h(k?.persona.biography)}</p><dl>${['traits', 'ideals', 'bonds', 'flaws', 'goals', 'voice', 'relationships'].map(key => `<div class="definition-row"><dt>${label(key)}</dt><dd>${h(k?.persona[key])}</dd></div>`).join('')}</dl></section><section class="panel"><h3>${label('characterFacts')}</h3><p class="prose">${h(k?.persona.facts)}</p></section>`;
        else content = `<section class="panel"><div class="panel-head"><span class="micro">${label('notesHint')}</span>${editButton('notes')}</div><p class="notes-editor">${h(k?.notes)}</p></section>`;
        replaceContent(node.querySelector('#knowledge-content'), content);
        node.querySelector('#summary-validity').textContent = app.t(app.snapshot.summary?.validity ?? 'notCreated');
        node.querySelector('.session-summary').textContent = app.snapshot.summary?.text ?? '—';
        node.querySelector('.memory-cutoff').textContent = `${app.t('coverage')}: ${app.snapshot.summary?.through ?? '—'}`;
    } };
}
