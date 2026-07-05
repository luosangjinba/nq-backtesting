# V6 Step 15 - Chart Status And OHLC

Date: 2026-07-05

## Scope

Step 15 added read-only chart status and OHLC readouts. The status layer
subscribes to replay/default-wall events and renders text only; it does not
dispatch mutation commands or own replay, chart, data, or viewport state.

## Completed Commits

- `8b7e65f feat(v6): add status readout model`
- `7844ce9 feat(v6): mount read-only status readouts`
- `29c4d69 test(v6): verify read-only status updates`
- `a0f80c8 test(v6): enforce status readout boundaries`

## Implementation Notes

- Added `v6/src/shell/status-readout-model.js` for formatting latest OHLC,
  session, start, cursor, end, revealed count, playback, and no-future hidden
  count.
- Added `v6/src/shell/status-readout.js` to subscribe to default-wall and replay
  events and render read-only DOM text.
- Updated workstation shell markup with stable status data attributes.
- Browser smoke verifies default-wall load, Next, Play, and Pause update OHLC
  and footer readouts, and that the status bar contains no interactive mutation
  controls.
- Boundary smoke now audits status readout files for read-only ownership.

## Verification

- `node v6/tests/status-readout-model-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The status browser smoke required local browser-test permissions because it
starts a temporary HTTP server and headless Chrome.

## Next Step

Step 16 should add single-pane display timeframe behavior. Timeframe changes
must not reset viewport intent unless a future explicit reset/follow command is
introduced.
