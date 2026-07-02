# Step 475 - V5 Multi-Pane Chart Resize

Date: 2026-07-02

Status: completed.

## Goal

Make every real layout pane reliably redraw chart chrome after multi-pane mount
and layout changes.

## Summary

- Added a chart-runtime adapter `resizeToHost()` path for Lightweight charts.
- Resized against the internal `data-chart-engine-surface` instead of route DOM
  assumptions.
- Triggered resize during mount, presentation/data sync, and reused-host layout
  changes.
- Extended smoke coverage to verify every triple-pane chart surface records a
  non-zero resize size.

## Boundaries

- Route UI still only dispatches chart mount/layout commands.
- Route UI does not call Lightweight chart APIs.
- Chart runtime remains the owner of chart adapter lifecycle and chart writes.
- Replay cursor/reveal and bar-data ownership are unchanged.

## Follow-Up

- Step 476 should implement resizable split pane boundaries with explicit split
  state for ratios and min sizes.
- Split dragging should update layout/split state and trigger the chart runtime
  resize path added here.

## Checks

- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/src/runtime/chart-runtime.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
