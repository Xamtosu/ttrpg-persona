/**
 * A source provides immutable presentation snapshots through getSnapshot() and
 * subscribe(listener), which returns a disposer. execute(command) resolves to
 * { ok: true } or { ok: false, code }. Accepted state changes must increment
 * revision, replace getSnapshot(), and notify subscribers before resolving.
 * Snapshots and errors contain no credentials or provider request payloads.
 * The concrete view and command fields are documented in interface-development.md.
 */
export function unavailableSource() {
    const snapshot = Object.freeze({
        revision: 0, session: null, character: null, knowledge: null,
        transcript: Object.freeze([]), participants: Object.freeze([]),
        summary: null, response: Object.freeze({ phase: 'idle' }),
        microphone: Object.freeze({ connected: false, muted: true }),
        diagnostics: null, connectors: Object.freeze({ stt: null, llm: null, tts: null }),
        capabilities: Object.freeze({}), error: null
    });
    return {
        getSnapshot: () => snapshot,
        subscribe: () => () => {},
        execute: async () => ({ ok: false, code: 'unavailable' })
    };
}
