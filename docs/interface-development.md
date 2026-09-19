# Interface development

E-1 implements the five workspaces from [the accepted interface](ux-map.md) using native JavaScript modules and CSS served by the existing ASP.NET Core application. Ordinary build, run and publish require only .NET. The root README and startup behavior are unchanged.

## Normal application

From the repository root:

```sh
dotnet build TtrpgPersona.slnx
dotnet run --project src/TtrpgPersona
dotnet publish src/TtrpgPersona -c Release -o .agents/local/publish-e-1
```

The browser opens on localhost. The application starts in English with no session, character, transcript, costs, configured provider or microphone connection. EN/RU, navigation, connection metadata drafts and applicable lifecycle explanations work. Source-dependent actions are disabled. No production code requests microphone access, calls a cloud provider or writes browser storage.

Character/session loading, response generation, audio, connector verification, credential entry, billing, persistence and canonical memory invalidation belong to E01–E07. A populated interface is not evidence that those services are connected.

## Reproducible browser checks

Node.js and Playwright are development tools only. Playwright is pinned in `tests/ui/package.json` and `package-lock.json`. From the repository root:

```sh
npm --prefix tests/ui ci
npm exec --prefix tests/ui -- playwright install chromium --no-shell
npm --prefix tests/ui test
npm --prefix tests/ui run preview
```

On Windows, `npm.cmd` can be used in place of `npm`. The suite uses Playwright's full Chromium browser with its headless mode; the separate headless-shell download is unnecessary. The test runner starts the real application on port 5191 and stops it after testing. Its normal automatic default-browser opening is preserved. Test artifacts go to the Git-ignored `.agents/local/ui-results/` directory.

To use an application already running on another port, set `PERSONA_UI_BASE_URL` explicitly. For example, in PowerShell:

```powershell
$env:PERSONA_UI_BASE_URL = 'http://localhost:5192'
npm --prefix tests/ui test
npm --prefix tests/ui run preview
```

The preview command opens a separate browser with fictional data; close that preview browser to finish. Without an explicit base URL it owns an application process on port 5191 and stops that process on completion. With an explicit base URL it leaves the supplied application running.

The harness HTML, data and small adapter live in `tests/ui/fixtures/`. Playwright intercepts exactly the allowlisted fixture assets at `/__persona_fixture__/` in that browser context; production JS and CSS still come from the real application. Opening that URL in an ordinary browser returns 404. There is no production query switch, development endpoint, fixture import from `main.js`, filesystem access from the page, or hook on `window`.

The external fixture toolbar is explicitly labeled fictional. Scenario switches publish presentation examples without resetting the app's UI state. Next-command controls exercise acceptance, rejection, delayed resolution, invalid source ordering, and publication before delayed acceptance. Release pending command resolves a deliberately held operation. Append utterance and Publish changed notes exercise source updates. Reload the page to reset everything. These operations neither persist a session nor implement the later backend's business rules.

## Lifecycle inspection routes

Use the header's ellipsis session-actions menu on any workspace. Start/Open also appear in the normal empty Session workspace, and End session has its own header button. Opening an explanation is separate from executing its source command.

| Surface | Normal application | Fictional harness |
| --- | --- | --- |
| Start session | Name, character reference and optional knowledge reference; action disabled | Filled / ready → Start session; blank input validates, completed input returns source unavailable and retains the draft |
| Open saved session | Reference field; no invented session list, action disabled | Filled / ready → Open saved session; use `fictional-snapshot` as illustrative metadata; rejects the unavailable snapshot |
| End session | Explanation available; confirmation disabled | Filled / ready, Summary failure or Summary budget exhausted → End session; Stop an active response first; confirmation opens Save error / retry |
| Exit and save | Explanation states no extra LLM call; confirmation disabled | Filled / ready → Exit and save → Save error / retry; the browser stays open and session remains available |
| Save error / retry | Shown only when supplied by a source | Select Save error / retry, then the matching session-menu item, or follow a failed End/Exit; Retry fails visibly and keeps data |
| Delete saved transcript | Not offered without completed-session and summary-review presentation | Completed / summary reviewed → Delete saved transcript; names the session, covers conversation-bearing diagnostic/backup copies, keeps the summary; confirmation reports unavailable, removes nothing |

The Completed / summary not reviewed scenario verifies that deletion is not offered too early. Each dialog supports EN/RU, validation where relevant, Escape and focus return. Dialog language controls and a secondary Stop action during active work remain keyboard-accessible. Editors preserve their fields and caret during translation and source updates. The shared shell remains navigable with an editor open; cancel explicitly discards that editor. A pending command survives navigation or closing its editor. Dismissal cannot undo a command already submitted.

## Frontend ownership and integration boundary

`main.js` mounts the unavailable source. `app.js` exports `mount(root, source)` and a disposer; the fixture imports this same entry. `ui-state.js` owns workspace selection, locale, local drafts, split position and pending commands. Views never mutate source snapshots. Dialog and transcript components own stable editing/scrolling elements. The two transcript locations reuse one component and the same source records.

Split selection uses native keyboard caret navigation while preventing text edits. If the source changes the selected utterance, both views display its new text and reset the position with a localized explanation; a missing utterance ends that selection visibly. The source still owns canonical splitting and revision enforcement. Sidebar arrivals received on another workspace preserve bottom-following, or remain indicated without moving an older-message reader. Source updates restore focused workspace actions by their stable identities, and lifecycle error/retry dialogs retain the original focus return target.

A source implements:

