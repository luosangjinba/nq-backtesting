# V6 Step 192 - Display Timeframe Readiness Audit

## Purpose

Step 192 is an audit and contract step only. It intentionally does not add or
expand display-timeframe behavior.

The goal is to prevent TF work from starting before the lower-level ownership
rules are explicit. Higher timeframe support touches bar requests, pane intent,
chart-data replacement, replay append, leftward history, reset view, and
browser-visible latency. Starting implementation before those boundaries are
clear would recreate the V5-style viewport/data coupling V6 is avoiding.

## External Capability Check

Checked current Lightweight Charts documentation and TradingView ecosystem
entry points before choosing the V6 boundary:

- Lightweight Charts `Time` accepts timestamp, business-day object, or ISO date
  string, so V6 can continue supplying UTC timestamps for intraday bars:
  https://tradingview.github.io/lightweight-charts/docs/api/type-aliases/Time
- Candlestick/bar series consume OHLC data or whitespace data. This means any
  higher timeframe bar must be a complete, ordered OHLC item before it reaches
  the chart engine:
  https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesDataItemTypeMap
- The series API supports full `setData` and last-bar `update` style workflows,
  but V6 must not rely on chart-engine mutation to perform aggregation or
  no-future filtering:
  https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
- TradingView's official repository points to plugin examples and
  awesome-tradingview, but those are chart/extension references, not a
  substitute for V6 replay-safe data ownership:
  https://github.com/tradingview/lightweight-charts
  https://github.com/tradingview/awesome-tradingview

## Current V6 State

### Existing Useful Pieces

- `display-timeframe-projection.js` can aggregate normalized lower-timeframe
  bars into larger buckets and cap input bars at a cursor timestamp.
- `default-wall-pane-projection.js` already uses the projection helper for
  default-wall replace payloads.
- Pane records carry `displayTimeframe`, and pane/runtime smoke coverage already
  checks pane-local interval changes and sync intent.
- Pane reload planning can request windows for a pane's current display
  timeframe.

### Current Gaps

- There is no single owner contract for higher-timeframe chart bars across
  initial load, pane reload, manual next, auto-play, leftward history, and reset
  view.
- `chart-entry-manual-next-runtime.js` currently uses `pane.displayTimeframe`
  when requesting the next bar window. That is a direct conflict with a
  source-1m aggregation strategy, because higher TF replay often needs source
  bars inside the current bucket, not just one already-aggregated target bar.
- Pane reload chart-data replacement currently writes `loadedWindow.bars`
  directly into chart-data. It does not call a shared projection/no-future
  owner for HTF bars.
- Leftward history prepends source bars directly into chart-data. If a pane is
  displaying HTF bars, prepending source chunks must update or rebuild the
  leftmost HTF bucket without shifting the user's current viewport.
- The existing projection helper does not expose bucket completeness metadata.
  Replay needs to distinguish:
  - a completed HTF bar;
  - an in-progress HTF bar capped by replay cursor;
  - a future bucket that must not be visible.
- There is no browser-visible latency gate that proves mixed-TF replay `Next`
  can append/update the visible HTF candle without falling back to full
  unstable chart resets.

## Owner Boundary Decision

The next TF implementation should introduce a dedicated chart-data projection
owner, not place aggregation in UI, chart surface, chart engine, replay, or
bar-data cache internals.

Proposed owner:

```text
runtime.chart-data-projection
```

Responsibilities:

- consume source bars that are already loaded through bar-data or chart-data
  owner handoff;
- project source bars into pane-local display bars for a target timeframe;
- enforce no-future filtering with replay cursor timestamp;
- return ordered, unique OHLC bars suitable for Lightweight Charts;
- include bucket metadata such as bucket start, source count, complete/in
  progress, and cursor cap;
- provide pure helpers that can be tested without DOM or chart engine;
- expose explicit commands/events for runtimes that need projected replacement
  or append/update payloads.

Non-owners:

- Bar-data runtime remains the owner of source bar requests and cache windows.
  It should not own replay cursor filtering or chart display projection.
- Replay runtime remains the owner of cursor/reveal state only.
- Chart-data runtime remains the owner of pane-local chart bar sets. It may
  store projected display bars, but projection calculation should be a separate
  explicit owner helper/runtime.
- Chart engine adapter remains a renderer. It must receive already-valid
  ordered data and should not aggregate.
- UI controls dispatch pane interval intent only. They must not compute bars.

## Required Implementation Sequence

1. Add pure projection-domain coverage.
   - 1m -> 5m/15m/60m OHLC aggregation.
   - sorted output, duplicate timestamp rejection or deterministic merge.
   - cursor-capped no-future filtering.
   - bucket completeness metadata.
   - session-boundary and Globex Sunday bucket start behavior.

2. Add chart-data projection owner.
   - command/event contract.
   - pane-local input/output.
   - no DOM, no chart engine, no replay cursor mutation.

3. Route initial chart-entry projection through the owner.
   - keep current default-wall visible latency gates passing.
   - prove source 1m and target 5m produce correct first visible wall.

4. Route pane reload replacement through the owner.
   - do not write raw `loadedWindow.bars` directly into display chart-data for
     HTF panes.
   - preserve pane-local symbol/timeframe isolation.

5. Route manual next and auto-play through the owner.
   - source window planning must fetch enough lower-timeframe data to complete
     or update the target bucket.
   - visible candle latency must be measured on the rendered HTF candle.

6. Route leftward history through the owner.
   - prepend source chunks and rebuild affected leading display buckets.
   - preserve current viewport stability and replay-safe delayed request gates.

7. Route reset view through projected chart-data summary.
   - reset view must use display bars for pane span/latest offset while replay
     cursor remains source-time based.

## Tests Required Before TF Feature Work

- `display-timeframe-projection-domain-step193-smoke.js`
- `chart-data-projection-owner-step194-smoke.js`
- `initial-htf-chart-entry-browser-step195-smoke.js`
- `pane-reload-htf-projection-browser-step196-smoke.js`
- `manual-next-htf-visible-latency-browser-step197-smoke.js`
- `leftward-history-htf-stability-browser-step198-smoke.js`
- `reset-view-htf-browser-step199-smoke.js`
- chart browser regression pack update including at least one mixed-TF pane
  path.

## Explicit Non-Goals For Step 192

- Do not add new TF options or UI behavior.
- Do not change bar-data API requests.
- Do not change replay `Next` or auto-play behavior.
- Do not change chart-data replacement/prepend/append behavior.
- Do not wire HTF data to chart engine.

## Acceptance

- This audit names the required owner boundary for TF aggregation and no-future
  filtering.
- This audit names the tests required before HTF implementation.
- Static smoke proves Step 192 did not introduce TF feature code.
- Replay-safe leftward history latency, chart browser regression pack, and
  boundary smoke continue to pass.
