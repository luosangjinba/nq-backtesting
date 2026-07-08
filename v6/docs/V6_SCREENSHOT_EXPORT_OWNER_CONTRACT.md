# V6 Screenshot/Export Owner Contract

Date: 2026-07-07

## Outcome

Step 135 establishes the screenshot/export owner contract without enabling the
top-toolbar Screenshot button.

The accepted shape is:

- `v6/src/screenshot-export/screenshot-export-contract.js` owns the
  screenshot/export contract surface;
- owner identity is `screenshot-export-runtime`;
- explicit request fields are source surface, format, filename, dimensions,
  background, and metadata;
- supported formats are `png` and `jpeg`;
- supported source surfaces are `workstation` and `chart`;
- default export intent state is read-only and keeps toolbar controls disabled;
- validation helpers cover supported surfaces, supported formats, non-empty
  filenames, optional positive dimensions, background, and metadata shape;
- screenshot capture, canvas reads, downloads, file writes, browser storage,
  persistence, and runtime command wiring remain deferred.

## Contract Fields

The contract exposes these fields:

- `sourceSurface`;
- `format`;
- `filename`;
- `width`;
- `height`;
- `background`;
- `metadata`.

The default intent is intentionally read-only:

- `readOnly: true`;
- `controlsEnabled: false`;
- `sourceSurface: workstation`;
- `format: png`;
- `filename: v6-workstation`;
- `width: null`;
- `height: null`;
- `background: transparent`;
- `metadata: null`.

## Boundary Result

The contract is pure domain/contract code. It does not import shell UI,
chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
display-timeframe, settings, session-settings, orders, calendar, account,
analytics, persistence, V4, vendor, or Lightweight Charts modules.

The contract does not dispatch commands, subscribe to events, register
commands, capture screenshots, read canvases, create object URLs, fetch data,
use browser storage, write chart series, move viewport state, or mutate replay
state.

The top-toolbar Screenshot button remains disabled and inert. Dashboard visible
row actions remain Summary, Stats, Copy, and Journal.

## Coverage

`screenshot-export-contract-smoke.js` verifies:

- owner identity, allowed fields, allowed formats, and allowed source surfaces;
- blocked integrations;
- default read-only intent state;
- validation helper behavior;
- contract readiness flags remain disabled for commands, persistence, runtime
  wiring, toolbar interactivity, and writes;
- top-toolbar Screenshot button remains disabled;
- dashboard visible row-action identity remains unchanged;
- documentation/index registration for this contract.

`boundary-smoke.js` now covers the `screenshot-export` source root and rejects
forbidden feature-runtime imports, command tokens, browser APIs, chart APIs,
capture APIs, storage, and network usage.

## Next Step

Step 136 should choose the next bounded workstation/chart slice after the
screenshot/export owner contract. Do not enable the Screenshot button, capture
screenshots, read canvases, create downloads, persist values, or add runtime
command wiring unless that exact wiring slice is selected.
