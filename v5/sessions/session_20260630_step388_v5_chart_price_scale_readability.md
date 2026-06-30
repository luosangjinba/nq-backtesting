# Step 388 - V5 Chart Price Scale Readability

## Goal

Tune Lightweight Charts price scale margins so the initial K-line view has more
natural vertical placement without reimplementing price-axis scaling or breaking
native chart interactions.

This step advances Historical Replay Review. It is a chart
adapter/presentation step, not a replay cursor, replay state, or bar-loading
change.

## Planned Steps

### Step 388.1 - Plan And Specs

- Add Step 388 to `v5/TODO.md`.
- Update chart interaction specs with price scale margin requirements.
- Update Lightweight Charts vendor notes with price scale API guidance.
- Create this session handoff.

Completed:

- Added Step 388 to `v5/TODO.md`.
- Updated `v5/docs/specs/chart-interaction-contracts.md`.
- Updated `v5/docs/vendor/lightweight-charts.md`.
- Created this session handoff.

Status: complete.

### Step 388.2 - Price Scale Margin Mapping

- Derive bounded Lightweight `scaleMargins` from V5 presentation margins.
- Keep the mapping separate from DOM padding.
- Expose margin metadata for smoke/debug assertions.

Completed:

- Added bounded price scale margin derivation in the chart engine adapter.
- Added `data-price-scale-margin-top` and
  `data-price-scale-margin-bottom` metadata on the chart canvas.
- Kept Lightweight DOM padding clear.

Status: complete.

### Step 388.3 - Lightweight Price Scale Application

- Apply margins through `series.priceScale().applyOptions()`.
- Apply during mount, bar updates, and presentation updates.
- Preserve native price-axis drag scaling.

Completed:

- Applied default price scale margins after Lightweight series creation.
- Reapplied price scale margins on bar updates and presentation updates.
- Did not add custom pointer or price-axis scaling logic.

Status: complete.

### Step 388.4 - Verification

- Add adapter smoke coverage for price scale margin application.
- Add browser smoke coverage for default and compact price scale margins.
- Keep native interaction smoke passing.
- Run full V5 smoke and `git diff --check`.

Completed:

- Updated `chart-engine-adapter-smoke.js`.
- Added `chart-price-scale-browser-smoke.js`.
- Added the new smoke to `v5/scripts/smoke_all.js`.
- Ran related checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Initial Lightweight candlestick view uses bounded price scale margins instead
  of leaving excessive empty vertical space.
- Compact presentation updates the series price scale margins without shrinking
  the DOM chart surface.
- Price-axis drag scaling remains Lightweight native behavior.
- Price scale margin changes do not mutate replay cursor, replay `displayBars`,
  or bar-data cache.
- Existing chart navigation, native pan/zoom/crosshair, and presentation
  controls remain command/event driven.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 388 is complete.
- Recommended next step: Step 389 should continue Phase 3 with remaining chart
  readability polish around overlay/time-axis visibility and screenshot-level
  visual acceptance across more viewport sizes.
