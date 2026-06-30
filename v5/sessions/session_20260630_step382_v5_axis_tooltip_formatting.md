# Step 382 - V5 Axis And Tooltip Formatting Polish

## Goal

Make chart inspection formatting consistent across status text, crosshair
readout, candle titles, and the real chart engine without changing replay
identity, bar loading, or chart ownership boundaries.

This step advances Historical Replay Review: after Step 381 added chart-owned
inspection, Step 382 makes the values readable and consistent enough for
deliberate replay review.

## Planned Steps

### Step 382.1 - Plan

- Add Step 382 to `v5/TODO.md`.
- Update presentation specs with chart formatting ownership rules.
- Create this session handoff.

Status: complete.

### Step 382.2 - Shared Formatting Helpers

- Add shared helpers for price, OHLC, change, and compact inspection text.
- Keep canonical time formatting delegated to the display timezone helpers.
- Keep formatting helpers pure and UI/runtime independent.

Completed:

- Added `v5/src/domain/chart-formatting.js`.
- Added pure helpers for price, OHLC, change, candle title, and inspection
  readout formatting.
- Kept timestamp formatting delegated to the display timezone helpers.

Status: complete.

### Step 382.3 - Route And Adapter Formatting

- Apply helpers to chart route status text and crosshair readout.
- Apply helpers to adapter candle titles and fallback/debug candle labels.
- Preserve the `showCrosshairReadout`, `showStatusOhlc`, and `showStatusChange`
  presentation settings.

Completed:

- Applied shared formatting to chart route OHLC, Change, and Inspect readout.
- Applied shared formatting to adapter candle titles, including fallback/debug
  labels.
- Added CSS constraints so the Inspect readout cannot push the status layout
  wider than its container.

Status: complete.

### Step 382.4 - Lightweight Formatting Defaults

- Add adapter-owned Lightweight localization/price formatting defaults.
- Keep Lightweight API usage behind `chart-engine-adapter.js`.
- Do not introduce full settings templates or production packaging changes.

Completed:

- Added adapter-owned Lightweight price formatter localization.
- Added adapter-owned candlestick series `priceFormat` defaults.
- Kept all Lightweight API usage behind `chart-engine-adapter.js`.

Status: complete.

### Step 382.5 - Verification And Closeout

- Add or update runtime/browser smoke coverage.
- Run relevant checks, full V5 smoke, and `git diff --check`.
- Update TODO and this handoff.
- Commit.

Completed:

- Added `chart-formatting-smoke.js`.
- Extended adapter smoke coverage for localization and `priceFormat`.
- Updated existing chart title assertions to the shared price format.
- Ran relevant checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Status OHLC, Change, candle titles, and crosshair inspection use consistent
  price precision and signs.
- Display timezone and 12h/24h settings still affect all visible time labels.
- Formatting changes do not request bars, mutate replay cursor, mutate
  `displayBars`, or change visible range/follow state.
- Lightweight formatting options remain inside `chart-engine-adapter.js`.
- Go-to time, orders, journal, dashboard, AI, SaaS auth, billing, and full
  settings templates remain out of scope.

## Checks

- `node v5/tests/chart-formatting-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 382 is complete.
- Status OHLC, Change, candle titles, and Inspect readout now share consistent
  price formatting.
- Lightweight localization/price formatting remains adapter-owned.
- Recommended next step: Step 383 should continue Phase 3 with go-to time /
  jump-to-cursor navigation before orders, journal, dashboard, AI, or SaaS work.
