# V6 Workstation Chart Slice Selection - Step 138

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Drawing/Action-History Owner
Contract.

The indicators owner contract is now in place, and the updated parity gap audit
still calls for explicit owners before deferred drawing, undo, and redo
controls become interactive. Drawing/action-history is the smallest remaining
workstation tool owner family because V6 already has an inert left drawing rail
and disabled top-toolbar undo/redo controls while no drawing/action-history
owner exists yet.

## Selected Slice

Step 139 should establish a drawing/action-history owner contract without
making the left drawing rail or top-toolbar undo/redo controls interactive.

The slice should:

- define a focused drawing/action-history contract module;
- define explicit drawing request fields such as tool id, anchor points, target
  pane, style, label, visibility, and metadata;
- define explicit action-history fields for action id, action type, target,
  timestamp, and metadata;
- define default read-only drawing intent state and validation helpers for
  future owner wiring;
- keep left drawing rail buttons and top-toolbar undo/redo buttons disabled and
  inert;
- avoid drawing creation, chart overlays, pane mutation, undo/redo execution,
  persistence, browser storage, or runtime command wiring until a drawing
  runtime owner is explicitly selected;
- preserve diagnostics visibility cleanup, chart host, indicators contract,
  right utility rail, right-rail Session settings panel, bottom account/trading
  chrome, floating transport, footer status bar, and dashboard row-action
  visibility.

## Ownership Boundary

Allowed:

- a focused `drawing-action-history` contract/domain module;
- pure validation/default-intent helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- enabling left drawing rail buttons;
- enabling top-toolbar undo or redo;
- creating drawings, writing chart overlays, creating panes, or mutating chart
  state;
- dispatching drawing/action-history, indicators, chart, replay, bar-data,
  default-wall, display-timeframe, viewport, session-settings,
  screenshot/export, orders, or calendar commands from selection code;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, display-timeframe, indicators, settings, session-settings,
  screenshot-export, orders, calendar, account, analytics, persistence, V4,
  vendor, or Lightweight Charts modules into a drawing/action-history contract;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 139

- new drawing/action-history contract smoke passes;
- Step 138 slice selection smoke passes;
- indicators contract smoke passes;
- Step 136 slice selection smoke passes;
- screenshot/export contract smoke passes;
- diagnostics visibility cleanup browser smoke still passes;
- left drawing rail browser smoke still passes;
- right-rail Session settings panel regression audit smoke still passes;
- bottom chrome regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
