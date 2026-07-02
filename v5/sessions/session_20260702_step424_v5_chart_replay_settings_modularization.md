# Step 424 - V5 Chart Replay Settings Modularization

Date: 2026-07-02

Status: completed.

## Trigger

User raised a maintainability concern that leaving the growing V5 chart replay
route as one large file would make later features harder to separate because
references and responsibilities would become mixed.

## Plan

- Step 424.1: Treat this as a bounded modularization step, not a behavior
  rewrite.
- Step 424.2: Start with the Settings modal because it has a stable route-local
  UI boundary and draft state.
- Step 424.3: Extract Settings HTML, draft cloning/rendering, section tabs,
  and control event bindings into a dedicated route-local module.
- Step 424.4: Keep runtime synchronization in the route via callbacks so UI
  still dispatches commands and does not directly write chart/replay state.
- Step 424.5: Run the focused settings/navigation smokes plus the full V5 smoke
  suite before committing.

## Implementation

- Added `v5/src/features/chart-replay/chart-settings-panel.js`.
- Moved the FXReplay-style Settings modal template into
  `renderChartSettingsPopover()`.
- Moved Settings draft state, style clone helpers, tab switching, render logic,
  and apply/cancel DOM bindings into `createChartSettingsController()`.
- Kept `chart-replay-route.js` responsible for:
  - current display timezone and presentation settings state;
  - command dispatch to display-timezone and chart-presentation runtimes;
  - chart display-context synchronization;
  - replay/chart event subscriptions.
- Reduced `chart-replay-route.js` from 1737 lines to 1082 lines without
  changing user-facing behavior.

## Guardrails

- Settings remains route-local UI code.
- The Settings module receives apply/cancel callbacks and does not call chart
  series APIs.
- Chart presentation still normalizes through presentation runtime and chart
  display context before reaching the chart-engine adapter.
- Display timezone remains display-only and does not change replay cursor,
  bars, request ranges, or cache keys.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
