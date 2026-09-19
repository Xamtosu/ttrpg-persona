export function editCapability(target) {
    if (target.startsWith('connector:')) return 'configureConnector';
    if (target.startsWith('entry:')) return 'editUtterance';
    if (target.startsWith('assign:')) return 'assignSpeaker';
    if (target.startsWith('participant:')) return 'editParticipant';
    if (target.startsWith('fact:') || ['addFact', 'persona', 'notes'].includes(target)) return 'editKnowledge';
    if (target === 'summary') return 'editSummary';
    if (target === 'addItem') return 'addItem';
    return 'editCharacter';
}

export function openEditor(app, target) {
    if (app.state.dialog) return;
    const type = editCapability(target);
    if (target.startsWith('connector:') ? app.locked() : !app.editable(type)) return;
    const separator = target.indexOf(':');
    const section = separator < 0 ? target : target.slice(0, separator);
    const id = separator < 0 ? undefined : target.slice(separator + 1);
    const snapshot = app.snapshot;
    const text = (key, label, value, extra = {}) => ({ key, label, value, type: 'textarea', ...extra });
    let title = section, fields = [], description = 'applyHint';
    const command = { type, section, id };
    if (section === 'entry') {
        title = 'editUtterance';
        fields = [text('text', 'text', snapshot.transcript.find(entry => entry.id === id).text)];
    } else if (section === 'assign') {
        fields = [{ key: 'speaker', label: 'assign', value: snapshot.transcript.find(entry => entry.id === id).speaker,
            options: snapshot.participants.filter(person => person.role !== 'agent').map(person => ({ value: person.id, text: person.name, key: person.role === 'unknown' ? 'unknownSpeaker' : null })) }];
    } else if (section === 'participant') {
        title = 'participants';
        const person = snapshot.participants.find(item => item.id === id);
        fields = [text('name', 'name', person.name, { type: 'text', required: false }), { key: 'role', label: 'role', value: person.role, options: ['dm', 'player', 'unknown'].map(key => ({ value: key, key })) }];
    } else if (section === 'connector') {
        title = `connector_${id}`;
        description = 'connectorHint';
        const c = snapshot.connectors[id];
        const adapters = c?.availableAdapters ?? [];
        fields = [
            { key: 'adapter', label: 'providerAdapter', value: c?.adapter, options: [{ value: '', key: 'noAdapter' }, ...adapters.map(name => ({ value: name, text: name }))] },
            text('endpoint', 'apiEndpoint', c?.endpoint, { type: 'url' }),
            text('model', 'model', c?.model, { type: 'text' }),
            text('project', 'projectOptional', c?.project, { type: 'text', required: false })
        ];
        if (id === 'stt') fields.push(text('language', 'recognitionLanguage', c?.language, { type: 'text' }));
        if (id === 'tts') fields.push(text('voice', 'voiceId', c?.voice, { type: 'text' }));
    } else if (section === 'addItem') {
        description = 'addItemHint';
        fields = [text('name', 'item', '', { type: 'text' })];
    } else if (section === 'summary') {
        title = 'sessionMemory';
        fields = [text('text', 'text', snapshot.summary?.text ?? '')];
    } else if (section === 'notes') {
        title = 'sessionNotes';
        fields = [text('notes', 'text', snapshot.knowledge.notes, { required: false })];
    } else if (section === 'persona') {
        title = 'personality';
        fields = ['biography', 'traits', 'ideals', 'bonds', 'flaws', 'goals', 'voice', 'relationships', 'facts'].map(key => text(key, key, snapshot.knowledge.persona[key], { required: false }));
    } else if (section === 'fact' || section === 'addFact') {
        title = section === 'fact' ? 'editFact' : 'addFact';
        const fact = snapshot.knowledge.world.find(item => item.id === id);
        fields = [text('text', 'text', fact?.text ?? ''), text('source', 'source', fact?.source ?? '', { type: 'text' }),
            { key: 'status', label: 'status', value: fact?.status ?? 'hypothesis', options: ['confirmed', 'rumor', 'hypothesis'].map(key => ({ value: key, key })) }];
    } else {
        const c = snapshot.character;
        if (section === 'identity') {
            fields = [text('name', 'name', c.name, { type: 'text' }), text('origin', 'originAppearance', c.origin), text('appearance', 'description', c.appearance),
                ...['hp', 'maxHp', 'ac', 'speed'].map(key => text(key, key, c[key], { type: 'number' })),
                ...['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key, index) => text(key, key, c.stats[index], { type: 'number' }))];
        } else if (section === 'skills') {
            title = 'skillsSaves';
            fields = [text('skills', 'skills', c.skills.join('\n'), { required: false }), text('saves', 'savingThrows', c.saves.join('\n'), { required: false })];
        } else if (section === 'resources') {
            title = 'currentState';
            fields = ['resources', 'conditions', 'effects'].map(key => text(key, key === 'effects' ? 'temporaryEffects' : key, c[key], { required: false }));
        } else if (section === 'features') fields = [text('features', 'features', c.features, { required: false })];
        else if (section === 'spells') fields = c.spellGroups.flatMap(group => [text(`names${group.level}`, group.level ? 'spellLevel' : 'cantrips', group.names.join('\n'), { suffix: group.level ? ` ${group.level}` : '', required: false }), ...(group.level ? [text(`remaining${group.level}`, 'slotsRemaining', group.remaining, { type: 'number', suffix: ` ${group.level}` }), text(`total${group.level}`, 'slotsTotal', group.total, { type: 'number', suffix: ` ${group.level}` })] : [])]);
    }
    app.dialog.open({ title, description, fields, command, credential: section === 'connector', action: section === 'addItem' ? 'add' : 'apply' });
}
