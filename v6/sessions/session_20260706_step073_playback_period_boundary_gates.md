# V6 Step 73 - Playback Period Boundary Gates

Date: 2026-07-06

## Summary

Step 73 hardened playback-period execution at replay end and added browser
coverage for latency-sensitive non-1m playback.

The important implementation fix is in chart-entry manual next:

- if replay is already `ended`, manual next now returns an `ended` state without
  calling `replay.next`, loading a bar window, or appending chart data;
- if a large playback period reaches `ended` mid-loop, it appends only the
  remaining bars and stops.

This closes the duplicate-last-bar risk introduced by multi-bar playback
periods.

## Gates

Runtime gate:

- `chart-entry-playback-period-boundary-runtime-smoke.js`
- verifies near-end `5m` playback appends only the one remaining bar;
- verifies already-ended replay performs no append and no load.

Browser gate:

- `chart-entry-playback-period-boundary-browser-smoke.js`
- creates a five-bar session;
- runs auto-play with `15m` playback period;
- verifies replay reaches `ended`, chart data gains only the four remaining
  bars, and auto-play stops;
- verifies latest candle appears in the chart surface visible range;
- verifies Reset View does not mutate playback period, replay state, or chart
  data after period-based playback.

## Boundary

The fix stays inside chart-entry ownership. The transport shell still only
dispatches playback-period commands; reset view still belongs to chart viewport
ownership; replay owns cursor state.

## Commits

- `d7180ed7 docs(v6): scope step seventy three boundaries`
- `fc745805 fix(v6): guard playback period replay end`
- `33e681eb test(v6): gate playback period browser boundaries`

## Verification

- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
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

Step 74 should improve transport UI feedback around ended playback. The runtime
now has the correct no-op behavior, but the user-facing controls should make it
clear when playback has ended and what actions are still available.
