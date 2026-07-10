# V6 Minute/Hour Timeframe Unlock - Step 265

## Purpose

Step 265 unlocks the visible minute/hour display timeframes that are safe to
project from the current 1m source data.

This step consumes the Step 264 display-timeframe capability registry. It does
not add second-level source data and does not unlock daily, weekly, or monthly
aggregation.

## Scope

Enable:

- minutes: `2m`, `3m`, `4m`, `10m`, `30m`;
- hours: `1h`, `2h`, `4h`, `8h`, `12h`.

Keep enabled:

- `1m`, `5m`, `15m`.

Keep hidden:

- seconds: `1s`, `5s`, `10s`, `15s`, `30s`.

Keep planned/disabled:

- `1D`, `1W`, `1M`.

## Ownership

- `display-timeframe` owns capability status and menu eligibility.
- `chart-data-projection` remains the only owner that aggregates 1m source bars
  into display bars.
- `replay` remains source-bar driven.
- `bar-data` remains source loading/cache owner.
- `shell` renders capability state and dispatches display timeframe commands; it
  must not implement projection rules.

## Required Proof

- Projection domain handles all Step 265 minute/hour targets through the shared
  minute-bucket helper.
- The top interval menu exposes all enabled Step 265 minute/hour targets.
- Planned daily/weekly/monthly entries remain disabled.
- Seconds remain hidden.
- Existing `5m` browser behavior continues to pass.
- A browser smoke proves at least one new minute interval and one new hour
  interval can be applied without changing ownership.

## Non-Goals

- No seconds support.
- No custom interval parser.
- No `1D`, `1W`, or `1M` aggregation.
- No trading simulation, order-ticket, prop-firm, indicator, or journal behavior.
