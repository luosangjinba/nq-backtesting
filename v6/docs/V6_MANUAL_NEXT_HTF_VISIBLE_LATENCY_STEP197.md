# V6 Step 197 - Manual Next HTF Visible Latency

## Purpose

Route manual-next replay advancement through the chart-data projection owner for
higher display timeframes while keeping bar-data, replay cursor, chart-data, and
chart-engine ownership separate.

## Changes

- Manual-next now requests source-timeframe bars from bar-data, even when the
  pane display timeframe is higher.
- Higher display timeframes call `chartDataProjection.project` and append only
  the projected bucket that contains the replay cursor.
- 1m display panes stay on the existing raw cursor-bar append path.
- `main` chart-entry pane writes can read the active pane's display timeframe
  when no `main` pane record exists, preserving the current chart-entry bridge
  while avoiding a broad pane-id ownership change.
- Added browser latency coverage proving a rendered HTF candle updates after
  manual next within the visible-latency threshold.

## Boundary

- Bar-data remains the owner of source window requests and cache records.
- Replay remains the owner of cursor and reveal state.
- Chart-data stores the resulting display bars but does not aggregate.
- Chart engine receives already ordered OHLC bars and does not project.
- Auto-play, leftward history, and reset view are still not routed through the
  projection owner in this step.

## Verification

- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 198 should route leftward history for HTF panes through the projection
owner. It must preserve delayed/coalesced/chunked history loading and keep the
currently visible K-line area stable while older source chunks are prepended.
