# V6 Indicators Owner Contract

Date: 2026-07-07

## Outcome

Step 137 establishes the indicators owner contract without enabling the
top-toolbar Indicators button.

The accepted shape is:

- `v6/src/indicators/indicators-contract.js` owns the indicators contract
  surface;
- owner identity is `indicators-runtime`;
- supported built-in indicator ids are `sma`, `ema`, `rsi`, `macd`, `volume`,
  `vwap`, and `atr`;
- custom indicators and Pine Script execution are not supported;
- explicit request fields are indicator id, source series, pane placement,
  inputs, style, visibility, and metadata;
- default indicator intent state is read-only and keeps toolbar controls
  disabled;
- validation helpers cover supported built-in ids, supported source series,
  pane placement, object-shaped inputs/style/metadata, and boolean visibility;
- indicator calculation, chart series writes, pane creation, browser storage,
  persistence, and runtime command wiring remain deferred.

## Contract Fields

The contract exposes these fields:

- `indicatorId`;
- `sourceSeries`;
- `panePlacement`;
- `inputs`;
- `style`;
- `visible`;
- `metadata`.

The default intent is intentionally read-only:

- `readOnly: true`;
- `controlsEnabled: false`;
- `indicatorId: sma`;
- `sourceSeries: close`;
- `panePlacement: overlay`;
- `inputs: { length: 20 }`;
- `style: { color: #4ea1ff, lineWidth: 2 }`;
- `visible: true`;
- `metadata: null`.

## Boundary Result

The contract is pure domain/contract code. It does not import shell UI,
chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
display-timeframe, settings, session-settings, screenshot-export, orders,
calendar, account, analytics, persistence, V4, vendor, or Lightweight Charts
modules.

The contract does not dispatch commands, subscribe to events, register
commands, calculate indicator values, add chart series, create panes, fetch
data, use browser storage, write chart series, move viewport state, or mutate
replay state.

The top-toolbar Indicators button remains disabled and inert. Undo/redo and
drawing/action-history behavior remain deferred. Dashboard visible row actions
remain Summary, Stats, Copy, and Journal.

## Coverage

`indicators-contract-smoke.js` verifies:

- owner identity, allowed built-in ids, allowed source series, and allowed pane
  placements;
- custom indicators are not in the allowed id list;
- blocked integrations;
- default read-only intent state;
- validation helper behavior;
- contract readiness flags remain disabled for commands, calculation,
  custom definitions, pane creation, persistence, runtime wiring, toolbar
  interactivity, and writes;
- top-toolbar Indicators button remains disabled;
- dashboard visible row-action identity remains unchanged;
- documentation/index registration for this contract.

`boundary-smoke.js` now covers the `indicators` source root and rejects
forbidden feature-runtime imports, command tokens, browser APIs, chart APIs,
series APIs, pane ownership, storage, and network usage.

## Next Step

Step 138 should choose the next bounded workstation/chart slice after the
indicators owner contract. Do not enable Indicators, calculate indicators, write
chart series, create panes, persist values, or add runtime command wiring unless
that exact wiring slice is selected.
