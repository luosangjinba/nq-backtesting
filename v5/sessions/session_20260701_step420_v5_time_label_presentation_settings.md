# V5 Session Handoff - Step 420 Time And Label Presentation Settings

Date: 2026-07-01

## Status

Step 420 is complete.

## Goal

Implement the next pure FXReplay Settings parity slice for time/date label
presentation and existing chart title labels without touching replay or
bar-data ownership.

## Changes

- Added supported chart date formats:
  - `YYYY-MM-DD`;
  - `MMM DD 'YY`;
  - `DD MMM 'YY`.
- Added `showDayOfWeekLabels` presentation state.
- Added `statusTitleMode` presentation state for the existing top-left OHLC
  overlay:
  - symbol + timeframe;
  - symbol only;
  - timeframe only.
- Extended timezone/display formatting helpers so date format and weekday
  labels can be applied without changing canonical timestamps.
- Carried date/day presentation settings through chart runtime display context.
- Applied date/day settings in chart-engine adapter tick labels and fallback
  candle titles.
- Added Settings controls:
  - `Scales and lines` -> `Date format`;
  - `Scales and lines` -> `Day of week on labels`;
  - `Status line` -> `Title mode`.
- Preserved Settings draft semantics: changes remain route-local until `Ok`.
- Updated runtime, adapter, browser, display-context, and timezone smokes.
- Updated chart presentation spec, TODO, and handoff indexes.

## Invariants

- Date format and weekday settings are display-only.
- Label changes do not mutate canonical timestamps, replay cursor, display
  bars, request ranges, bar-cache keys, or loaded windows.
- UI dispatches Settings commands and does not call chart-engine APIs directly.
- Chart runtime and chart-engine adapter remain the only path for applying chart
  presentation.
- Replay runtime remains the only owner of replay cursor and reveal state.
- Bar data runtime remains the only owner of `/v4/bars` requests and cache.
- The chart route still exposes one active pane: `primary`.

## Non-Goals

- No price-scale mode/placement implementation.
- No countdown, watermark, or session-break implementation.
- No previous-day-close/high-low label implementation.
- No template persistence system.
- No split-pane or pane-specific settings work.

## Verification

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidate

Step 421 - Advanced Chart-Engine Settings.
