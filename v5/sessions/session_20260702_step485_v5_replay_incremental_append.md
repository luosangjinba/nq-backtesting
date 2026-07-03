# Step 485 - V5 Replay Incremental Append

Date: 2026-07-02

Status: completed

## Problem

Manual `Next` in V5 still felt slower than V4. Rapid clicks could be coalesced
at the controls layer, and chart reveal could happen before cursor persistence,
but same-timeframe replay still sent full display-bar replacement into chart
runtime. The Lightweight adapter then called `setData(...)`, so each visible
K-line reveal could look like a full chart refresh instead of an immediate bar
append.

## V4 Comparison

V4 steps forward by incrementing the in-memory replay cursor and calling
`appendPrimaryChartBar(...)` for the single newly revealed bar. That is why V4
feels immediate.

V5 should not copy V4's old ownership model. UI and feature controllers still
must not write chart series directly. The V5 version keeps the same performance
idea but routes it through replay runtime and chart runtime commands.

## Implementation

- Added pane-aware `chart.appendBars` handling in chart runtime.
- Added chart host append sync that only uses adapter append when the newly
  rendered bars are exactly the previous rendered bars plus new bars.
- Added Lightweight adapter `appendBars(...)` using `series.update(...)`.
- Kept fallback behavior: if viewport follow/manual range causes rendered bars
  to crop, shift, or reorder, chart runtime falls back to full `setData(...)`.
- Merged primary viewport-follow cursor updates into append payloads so same
  `Next` no longer appends and then immediately replaces via
  `chart.setViewportFollow`.
- Updated same-timeframe replay `Next` to dispatch append bars. Display
  timeframe projection, previous/reset, prefix demand, and timeframe switches
  still use full replacement.
- Strengthened controls batching so clicks that arrive while a Next batch is
  in flight are consumed by the same batch loop instead of becoming one command
  per click.

## Validation

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/replay-chart-sync.js`
- `node --check v5/src/runtime/replay-navigation-controller.js`
- `node v5/tests/chart-replay-fast-next-controls-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-next-chart-before-persist-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

## Remaining Risk

If the viewport-follow window is small enough that each new bar shifts the
rendered left edge, Lightweight cannot remove the old left bar with
`series.update(...)`; V5 intentionally falls back to `setData(...)` in that
case. Step 486 should profile real browser playback and split-pane playback to
separate command latency, chart update counts, and resize/follow work.
