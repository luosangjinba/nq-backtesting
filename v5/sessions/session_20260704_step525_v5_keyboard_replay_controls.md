# Session 2026-07-04 - Step 525 Keyboard Replay Controls

## Goal

Add workstation keyboard controls for replay without weakening V5 ownership
boundaries.

## Product Context

- Step 524 closed the cadence-latency gap; replay `Next` is fast enough for
  manual stepping.
- The next higher-value workstation gap is keyboard ergonomics: users should
  be able to step, rewind, and play/pause without moving pointer focus to the
  floating transport.
- Keyboard controls must not steal input from text fields, selects, textareas,
  contenteditable nodes, or open popovers/modals.

## Product Standard

- `ArrowRight`: replay `Next`.
- `ArrowLeft`: replay `Previous`.
- `Space`: play when paused, pause when playing.
- Keyboard shortcuts must dispatch through the existing replay controls
  controller. They must not mutate replay runtime state, chart state, or bar
  data directly.
- The feature controller must own listener cleanup through the existing
  disposer path.

## Detailed Plan

1. Step 525.1 - Plan and boundary setup.
   - Record the keyboard shortcut contract and focus-protection rules.
   - Identify `chart-replay-controls.js` as the owning feature UI controller.
   - Commit docs before implementation.

2. Step 525.2 - Implement keyboard controls.
   - Add a document-level `keydown` listener inside the replay controls
     controller.
   - Reuse existing button handlers so keyboard behavior shares batching,
     command-in-flight guards, status refresh, and disabled-state handling.
   - Ignore modified key chords, repeated keys, editable/focusable form
     targets, and visible popovers/dialogs.
   - Keep cleanup inside controller `dispose()`.
   - Commit implementation.

3. Step 525.3 - Add browser smoke coverage.
   - Create a dedicated browser smoke for keyboard controls.
   - Verify `ArrowRight` advances replay cursor and chart cursor metadata.
   - Verify `ArrowLeft` rewinds replay cursor and chart cursor metadata.
   - Verify `Space` toggles play/pause.
   - Verify focused input/select does not trigger replay keyboard shortcuts.
   - Commit the smoke harness.

4. Step 525.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-keyboard-controls-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `node v5/tests/replay-cadence-latency-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with results and next recommendation.
   - Commit closeout docs.

## Non-Goals

- Do not add visible shortcut copy or tutorial text to the UI.
- Do not add configurable shortcut bindings yet.
- Do not change replay runtime command semantics.
- Do not bypass the existing replay controls controller.

## Status

- Step 525.1: active. Planning keyboard replay control contract and boundary.

## Next

Implement the keyboard listener in the existing replay controls controller.
