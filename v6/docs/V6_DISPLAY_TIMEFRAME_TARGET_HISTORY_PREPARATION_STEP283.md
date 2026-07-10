# V6 Step 283 - Display-Timeframe Target History Preparation

Date: 2026-07-10

## Decision

Step 283 prepares the display/history target-bars path without changing the
default display-timeframe or leftward-history runtime behavior.

The new owner boundary is a small display-timeframe planning helper. It decides
whether a pane/display timeframe may opt into target bars and produces a
bar-data target command payload. It does not call the target bars API and does
not mutate chart data.

## Implemented

- Added `v6/src/display-timeframe/display-timeframe-target-history-plan.js`.
- The helper defaults to disabled.
- When enabled, high target timeframes such as `8h` and `1D` plan
  `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`.
- The helper uses canonical target timeframe ids from
  `v6/src/time-domain/target-timeframe-domain.js`.
- Added static coverage proving current display-timeframe and leftward-history
  runtimes do not directly call the target bars adapter and do not use target
  bar-data commands by default.

## Preserved Behavior

- Display-timeframe runtime still projects from preserved source bars.
- Applying `5m` and switching back to `1m` still uses source bars.
- Chart-history leftward extension still uses source-bar windows and frontend
  projection fallback.
- Replay remains source `1m` driven.
- Chart viewport, chart-engine, chart-data, journal, order-ticket, prop-firm,
  indicator, and seconds behavior are unchanged.

## Verification

- `node v6/tests/display-target-history-plan-step283-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 284 should implement the first **controlled target-history opt-in runtime
path**. Prefer a narrow display-timeframe preparation path that can load target
bars through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`, replace display bars, and
preserve source bars for round trips, while keeping frontend projection as the
fallback.
