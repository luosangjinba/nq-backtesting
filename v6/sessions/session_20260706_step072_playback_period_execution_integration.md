# V6 Step 72 - Chart Entry Playback Period Execution Integration

Date: 2026-07-06

## Summary

Step 72 made chart-entry execution consume the playback period owner added in
Step 71.

Manual next now:

- reads `replay.getState` to determine the source timeframe;
- reads `playbackPeriod.getState` to determine the active playback period;
- converts playback period to a source-bar step count;
- loops through `replay.next`, bounded bar loading, and chart-data append for
  each source bar in the period;
- stops early if replay reaches `ended`.

Auto-play did not need a separate implementation path because it already ticks
through `chartEntryManualNext.next`. That keeps manual and automatic replay
consistent.

## Boundary

The transport shell still does not write chart data, replay cursor, or pane
display timeframe. It only changes playback-period state through commands.

The new period policy lives under chart-entry ownership:

- `chart-entry-playback-period-policy.js` computes source-bar step counts;
- seconds below the source timeframe resolve to one source bar;
- minute/hour periods resolve to a bounded integer source-bar count.

This preserves the Step 71 distinction:

- sync off: playback period can differ from chart display timeframe;
- sync on: playback period follows active pane display timeframe, while
  execution still happens through chart-entry commands.

## Browser Gate

`chart-entry-playback-period-browser-smoke.js` verifies:

- a manual `3m` playback period advances replay and chart bars by three source
  bars;
- enabling sync and changing active pane display timeframe to `5` changes
  playback period to `5m`;
- the next manual advance adds five source bars;
- chart surface data length matches the chart-data runtime after both advances.

## Commits

- `6241ffab docs(v6): scope step seventy two playback execution`
- `b112ba2a feat(v6): apply playback period to manual next`
- `d20f9cbc test(v6): verify playback period execution`

## Verification

- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 73 should harden edge cases around playback period execution: large period
near replay end, auto-play ending during a multi-bar tick, visible latency for a
non-1m period, and reset-view independence after period-based advances.
