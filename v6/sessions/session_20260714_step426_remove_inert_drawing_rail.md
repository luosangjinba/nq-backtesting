# Session 2026-07-14 - Step 426 Remove Inert Drawing Rail

## Scope

Remove the traditional six-button Drawing placeholder family and reclaim chart
space without deciding the future Semantic Drawing entry or plugin API.

## Completed

- removed Cursor, Trend Line, Horizontal Line, Rectangle, Measure, and Text
  production buttons;
- removed all left Drawing rail styling;
- removed four SVG definitions that became unreferenced;
- changed workstation columns from left/chart/right to chart/right;
- moved the chart surface into the reclaimed first column;
- advanced the cleanup manifest through Step 426;
- converted rail and lower-chrome geometry tests to the reclaimed boundary;
- retained the drawing/action-history owner contract.

## Verification

- `node v6/tests/workspace-placeholder-absence-harness-step420-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/settings-scope-closeout-step417-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`

## Next

Step 427 should remove Object tree, Order, and News placeholders and collapse
the right rail if nothing functional remains. Preserve Orders and other owner
contracts, Pane actions, chart scales, and pointer boundaries.
