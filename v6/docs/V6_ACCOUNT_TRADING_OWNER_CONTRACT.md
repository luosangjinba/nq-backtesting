# V6 Account/Trading Owner Contract

Date: 2026-07-07

## Outcome

Step 141 establishes the account/trading owner contract without enabling the
bottom account/trading chrome.

The accepted shape is:

- `v6/src/account-trading/account-trading-contract.js` owns the
  account/trading contract surface;
- owner identity is `account-trading-runtime`;
- explicit account readout fields are account id, balance, available balance,
  equity, realized PnL, unrealized PnL, margin, currency, and metadata;
- explicit trade draft fields are side, symbol, quantity, order type, price,
  stop loss, take profit, time in force, session id, and metadata;
- supported trade sides are `buy` and `sell`;
- supported order types are `market`, `limit`, and `stop`;
- supported time-in-force values are `day` and `gtc`;
- default account/trading intent state is read-only and keeps bottom chrome
  controls disabled;
- validation helpers cover account readout shape, trade draft shape, supported
  sides, supported order types, supported time-in-force values, numbers,
  symbols, currency, session id, and metadata shape;
- order placement, position mutation, account mutation, trading analytics,
  chart overlays, replay mutation, bar requests, browser storage, persistence,
  and runtime command wiring remain deferred.

## Contract Fields

The account readout contract exposes these fields:

- `accountId`;
- `balance`;
- `availableBalance`;
- `equity`;
- `realizedPnl`;
- `unrealizedPnl`;
- `margin`;
- `currency`;
- `metadata`.

The trade draft contract exposes these fields:

- `side`;
- `symbol`;
- `quantity`;
- `orderType`;
- `price`;
- `stopLoss`;
- `takeProfit`;
- `timeInForce`;
- `sessionId`;
- `metadata`.

The default account/trading intent is intentionally read-only:

- `readOnly: true`;
- `controlsEnabled: false`;
- `analyticsEnabled: false`;
- account readout defaults to placeholder values with `currency: USD`;
- trade draft defaults to `side: buy`, `symbol: NQ`, `quantity: 1`,
  `orderType: market`, and `timeInForce: day`.

## Boundary Result

The contract is pure domain/contract code. It does not import shell UI,
chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
display-timeframe, drawing/action-history, indicators, settings,
session-settings, screenshot-export, orders, calendar, account, analytics,
persistence, V4, vendor, or Lightweight Charts modules.

The account/trading contract remains distinct from the existing
`orders-runtime` dashboard row-action contract. It does not bridge to orders,
place orders, mutate positions, mutate account balances, calculate analytics,
create chart overlays, write chart series, request bars, move viewport state,
or mutate replay state.

Lightweight Charts supports custom series and primitives for rendered visual
features, but this step does not use those APIs. Future chart-visible trading
annotations must be selected as a separate chart-engine/drawing owner slice.

The bottom Buy, Sell, quantity, and Analytics controls remain disabled and
inert. Account balance and PnL readouts remain placeholders in the shell.
Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Coverage

`account-trading-contract-smoke.js` verifies:

- owner identity, account readout fields, trade draft fields, supported sides,
  supported order types, and supported time-in-force values;
- blocked integrations;
- default read-only account/trading intent state;
- validation helper behavior;
- contract readiness flags remain disabled for command surface, bottom chrome
  controls, order placement, position mutation, account mutation, analytics,
  persistence, runtime wiring, orders runtime bridging, and writes;
- bottom account/trading chrome controls remain disabled and readouts remain
  placeholders;
- dashboard visible row-action identity remains unchanged;
- documentation/index registration for this contract.

`boundary-smoke.js` now covers the `account-trading` source root and rejects
forbidden feature-runtime imports, command tokens, browser APIs, chart APIs,
series APIs, order-placement tokens, account/order runtime ownership, storage,
and network usage.

## Next Step

Step 142 should choose the next bounded workstation/chart slice after the
account/trading owner contract. Do not enable bottom trading controls, place
orders, mutate positions, mutate account balances, calculate analytics, create
chart overlays, persist account/trade state, or add runtime command wiring
unless that exact wiring slice is selected.
