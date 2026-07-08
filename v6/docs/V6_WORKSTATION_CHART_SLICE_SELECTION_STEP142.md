# V6 Workstation Chart Slice Selection - Step 142

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Comparison Symbol Owner
Contract.

The account/trading owner contract is now in place, and the updated parity gap
audit still names comparison symbol behavior as a deferred top-toolbar family
that needs an explicit owner before interactivity. Comparison symbol is the
smallest remaining top-toolbar owner family because V6 already has a disabled
Add comparison symbol placeholder while no comparison/multi-symbol owner exists
yet.

Lightweight Charts supports plugins, primitives, and series APIs for rendered
visual extensions, including custom annotations and custom series. This slice
does not use those APIs. The comparison owner contract should define the future
request/state boundary only; chart-engine series writes and any plugin or
primitive rendering must stay deferred until a chart-engine-owned integration
slice is explicitly selected.

## Selected Slice

Step 143 should establish a comparison symbol owner contract without making the
top-toolbar Add comparison symbol button interactive.

The slice should:

- define a focused comparison-symbol contract module;
- define explicit comparison request fields such as base symbol, comparison
  symbol, display mode, scale mode, color, source series, visibility, session
  id, and metadata;
- define supported display modes such as price, percent, indexed, and spread;
- define supported scale modes such as overlay and separate-scale;
- define default read-only comparison intent state and validation helpers for
  future owner wiring;
- keep the top-toolbar Add comparison symbol button disabled and inert;
- avoid symbol search, bar requests, comparison series creation, chart series
  writes, chart primitives/plugins, pane mutation, persistence, browser
  storage, or runtime command wiring until a comparison symbol runtime owner is
  explicitly selected;
- preserve diagnostics visibility cleanup, chart host, left drawing rail,
  right utility rail, right-rail Session settings panel, drawing/action-history
  contract, indicators contract, screenshot/export contract, account/trading
  contract, floating transport, footer status bar, and dashboard row-action
  visibility.

## Ownership Boundary

Allowed:

- a focused `comparison-symbol` contract/domain module;
- pure validation/default-intent helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- enabling the top-toolbar Add comparison symbol button;
- performing symbol search or symbol lookup;
- requesting bars for comparison symbols;
- adding comparison chart series, custom series, primitives, plugins, or chart
  overlays;
- mutating chart state, pane state, viewport state, replay state, or bar-data
  cache state;
- dispatching comparison-symbol, chart, replay, bar-data, default-wall,
  display-timeframe, viewport, session-settings, screenshot/export, indicators,
  drawing/action-history, account/trading, orders, or calendar commands from
  top toolbar selection code;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, display-timeframe, indicators, drawing-action-history,
  account-trading, settings, session-settings, screenshot-export, orders,
  calendar, account, analytics, persistence, V4, vendor, or Lightweight Charts
  modules into a comparison-symbol contract;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 143

- new comparison-symbol contract smoke passes;
- Step 142 slice selection smoke passes;
- account/trading contract smoke passes;
- Step 140 slice selection smoke passes;
- drawing/action-history contract smoke passes;
- indicators contract smoke passes;
- screenshot/export contract smoke passes;
- session-settings contract smoke passes;
- top toolbar parity browser smoke still passes;
- diagnostics visibility cleanup browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
