import { seed } from './data.js';
import { unavailableSource } from '/js/session-source.js';

function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}

export function fixtureSource(status) {
    let snapshot = freeze(structuredClone(seed));
    let mode = 'accept', release = null, sequence = 30;
    const listeners = new Set();
    function publish(next) {
        snapshot = freeze({ ...next, revision: snapshot.revision + 1 });
        for (const listener of listeners) listener(snapshot);
    }
    function scenario(value) {
        const next = structuredClone(value === 'empty' ? unavailableSource().getSnapshot() : seed);
        if (['finalizing', 'thinking', 'speaking'].includes(value)) next.response.phase = value;
        if (value === 'muted') next.microphone.muted = true;
        if (value === 'disconnected') next.microphone = { connected: false, muted: true };
        if (value === 'providerError') next.error = 'commandFailed';
        if (['summaryFailed', 'budgetExceeded'].includes(value)) next.session.summaryFailure = value;
        if (value === 'saveFailed') { next.session.saveFailed = true; next.error = 'saveFailed'; }
        if (['completed', 'unreviewed'].includes(value)) { next.session.completed = true; next.session.summaryReviewed = value === 'completed'; }
        if (value === 'participantIds') {
            const ids = { dm: 'participant-17', player: 'participant-23', agent: 'participant-42', unknown: 'participant-99' };
            next.participants.forEach(person => { person.id = ids[person.id]; });
            next.transcript.forEach(entry => { entry.speaker = ids[entry.speaker]; });
        }
        publish(next);
    }
    return {
        getSnapshot: () => snapshot,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        scenario,
        setMode(value) { mode = value; },
        release() { release?.(); release = null; },
        append() {
            if (!snapshot.session) return;
            const next = structuredClone(snapshot);
            next.transcript.push({ id: `u${++sequence}`, time: '12:08', speaker: next.participants.find(person => person.role === 'dm').id, text: `У двери мельницы слышны шаги. ${sequence}`, excluded: false });
            publish(next);
        },
        refreshNotes() {
            if (!snapshot.knowledge) return;
            const next = structuredClone(snapshot);
            next.knowledge.notes = 'Новые сведения от источника.';
            publish(next);
        },
        async execute(command) {
            status(`pending:${command.type}`);
            const selected = command.type === 'stopTurn' ? 'accept' : mode;
            if (selected.startsWith('delay')) await new Promise(resolve => { release = resolve; });
            if (['reject', 'delayReject'].includes(selected)) { status(`rejected:${command.type}`); return { ok: false, code: 'commandFailed' }; }
            if (selected === 'badOrder') return { ok: true };
            if (command.type === 'startSession') return { ok: false, code: 'sourceUnavailable' };
            if (command.type === 'openSession') return { ok: false, code: 'invalidSnapshot' };
            if (['endSession', 'exitAndSave', 'retrySave'].includes(command.type)) {
                const failed = structuredClone(snapshot);
                failed.session.saveFailed = true;
                publish(failed);
                return { ok: false, code: 'saveFailed' };
            }
            if (command.type === 'deleteTranscript') return { ok: false, code: 'unavailable' };
            const next = structuredClone(snapshot);
            const values = command.values;
            if (command.type === 'requestTurn') next.response.phase = 'thinking';
            else if (command.type === 'stopTurn') next.response.phase = 'idle';
            else if (command.type === 'microphone') next.microphone = { connected: true, muted: !command.enabled };
            else if (command.type === 'editUtterance') next.transcript.find(entry => entry.id === command.id).text = values.text;
            else if (command.type === 'assignSpeaker') next.transcript.find(entry => entry.id === command.id).speaker = values.speaker;
            else if (command.type === 'excludeUtterance') next.transcript.find(entry => entry.id === command.id).excluded = command.excluded;
            else if (command.type === 'splitUtterance') {
                const index = next.transcript.findIndex(entry => entry.id === command.id);
                const entry = next.transcript[index];
                next.transcript.splice(index, 1, { ...entry, id: `u${++sequence}`, text: entry.text.slice(0, command.position).trimEnd() }, { ...entry, id: `u${++sequence}`, text: entry.text.slice(command.position).trimStart() });
            } else if (command.type === 'editParticipant') Object.assign(next.participants.find(person => person.id === command.id), values);
            else if (command.type === 'addItem') next.character.inventory.push({ id: `i${++sequence}`, name: values.name, quantity: 1 });
            else if (command.type === 'changeInventory') {
                const item = next.character.inventory.find(item => item.id === command.id);
                if (command.action === 'remove') next.character.inventory = next.character.inventory.filter(item => item.id !== command.id);
                else item.quantity = Math.max(0, item.quantity + (command.action === 'increase' ? 1 : -1));
            } else if (command.type === 'editCharacter') {
                if (command.section === 'spells') next.character.spellGroups.forEach(group => {
                    group.names = values[`names${group.level}`].split('\n').filter(Boolean);
                    if (group.level) { group.remaining = values[`remaining${group.level}`]; group.total = values[`total${group.level}`]; }
                });
                else if (command.section === 'skills') { next.character.skills = values.skills.split('\n').filter(Boolean); next.character.saves = values.saves.split('\n').filter(Boolean); }
                else {
                    const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                    for (const [key, value] of Object.entries(values)) {
                        if (stats.includes(key)) next.character.stats[stats.indexOf(key)] = value;
                        else next.character[key] = value;
                    }
                }
            } else if (command.type === 'editKnowledge') {
                if (command.section === 'notes') next.knowledge.notes = values.notes;
                else if (command.section === 'persona') Object.assign(next.knowledge.persona, values);
                else if (command.section === 'addFact') next.knowledge.world.push({ id: `f${++sequence}`, ...values });
                else Object.assign(next.knowledge.world.find(fact => fact.id === command.id), values);
            } else if (command.type === 'editSummary') next.summary = { ...next.summary, text: values.text.replace(/\s+/g, ' '), validity: 'current' };
            else if (command.type === 'configureConnector') {
                Object.assign(next.connectors[command.id], values);
                if (command.id === 'stt') next.microphone = { connected: false, muted: true };
            } else return { ok: false, code: 'unavailable' };
            if (['editUtterance', 'assignSpeaker', 'excludeUtterance', 'splitUtterance', 'editCharacter', 'editKnowledge', 'addItem', 'changeInventory', 'editParticipant'].includes(command.type)) next.summary.validity = 'stale';
            publish(next);
            status(`published:${command.type}:${snapshot.revision}`);
            if (selected === 'publishWait') await new Promise(resolve => { release = resolve; });
            return { ok: true };
        }
    };
}
