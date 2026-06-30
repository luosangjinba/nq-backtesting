# Step 386 - V5 Chart Display Usability

## Goal

Make the main Lightweight chart readable after the native interaction fix by
correcting time-axis labels and restoring usable chart height without changing
runtime ownership boundaries.

This step advances Historical Replay Review. It is a display/layout usability
step, not a replay state, cursor, or bar-loading change.

## Planned Steps

### Step 386.1 - Plan And Specs

- Add Step 386 to `v5/TODO.md`.
- Update chart interaction specs with display usability rules.
- Update Lightweight Charts vendor notes with local formatter/layout guidance.
- Create this session handoff.

Completed:

- Added Step 386 to `v5/TODO.md`.
- Updated `v5/docs/specs/chart-interaction-contracts.md`.
- Updated `v5/docs/vendor/lightweight-charts.md`.
- Created this session handoff.

Status: complete.

### Step 386.2 - Time Axis Readability

- Add a Lightweight `timeScale.tickMarkFormatter`.
- Use V5 display timezone/time-format context for tick labels.
- Avoid repeated day-only labels on intraday replay charts.

Completed:

- Added a Lightweight tick formatter in the chart engine adapter.
- Intraday ticks now render compact time labels such as `09:30`.
- Midnight/day-boundary ticks render compact date labels such as `06-01`.

Status: complete.

### Step 386.3 - Main Chart Height

- Stop applying fallback DOM canvas padding to Lightweight chart surfaces.
- Keep presentation metadata available without shrinking the engine surface.
- Give the chart viewport a stable viewport-relative height.

Completed:

- Separated Lightweight presentation metadata from fallback canvas padding.
- Cleared Lightweight canvas padding/right padding so the engine surface fills
  the chart box.
- Increased the chart viewport and host to stable viewport-relative dimensions.

Status: complete.

### Step 386.4 - Verification

- Add browser smoke coverage for time-axis labels and chart dimensions.
- Keep Step 385 native interaction coverage passing.
- Run related checks, full V5 smoke, and `git diff --check`.

Completed:

- Added `chart-display-usability-browser-smoke.js`.
- Updated adapter and presentation smoke coverage for the new formatter/layout
  rules.
- Ran related checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Intraday Lightweight time-axis ticks are distinguishable, for example
  `09:30`, rather than repeated day-only `1` labels.
- Midnight/day-boundary ticks may show compact dates such as `06-01`.
- The main chart host/canvas/surface retains a usable height on desktop and is
  not compressed by presentation padding.
- Chart navigation controls remain available as an overlay and do not take
  layout height away from the main chart.
- Step 385 native wheel zoom, pressed-mouse pan, price-axis scaling, and
  crosshair ownership remain intact.
- UI, chart runtime, replay runtime, and bar-data runtime ownership boundaries
  remain intact.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 386 is complete.
- Recommended next step: Step 387 should consolidate replay toolbar/status
  layout into a denser workstation surface now that native interaction and main
  chart readability are stable.
