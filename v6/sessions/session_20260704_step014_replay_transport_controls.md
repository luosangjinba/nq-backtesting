# V6 Step 14 - Replay Transport Controls

Date: 2026-07-04

## Scope

Step 14 replaced the static transport placeholder with FXReplay-like replay
controls. The transport UI remains a command-dispatch boundary only: it does not
own replay cursor, chart bars, viewport intent, chart engine state, storage, or
network behavior.

## Completed Commits

- `acdb530 feat(v6): add replay transport controller`
- `d2da1a1 feat(v6): mount replay transport controls`
- `37a7865 test(v6): verify replay transport dispatch`
- `2a112ac test(v6): enforce replay transport boundaries`

## Implementation Notes

- Added `v6/src/shell/replay-transport.js` with Play/Pause, Next, speed preset,
  and keyboard shortcut handling.
- The controller maps UI events to command bus calls only:
  `defaultWall.next`, `replay.play`, and `replay.pause`.
- Mounted the controller from `v6/src/app.js` after runtime startup.
- Updated workstation shell markup and styling for active transport controls and
  speed presets.
- Added browser smoke coverage that loads an in-memory replay session, clicks
  Next, uses Space for Play, clicks Pause, uses ArrowRight for Next, and asserts
  the expected command-path state changes.
- Added a boundary audit for transport controls so future changes cannot import
  feature runtimes or own replay/chart/viewport/data state.

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The transport browser smoke required local browser-test permissions because it
starts a temporary HTTP server and headless Chrome.

## Next Step

Step 15 should add read-only chart status and OHLC readouts. That UI must not
dispatch mutation commands or write chart/replay/viewport state.
