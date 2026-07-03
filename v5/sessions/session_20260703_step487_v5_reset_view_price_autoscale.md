# Step 487 - V5 Reset View Price Auto-Scale

Date: 2026-07-03

Status: completed

## Problem

The chart reset-view button returned the time axis to the latest replay cursor
but did not restore the price axis. If the price scale had been dragged or
scaled so candles were outside the visible range, reset view still left candles
off-screen.

## Implementation

- Added `resetPriceScale()` to the Lightweight chart adapter.
- Reset reapplies `autoScale: true` and the current price scale margins.
- Chart runtime host sync can reset price scale for one pane or all mounted
  hosts.
- `chart.resumeViewportFollow` now accepts optional `paneId`.
- Non-primary pane reset restores that pane's follow state and price scale
  without rewriting other panes.
- Reset-view button clicks pass the clicked pane id from the pane DOM.

## Validation

- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-navigation.js`
- `node --check v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`

## Notes

This remains inside chart runtime ownership. Route UI only dispatches
`chart.resumeViewportFollow`; chart runtime and the adapter own chart instance
and price scale writes.
