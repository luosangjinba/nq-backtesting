# V6 Step 75 - Replay End Restart Entry Policy

Date: 2026-07-06

## Summary

Step 75 added an explicit restart path for ended replay.

The new owner is `runtime.chartEntryRestart`:

- exposes `chartEntryRestart.getState` and `chartEntryRestart.restart`;
- reads the active session through `session.getActive`;
- reopens that same session through `session.open`;
- relies on the existing session-opened chart-entry event chain to reload replay
  state, chart data, and viewport intent.

This keeps restart out of the transport shell and avoids direct chart writes.

## UI Entry

The transport's left-side restart button is now the explicit restart entry:

- disabled before replay ends;
- enabled at `ended`;
- dispatches `chartEntryRestart.restart`;
- returns to disabled after replay is reloaded.

Play remains disabled at ended state and Reset View remains viewport-only.

## Browser Gate

`chart-entry-restart-browser-smoke.js` verifies:

- short session can be played to `ended`;
- Play is disabled and Restart is enabled at end;
- clicking Restart dispatches the chart-entry restart owner path;
- replay returns to cursor index `0` and status `ready`;
- chart data returns to the initial replay-visible set;
- chart surface and default viewport are visible again;
- Reset View is not used as replay restart.

## Commits

- `fac490d4 docs(v6): scope step seventy five restart entry`
- `5e99061b feat(v6): add chart entry restart owner`
- `996fb2a1 feat(v6): wire explicit replay restart control`
- `14cdef1f test(v6): verify replay restart browser flow`

## Verification

- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 76 should polish the restart transport control itself. The current path is
functionally correct, but the button still uses the old placeholder/truncate
icon. The next step should make icon semantics, tooltip text, and visual states
clear before more workflow features are added.
