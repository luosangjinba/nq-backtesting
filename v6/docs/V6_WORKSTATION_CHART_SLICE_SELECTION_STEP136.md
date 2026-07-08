# V6 Workstation Chart Slice Selection - Step 136

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Indicators Owner Contract.

The screenshot/export owner contract is now in place, and the updated parity
gap audit still calls for explicit owners before deferred toolbar controls
become interactive. Indicators is the smallest remaining top-toolbar owner
contract family because V6 already has a disabled Indicators placeholder while
no indicators owner exists yet.

## Selected Slice

Step 137 should establish an indicators owner contract without making the
top-toolbar Indicators button interactive.

The slice should:

- define a focused indicators contract module;
- define explicit indicator request fields such as indicator id, source series,
  pane placement, inputs, style, visibility, and metadata;
- define default read-only indicator intent state and validation helpers for
  future owner wiring;
- keep the top-toolbar Indicators button disabled and inert;
- avoid indicator calculation, chart series writes, pane creation, persistence,
  browser storage, or runtime command wiring until an indicators runtime owner
  is explicitly selected;
- preserve diagnostics visibility cleanup, chart host, left drawing rail, right
  utility rail, right-rail Session settings panel, bottom account/trading
  chrome, floating transport, footer status bar, and dashboard row-action
  visibility.

## Ownership Boundary

Allowed:

- a focused `indicators` contract/domain module;
- pure validation/default-intent helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- enabling the top-toolbar Indicators button;
- calculating indicators, adding chart series, creating panes, or mutating chart
  state;
- dispatching indicators, chart, replay, bar-data, default-wall,
  display-timeframe, viewport, session-settings, screenshot/export, orders, or
  calendar commands from toolbar selection code;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, display-timeframe, settings, session-settings,
  screenshot-export, orders, calendar, account, analytics, persistence, V4,
  vendor, or Lightweight Charts modules into an indicators contract;
- exposing undo/redo or drawing/action-history behavior;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 137

- new indicators contract smoke passes;
- Step 136 slice selection smoke passes;
- screenshot/export contract smoke passes;
- Step 134 slice selection smoke passes;
- session-settings contract smoke passes;
- diagnostics visibility cleanup browser smoke still passes;
- right-rail Session settings panel regression audit smoke still passes;
- bottom chrome regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
