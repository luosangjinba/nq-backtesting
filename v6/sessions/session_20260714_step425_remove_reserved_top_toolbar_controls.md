# Session 2026-07-14 - Step 425 Remove Reserved Top Toolbar Controls

## Scope

Remove the selected inert top-toolbar controls without removing their future
feature contracts or changing working chart/workflow controls.

## Completed

- removed Symbol Search and Compare placeholders;
- removed Indicators and Undo/Redo placeholders;
- removed session-hours/ETH, Screenshot, Theme, and Fullscreen placeholders;
- removed orphan account-chip, text-button, and disabled-Redo styling;
- removed the now-unused Moon and Undo SVG definitions while retaining shared
  icons still consumed by functional surfaces;
- advanced the cleanup absence manifest through Step 425;
- converted historical feature-selection tests from placeholder presence to
  production-entry absence assertions;
- preserved active symbol, timeframe, layout/sync, Settings, Replay, Journal,
  and all relevant owner contracts.

## Verification

- `node v6/tests/workspace-placeholder-absence-harness-step420-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`

## Next

Step 426 should remove the traditional inert left Drawing rail and reclaim its
chart space. It must preserve the drawing/action-history contract and must not
select the future Semantic Drawing entry surface or plugin API.