- `getSnapshot()`: the current immutable presentation object.
- `subscribe(listener)`: notifies with replacement snapshots; returns a disposer.
- `execute(command)`: resolves `{ ok: true }` or `{ ok: false, code }`.

For accepted state changes, the source must increment `revision`, replace `getSnapshot()` and notify subscribers with the resulting view **before** resolving success. The UI checks that a newer notified snapshot exists before clearing an accepted draft. This catches missing publication; it cannot prove that an arbitrary external adapter applied the correct domain operation. Rejections must not publish a success snapshot. A failure-status snapshot, such as retained session/save failure, may still be published. The later transport must preserve this ordering and enforce revision/domain checks.

The snapshot has these fields:

| Field | Presentation data |
| --- | --- |
| `revision` | Monotonically increasing revision for source updates |
| `session` | Null or name, completed, summaryReviewed, saveFailed, optional summaryFailure code |
| `character` | Null or identity, className, level, origin, appearance, six stats, hp/maxHp/ac/speed, skills/saves arrays, resources/conditions/effects/features; inventory `{ id, name, quantity }`; spellGroups `{ level, names, remaining, total }` |
| `knowledge` | Null or world facts `{ id, text, status, source }`, persona fields, human-authored notes |
| `summary` | Null or one-paragraph text, `validity` (`current`, `stale`, `updating`), and `through` conversation boundary; separate from canonical data |
| `transcript`, `participants` | Stable entry IDs, display time, speaker ID, text, excluded/interim/playback state; participant IDs, names and roles (`dm`, `player`, `agent`, `unknown`) |
| `response`, `microphone` | Phase (`idle`, `finalizing`, `thinking`, `speaking`); independently connected/muted |
| `connectors` | Independent stt/llm/tts metadata or null: adapter, endpoint, model, optional project, language/voice, availableAdapters, connected and credentialConfigured booleans; never secret values |
| `diagnostics` | Null or display totals/budget, stage durations, breakdown, estimated flag and safe request rows; no headers, credentials or full provider errors |
| `capabilities`, `error` | Explicit command availability flags and optional application error code |

Participant IDs are opaque identities, not role names. Response selection, transcript presentation and speaker-assignment restrictions use the participant's `role`. The fixture's Independent participant IDs scenario exercises this distinction.

Commands consumed by this interface:

| Command | Additional fields |
| --- | --- |
| `requestTurn`, `stopTurn` | None |
| `microphone` | `enabled` intent |
| `editCharacter` | `section` and edited `values`; inline className/level use identity; skills/saves and spell names are newline-delimited manual drafts |
| `changeInventory`, `addItem` | Item `id` and `action` (`increase`, `decrease`, `remove`), or `values.name`; new item quantity is source-owned |
| `editUtterance`, `assignSpeaker`, `excludeUtterance` | Entry `id` and `values.text`, `values.speaker`, or `excluded` |
| `splitUtterance` | Original entry `id` and UTF-16 `position`; UI rejects empty parts and grapheme breaks, source owns canonical replacement and inherited authorship |
| `editParticipant` | Participant `id`, `values.name` and `values.role` |
| `editKnowledge` | `section` (`notes`, `persona`, `fact`, `addFact`), optional fact `id`, edited `values` |
| `editSummary` | `values.text`; source owns validity and coverage semantics |
| `configureConnector` | Connector `id` (`stt`, `llm`, `tts`) and metadata `values`; no credential field |
| `startSession`, `openSession` | `values` containing name/characterReference/optional knowledgeReference, or saved-session reference; metadata is not permission for browser filesystem access |
| `endSession`, `exitAndSave`, `retrySave`, `deleteTranscript` | Explicit lifecycle intent; no frontend persistence or process termination |

Connector metadata editors remain reachable without a session. Their Apply capability is independent of session availability. Real key entry and connection checks remain disabled throughout E-1, including fixtures. Endpoint validation rejects embedded credentials, query strings and fragments. Only application error codes are translated; raw adapter error details are never displayed or logged.

One `canGiveTurn` rule controls display and dispatch. It requires a session and capability, no pending/active response, no open editor, no inline draft, no split selection and no pending command. Pending requests lock context edits synchronously. Stop takes precedence over draft and mutation blockers and forwards intent even during a pending start. The fixture illustrates routing and locks; it does not prove backend cancellation, late-response suppression or audio behavior.

## Visual comparison and validation scope

With an application running and `PERSONA_UI_BASE_URL` set if needed:

```sh
npm --prefix tests/ui run capture
```

This captures only the application rectangle in the revision-5 reference and the shared production UI with fixtures, for all five workspaces in EN/RU at 1348, 820, 540 and 390 pixels. Menu/dialog captures are included. Images are local artifacts under `.agents/local/interface-captures/`; no screenshot baseline or private data is committed. Compare these visually rather than treating a full-page pixel threshold as the verdict.

Windows validation covers the real .NET build/run/publish entry points, published assets from a different working directory, local content types, empty production startup, fixture isolation, browser errors, and fixture-backed interaction checks. The system font stack and 273 × approximately 79.2 CSS-pixel desktop primary control follow the reference; narrow controls shrink without hiding Stop. The additional session-actions menu supplies the lifecycle surfaces absent from the original specimen.

Linux/macOS execution and exact font fidelity on those platforms are unverified. No live microphone, provider, latency, speech-quality, billing or paid API experiment is part of these checks. Browser fixtures do not establish persistence, cancellation or canonical memory-invalidation guarantees for the future backend.
