# Step 476 - V5 Lightweight Manual Sizing

Date: 2026-07-02

Status: completed.

## Goal

Fix the remaining multi-pane axis chrome issue by aligning the Lightweight
adapter with the library's resize semantics.

## Summary

- Disabled Lightweight `autoSize` in the V5 chart adapter.
- Passed explicit chart width/height during chart creation.
- Kept manual runtime `chart.resize()` calls as the active resize path.
- Added price-scale `minimumWidth` and time-scale `minimumHeight` so each pane
  reserves visible axis space.
- Extended adapter smoke coverage for manual sizing and axis minimums.

## Boundaries

- Route UI still does not call Lightweight APIs.
- Chart runtime remains responsible for adapter sizing and chart writes.
- Bar-data runtime and replay runtime ownership are unchanged.
- Split-pane drag handles remain deferred to the next step.

## Checks

- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/chart-engine-lightweight-options.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
