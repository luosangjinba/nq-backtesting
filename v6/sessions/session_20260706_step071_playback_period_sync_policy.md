# V6 Step 71 - Chart Entry Playback Period Sync Policy

Date: 2026-07-06

## Summary

Step 71 promoted the FXReplay transport playback period from shell-only UI
state into an explicit runtime owner.

The new owner is `runtime.playback-period`:

- exposes `playbackPeriod.getState`, `playbackPeriod.setPeriod`, and
  `playbackPeriod.setSync`;
- emits `playbackPeriod:changed`;
- keeps playback period independent from chart display timeframe when sync is
  off;
- follows the active pane display timeframe through pane commands/events when
  sync is on;
- never writes chart data, chart viewport, replay cursor, or pane display
  timeframe directly.

## Boundary

This step intentionally does not change how many bars manual next or auto-play
reveals. It establishes the owned period/sync policy first so Step 72 can make
chart-entry execution consume the period through commands instead of reading
DOM or coupling transport UI to replay/chart internals.

Manual period selection now disables sync. That preserves the distinction the
UI needs:

- sync on means "follow active pane display timeframe";
- sync off means "transport playback period can differ from chart display
  timeframe."

## Browser Gate

`playback-period-browser-smoke.js` verifies the real workstation path:

- selecting `3m` updates playback period and leaves sync off;
- enabling sync reads the active pane timeframe;
- a pane display-timeframe change to `5` updates playback period to `5m`;
- selecting `30s` manually disables sync again;
- the active pane display timeframe remains `5`, proving transport period does
  not back-write chart display timeframe.

## Commits

- `de86fb32 docs(v6): scope step seventy one playback period`
- `280c4f8d feat(v6): add playback period runtime`
- `263de362 feat(v6): wire playback period controls`
- `84af0053 test(v6): cover playback period sync`

## Verification

- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 72 should make chart-entry manual next and auto-play consume
`playbackPeriod.getState` when calculating replay advancement. That needs to
remain inside chart-entry/replay ownership and must not let the transport shell
write chart data or replay cursor directly.
