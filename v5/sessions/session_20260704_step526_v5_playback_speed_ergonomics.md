# Session 2026-07-04 - Step 526 Playback Speed Ergonomics

## Goal

Make replay playback speed easier to operate from the workstation transport
without changing replay runtime ownership.

## Product Context

- Step 525 added keyboard replay controls for step/rewind/play/pause.
- The transport already has a speed range input, but it is parameter-like and
  not optimized for frequent replay use.
- Playback speed should be adjustable by common presets and keyboard nudges
  while preserving the existing `intervalMs` path into `REPLAY_COMMANDS.PLAY`.

## Product Standard

- Keep playback speed as milliseconds internally. Lower milliseconds means
  faster playback.
- Add common preset buttons for `0.5x`, `1x`, `2x`, and `4x`, mapped to
  `1000ms`, `500ms`, `250ms`, and `125ms`.
- Preserve the existing range input as the continuous control.
- `[` slows playback and `]` speeds playback by moving through the preset
  ladder.
- Shortcut focus protection must match Step 525: ignore modified/repeated keys,
  editable/form targets, and open popovers/modals.
- UI controls may set the route-owned playback interval value only through the
  existing controls controller callback. Replay runtime still receives speed
  only through `REPLAY_COMMANDS.PLAY`.

## Detailed Plan

1. Step 526.1 - Plan and boundary setup.
   - Record speed preset semantics, keyboard semantics, and ownership.
   - Identify `replay-floating-controls.js`, `chart-replay-controls.js`, and
     `replay-transport.css` as the owning UI modules.
   - Commit docs before implementation.

2. Step 526.2 - Implement speed presets and keyboard speed controls.
   - Add preset buttons to the floating transport markup.
   - Update controls rendering to mark the matching preset active.
   - Wire preset clicks through `setPlaybackIntervalMs`.
   - Add `[` / `]` handling to the existing shortcut listener.
   - Commit implementation.

3. Step 526.3 - Add browser smoke coverage.
   - Verify preset buttons update the speed range and active state.
   - Verify `Space` starts playback using the selected interval.
   - Verify `[` / `]` move between presets.
   - Verify focused form controls do not trigger speed shortcuts.
   - Commit the smoke harness.

4. Step 526.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-speed-controls-browser-smoke.js`
     `node v5/tests/replay-keyboard-controls-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `node v5/tests/replay-cadence-latency-browser-smoke.js`
     `git diff --check`
   - Update TODO/session handoff with results and next recommendation.
   - Commit closeout docs.

## Non-Goals

- Do not add configurable shortcut bindings.
- Do not change replay runtime playback timer semantics.
- Do not add visible shortcut tutorial text to the UI.
- Do not persist speed settings in this step.

## Status

- Step 526.1: active. Planning playback speed ergonomics and boundaries.

## Next

Implement speed presets and keyboard speed nudges in the existing replay
transport/control modules.
