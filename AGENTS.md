# AGENTS.md

This repository contains V4 legacy work and the new V5 FX Replay rewrite.

## Before Working On V5

Read these files first:

1. `v5/README.md`
2. `v5/docs/INDEX.md`
3. `v5/docs/MVP_ARCHITECTURE.md`
4. `v5/docs/EXECUTION_FRAMEWORK.md`
5. `v5/TODO.md`

Then read only the docs/specs relevant to the current step.

## Current Direction

V5 is a clean frontend/runtime path for a session-first FX Replay experience.
V4 remains available as legacy/reference, but V5 must not copy V4's old
frontend ownership model.

## V5 Hard Rules

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay cursor and reveal state.
- Feature modules must not directly control each other.
- Creating a replay session must not load a full date range into chart state.

## Development Workflow

- Inspect existing code before editing.
- Keep each step bounded.
- Add harnesses for new critical invariants.
- Run relevant smoke tests and `git diff --check` before commit.
- Update `v5/TODO.md` and `v5/sessions/` when a step closes.

## Context Hygiene

Do not load all historical sessions by default. Historical sessions are for
targeted lookup, not general startup context.

