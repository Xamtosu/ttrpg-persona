import { label, button } from '../dom.js';
import { createTranscript } from '../components/transcript.js';

export function createSession(node, app) {
    node.innerHTML = `<div class="empty-box" id="session-empty"><div class="eyebrow">${label('startHere')}</div><h3>${label('noSession')}</h3><p>${label('noSessionBody')}</p><div class="command-actions">${button('startSession', 'data-lifecycle="startSession"', 'primary')}${button('openSession', 'data-lifecycle="openSession"')}</div></div><div class="home-grid" id="session-populated"><div class="response-focus"><div class="persona-identity"><span class="avatar-mark"></span><div><h3 id="home-character"></h3><span class="muted" id="home-class"></span></div></div><div class="response-heading"><span class="eyebrow">${label('lastResponse')}</span><span class="badge" id="last-playback"></span></div><blockquote id="last-response"></blockquote><div class="reply-kind"><span class="reply-dot"></span>${label('responseKindLabel')}</div></div><aside class="chat-panel"><div class="chat-heading"><div><h3>${label('liveTranscript')}</h3><span class="micro">${label('sharedTranscriptHint')}</span></div>${button('details', 'data-screen="transcript"', 'small')}</div><div id="sidebar-transcript"></div><div class="chat-foot" id="chat-foot"></div></aside></div>`;
    const transcript = createTranscript(node.querySelector('#sidebar-transcript'), app, true);
    return { update() {
        const snapshot = app.snapshot;
        node.querySelector('#session-empty').hidden = !!snapshot.session;
        node.querySelector('#session-populated').hidden = !snapshot.session;
        node.querySelector('#home-character').textContent = snapshot.character?.name ?? app.t('unassignedCharacter');
        node.querySelector('.avatar-mark').textContent = snapshot.character?.name.split(' ').map(part => part[0]).slice(0, 2).join('') ?? 'P';
        node.querySelector('#home-class').textContent = snapshot.character ? `${snapshot.character.className} · ${app.t('level')} ${snapshot.character.level}` : '—';
        const last = snapshot.transcript.findLast(entry => !entry.excluded && snapshot.participants.some(person => person.id === entry.speaker && person.role === 'agent'));
        node.querySelector('#last-response').textContent = last?.text ?? '—';
        node.querySelector('#last-playback').textContent = app.t(last?.playback ?? 'notStarted');
        node.querySelector('#chat-foot').textContent = app.t(!snapshot.microphone.connected ? 'micOff' : snapshot.microphone.muted ? 'micMuted' : snapshot.response.phase === 'speaking' ? 'capturePaused' : 'listening');
        transcript.update();
    } };
}
