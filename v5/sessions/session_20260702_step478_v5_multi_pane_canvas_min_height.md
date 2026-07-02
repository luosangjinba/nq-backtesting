# Step 478 - V5 Multi-Pane Canvas Min Height

Date: 2026-07-02

Status: completed.

## Goal

Fix missing time axes in stacked multi-pane layouts.

## Summary

- Reproduced `twice.horizontal` with a clean browser diagnostic.
- Found that pane hosts were about 428px high while `chart-runtime-canvas`
  still inherited the single-pane `min-height: 618px`.
- Cleared the runtime canvas minimum height inside multi-pane shells.
- Kept the single-pane minimum height unchanged.
- Extended layout browser smoke coverage to assert stacked pane canvas/surface
  height does not exceed host height.

## Responsive Layout Decision

Multi-pane chart sizes must come from responsive grid tracks and future split
ratios, not fixed pixel heights. Pixel values remain appropriate only for chart
chrome reservations such as price/time axis minimums and test tolerances.

## Boundaries

- Route UI still does not call Lightweight APIs.
- Chart runtime remains responsible for adapter sizing and chart writes.
- Replay runtime and bar-data runtime ownership are unchanged.
- Resizable split pane handles remain deferred to the next step.

## Checks

- `node tmp/v5_axis_debug.js` during diagnosis; temporary script removed before
  commit.
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`
