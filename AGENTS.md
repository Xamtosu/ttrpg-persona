# Project

TTRPG Persona is a standalone C# application for one voice-driven AI player, with local session and audio management, a browser UI, and cloud models for transcription, responses, and speech synthesis.

## Rules

- Read Markdown files as UTF-8.
- Follow existing local patterns before introducing new abstractions.
- Use static inspection when it can verify the changed contract.
- Keep code comment-free unless it is public API. Temporary workarounds must use `// TODO`.
- Do not add defensive null checks when dependencies are architecturally guaranteed. Fix the wiring instead. Validate external input and persisted data at their boundaries.
- Do not edit generated files until the generator or source data has been identified.
- Do not reformat unrelated files.
- Keep private campaign data, credentials, and machine-specific configuration out of Git.
- Never expose bearer tokens, authentication material, account data, or credentials in output, prompts, or logs.
- Keep canonical data separate from model-generated summaries. Changes to source data must invalidate affected derived context; an old summary must not reintroduce an excluded fact.

## Validation

- Run the relevant build and meaningful checks from its real entry point. Use tests for contracts such as cancellation, transcript edits, persistence, and memory invalidation; avoid tests that only mirror implementation details.
- For reversible documentation or configuration changes, prefer focused static checks.
- Do not substitute a successful build for a real microphone, latency, quality, or cost measurement.
- Do not silently run paid API experiments. Establish the concrete scope and spending limit before a paid run, and respect authorization already provided in the session.
- If a required check is unavailable, state what was not run and why.

## Context Discipline

- Before an operation that may return more than 200 lines or 20,000 characters, estimate its output and narrow or aggregate it as needed.
- After a truncated or unexpectedly large result, narrow the next request instead of repeating or expanding it.
- Filter predictable tool output. Discover only the specific tool, resource, or schema needed next; do not request complete catalogs or dump successful command logs.

## Workspace

- [Project documentation](docs/index.md): tracked technical documentation for AI agents; start with this index.
- `.agents/`: local Git-ignored plans, research, handoffs, task artifacts, and private runtime data.

## Git / Commits

- Base branch: `master`. Use `codex/<task-name>` for working branches unless the user requests another name.
- Do not create commits without explicit user authorization.
- Do not push, merge, create a pull/merge request, or fully or partially revert a commit without explicit user authorization.
- Agent commit identity: name `AI`, email `ai@dev.me`. Apply it to authorized agent commits without changing the user's global Git identity.
- Write commit messages in English.
- Do not add attribution or co-authorship trailers. No `Co-Authored-By` line for an agent, and no generated-with or tool-advertising line, in commit messages or in pull/merge request titles and descriptions. The agent commit identity above is the only attribution.
- Preserve unrelated user changes. Do not stage them incidentally.
