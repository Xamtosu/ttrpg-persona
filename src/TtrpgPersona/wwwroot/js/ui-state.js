export function createUiState() {
    return {
        workspace: 'session', knowledge: 'world', diagnostics: 'usage', locale: 'en',
        drafts: new Map(), pending: new Map(), dialog: null, split: null, error: null
    };
}

export function activeTurn(state, snapshot) {
    return state.pending.has('requestTurn') || ['finalizing', 'thinking', 'speaking'].includes(snapshot.response.phase);
}

export function canGiveTurn(state, snapshot) {
    return !!snapshot.session && !!snapshot.capabilities.requestTurn && !activeTurn(state, snapshot)
        && !state.dialog && !state.split && state.drafts.size === 0 && state.pending.size === 0;
}

export function canEdit(state, snapshot, capability) {
    return !!snapshot.capabilities[capability] && !activeTurn(state, snapshot) && state.pending.size === 0;
}
