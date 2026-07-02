# Step 434 - V5 Replay Playback Controller Split

## Status

Completed.

## Goal

Move playback timer/state management out of `replay-runtime.js` so transport
behavior remains isolated before the remaining cursor navigation logic is split.

## Plan

- Step 434.1: Treat playback as the next replay subsystem boundary because it
  has timer lifecycle and state independent from cursor mutation.
- Step 434.2: Add a playback controller with injected session lookup, replay
  advance callback, and event emission.
- Step 434.3: Move playback snapshot, state mutation, play/pause, timer ticks,
  advancing guard, interval validation, and `PLAYBACK_CHANGED` emission into
  that controller.
- Step 434.4: Keep replay runtime responsible for command registration and
  inject `next` as the controller's advance callback.
- Step 434.5: Update boundary smoke coverage so playback implementation bodies
  do not drift back into `replay-runtime.js`.
- Step 434.6: Run focused playback/navigation smokes, full V5 smoke, and
  `git diff --check`.

## Changes

- Added `v5/src/runtime/replay-playback-controller.js`.
- Updated `v5/src/runtime/replay-runtime.js` to delegate `PLAY`, `PAUSE`, and
  `GET_PLAYBACK_STATE` to the playback controller.
- Replaced internal pause calls in Previous, Truncate, Reset, and Stop with
  controller pause/reset calls.
- Updated `v5/tests/runtime-boundary-smoke.js` to assert the playback boundary.
- Reduced `replay-runtime.js` from 785 lines to 712 lines.
- Updated `v5/TODO.md` and this handoff.

## Guardrails

- Playback still advances through replay runtime `next`, preserving replay
  cursor/reveal ownership.
- Playback emits the existing `PLAYBACK_CHANGED` event shape.
- Replay runtime remains the command registration owner.
- Public replay helper exports remain unchanged.

## Verification

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-playback-controller.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 435 should split replay cursor navigation/truncation/reset into a
controller. That should leave `replay-runtime.js` focused on session bootstrap,
command registration, lifecycle, and composition of replay subsystems.
