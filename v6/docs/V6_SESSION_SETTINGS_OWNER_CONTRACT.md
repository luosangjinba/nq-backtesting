# V6 Session Settings Owner Contract

Date: 2026-07-07

## Outcome

Step 133 establishes the session-settings owner contract without enabling the
right-rail Session settings panel.

The accepted shape is:

- `v6/src/session-settings/session-settings-contract.js` owns the
  session-settings contract surface;
- owner identity is `session-settings-runtime`;
- explicit field groups are Session Info, Balance & Assets, Spreads &
  Commissions, and Date Range;
- default draft state is read-only and keeps panel controls disabled;
- validation helpers cover required text fields, non-negative numeric fields,
  optional date parsing, and start-before-end date ranges;
- persistence, runtime command wiring, and panel interactivity remain deferred.

## Contract Fields

The contract exposes these fields:

- Session Info: `name`, `profileId`;
- Balance & Assets: `balance`, `asset`;
- Spreads & Commissions: `spread`, `commission`;
- Date Range: `startTime`, `endTime`.

The default draft is intentionally read-only:

- `readOnly: true`;
- `controlsEnabled: false`;
- `balance: null`;
- `spread: 0`;
- `commission: 0`;
- `startTime: null`;
- `endTime: null`.

## Boundary Result

The contract is pure domain/contract code. It does not import shell UI,
chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
display-timeframe, settings, orders, calendar, account, analytics, persistence,
V4, vendor, or Lightweight Charts modules.

The contract does not dispatch commands, subscribe to events, register
commands, fetch data, use browser storage, write chart series, move viewport
state, or mutate replay state.

The right-rail Session settings panel remains a disabled shell-owned
placeholder. Chart Settings and Session settings remain distinct surfaces.
Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Coverage

`session-settings-contract-smoke.js` verifies:

- owner identity and explicit field groups;
- allowed fields and blocked integrations;
- default read-only draft state;
- validation helper behavior;
- contract readiness flags remain disabled for commands, persistence, runtime
  wiring, and writes;
- Session settings panel controls remain disabled;
- dashboard visible row-action identity remains unchanged;
- documentation/index registration for this contract.

`boundary-smoke.js` now covers the `session-settings` source root and rejects
forbidden feature-runtime imports, command tokens, browser APIs, chart APIs, and
storage/network usage.

## Next Step

Step 134 should choose the next bounded workstation/chart slice after the
session-settings owner contract. Do not enable Session settings panel controls,
persist values, or add runtime command wiring unless that exact wiring slice is
selected.
