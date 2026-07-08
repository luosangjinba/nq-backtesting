# V6 Drawing/Action-History Owner Contract

Date: 2026-07-07

## Outcome

Step 139 establishes the drawing/action-history owner contract without enabling
the left drawing rail or top-toolbar undo/redo controls.

The accepted shape is:

- `v6/src/drawing-action-history/drawing-action-history-contract.js` owns the
  drawing/action-history contract surface;
- owner identity is `drawing-action-history-runtime`;
- supported built-in drawing tool ids are `cursor`, `trend-line`,
  `horizontal-line`, `rectangle`, `measure`, and `text`;
- explicit drawing fields are tool id, anchor points, target pane, style,
  label, visibility, and metadata;
- explicit action-history fields are action id, action type, target, timestamp,
  and metadata;
- supported action types are `create-drawing`, `update-drawing`, and
  `delete-drawing`;
- default drawing intent state is read-only and keeps drawing controls disabled;
- validation helpers cover supported tool ids, anchor-point shape, target pane,
  style, label, visibility, and metadata shape;
- drawing creation, chart overlays, pane mutation, undo/redo execution, browser
  storage, persistence, and runtime command wiring remain deferred.

## Contract Fields

The drawing contract exposes these fields:

- `toolId`;
- `anchorPoints`;
- `targetPane`;
- `style`;
- `label`;
- `visible`;
- `metadata`.

The action-history contract exposes these fields:

- `actionId`;
- `actionType`;
- `target`;
- `timestamp`;
- `metadata`.

The default drawing intent is intentionally read-only:

- `readOnly: true`;
- `controlsEnabled: false`;
- `toolId: cursor`;
- `anchorPoints: []`;
- `targetPane: main`;
- `style: { color: #f5c542, lineWidth: 1 }`;
- `label: ""`;
- `visible: true`;
- `metadata: null`.

## Boundary Result

The contract is pure domain/contract code. It does not import shell UI,
chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
display-timeframe, indicators, settings, session-settings, screenshot-export,
orders, calendar, account, analytics, persistence, V4, vendor, or Lightweight
Charts modules.

The contract does not dispatch commands, subscribe to events, register
commands, create drawings, write overlays, create panes, execute undo/redo,
fetch data, use browser storage, write chart series, move viewport state, or
mutate replay state.

The left drawing rail remains disabled and inert. The top-toolbar undo/redo
controls remain disabled and inert. Dashboard visible row actions remain
Summary, Stats, Copy, and Journal.

## Coverage

`drawing-action-history-contract-smoke.js` verifies:

- owner identity, allowed drawing tool ids, allowed drawing fields, allowed
  action-history fields, and allowed action types;
- blocked integrations;
- default read-only drawing intent state;
- validation helper behavior;
- contract readiness flags remain disabled for command surface, drawing
  creation, overlays, pane mutation, action history, persistence, runtime
  wiring, rail controls, undo/redo, and writes;
- left drawing rail and top-toolbar undo/redo controls remain disabled;
- dashboard visible row-action identity remains unchanged;
- documentation/index registration for this contract.

`boundary-smoke.js` now covers the `drawing-action-history` source root and
rejects forbidden feature-runtime imports, command tokens, browser APIs, chart
APIs, series APIs, overlay/pane ownership, storage, and network usage.

## Next Step

Step 140 should choose the next bounded workstation/chart slice after the
drawing/action-history owner contract. Do not enable drawing tools, create chart
overlays, mutate panes, execute undo/redo, persist drawings, or add runtime
command wiring unless that exact wiring slice is selected.
