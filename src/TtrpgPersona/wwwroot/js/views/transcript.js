import { label, editButton, escapeHtml, replaceContent } from '../dom.js';
import { createTranscript } from '../components/transcript.js';

export function createTranscriptView(node, app) {
    node.innerHTML = `<div class="workspace-intro"><p>${label('transcriptSubtitle')}</p><span class="tag" id="entry-count"></span></div><div class="grid-main"><div class="panel" id="full-transcript"></div><aside class="panel soft"><div class="panel-head"><h3>${label('participants')}</h3></div><div id="participants-list"></div><p class="micro">${label('participantsNote')}</p></aside></div>`;
    const transcript = createTranscript(node.querySelector('#full-transcript'), app);
    return { update() {
        transcript.update();
        node.querySelector('#entry-count').textContent = `${app.snapshot.transcript.length} ${app.t('entries')}`;
        replaceContent(node.querySelector('#participants-list'), app.snapshot.participants.map(person => `<div class="participant-row"><span>${label(person.role)}</span><strong>${escapeHtml(person.name || app.t('unknownSpeaker'))}</strong>${person.role === 'agent' ? '' : editButton(`participant:${person.id}`)}</div>`).join('') || `<p class="muted">${label('noParticipants')}</p>`);
    } };
}
