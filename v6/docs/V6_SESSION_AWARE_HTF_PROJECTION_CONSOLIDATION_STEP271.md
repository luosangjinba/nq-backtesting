# V6 Session-Aware HTF Projection Consolidation - Step 271

## Purpose

Step 271 consolidates the now-enabled session-aware display timeframe family:
`1D`, `1W`, and `1M`.

The previous enablement steps intentionally landed daily, weekly, and monthly
projection separately. This step reduces the repeated string checks, reload
source-count branches, and browser projection fixtures before more replay or
history work builds on top of them.

## Scope

- Add one pure helper/contract for session-aware display timeframe values.
- Keep `session-calendar` as the owner of day/week/month bucket boundaries.
- Keep `chart-data-projection` as the owner of OHLC aggregation.
- Let shell, pane, and pane-intent reload code share the same normalization
  rule for `1D`, `1W`, and `1M`.
- Consolidate the browser projection smoke fixture for daily, weekly, and
  monthly projection.

## Non-Goals

- Do not add seconds support.
- Do not change replay cursor ownership.
- Do not change chart-engine writes or viewport ownership.
- Do not add journal, order-ticket, prop-firm, or indicator behavior.

## Ownership

- `time-domain` may expose pure display timeframe value helpers.
- `session-calendar` owns trading day/week/month boundaries.
- `chart-data-projection` maps session-aware target values to the corresponding
  `session-calendar` bucket resolver and performs OHLC aggregation.
- `shell` and `pane` modules normalize/format display timeframe values only.
- `pane-intent-reload` estimates source bar windows without issuing bar-data
  requests.

## Acceptance

- `1D`, `1W`, and `1M` share one pure normalization helper.
- Reload source-count estimates for session-aware HTFs flow through one helper.
- `chart-data-projection` uses one target-to-bucket mapping instead of separate
  daily/weekly/monthly condition branches.
- Daily, weekly, and monthly browser projection smokes share one fixture.
- Existing projection, menu, pane, owner, and boundary smokes continue to pass.
