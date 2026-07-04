# Session 2026-07-04 - Step 527 Replay Transport Persistence

## Goal

Persist replay transport UI preferences so the workstation keeps the user's
preferred floating control position and playback speed across chart route
re-entry and page reloads.

## Product Context

- Step 525 added keyboard replay controls.
- Step 526 added playback speed presets and keyboard speed nudges.
- Users now have enough replay controls that losing position/speed on every
  route entry feels like workstation polish debt.

## Product Standard

- Persist the floating transport position after user drag.
- Restore the floating transport position when the chart route is created.
- Clamp restored position to the current viewport so it cannot reappear off
  screen after window size changes.
- Persist playback speed after preset, range, or keyboard speed changes.
- Restore playback speed before controls first render on chart route entry.
- Persistence is a UI preference only. Replay runtime still owns playback
  execution and receives speed only through `REPLAY_COMMANDS.PLAY`.

## Detailed Plan

1. Step 527.1 - Plan and boundary setup.
   - Record persistence scope and ownership.
   - Add a focused replay transport preferences adapter instead of placing
     storage parsing in route/controller entry code.
   - Commit docs before implementation.

2. Step 527.2 - Implement transport preference persistence.
   - Add a small preferences module backed by `localStorage` with safe
     load/save helpers.
   - Restore `playbackIntervalMs` during chart route initialization.
   - Save playback speed whenever the controls controller updates it.
   - Restore and persist floating transport position through the floating
     controls controller.
   - Commit implementation.

3. Step 527.3 - Add browser smoke coverage.
   - Verify a selected speed persists across chart route re-entry.
   - Verify a dragged floating transport position persists across chart route
     re-entry.
   - Verify an out-of-bounds stored position is clamped into the viewport.
   - Verify restored speed is still used by `Space` playback.
   - Commit the smoke harness.

4. Step 527.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-transport-persistence-browser-smoke.js`
     `node v5/tests/replay-speed-controls-browser-smoke.js`
     `node v5/tests/replay-floating-controls-browser-smoke.js`
     `node v5/tests/replay-keyboard-controls-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with results and next recommendation.
   - Commit closeout docs.

## Non-Goals

- Do not persist runtime replay state beyond the existing cursor/session
  persistence.
- Do not add profile/workspace preference management UI.
- Do not persist per-session transport preferences in this step.
- Do not change replay runtime timer behavior.

## Status

- Step 527.1: completed. Planned replay transport preference persistence and
  boundaries.
- Step 527.2: completed. Added a replay transport preferences adapter and wired
  playback speed plus floating position persistence through existing UI
  controllers.

## Next

Implement the replay transport preferences adapter and wire it into the
existing route/control controllers.
