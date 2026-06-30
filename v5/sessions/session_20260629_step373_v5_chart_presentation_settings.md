# Step 373 - V5 Chart Presentation Settings Foundation

## Goal

Establish a small FXReplay-inspired chart presentation settings foundation
without copying the full settings panel or creating V4-style frontend coupling.

The foundation should make time label format, status line fields, chart margins,
right offset, and crosshair readout behavior explicit before later order,
journal, annotation, and axis work depends on scattered display decisions.

## Planned Steps

### Step 373.1 - Spec And Plan

- Add `v5/docs/specs/chart-presentation-settings.md`.
- Update specs index.
- Add Step 373 to `v5/TODO.md`.
- Create this session handoff.

Status: complete.

### Step 373.2 - Contracts And Runtime

- Add presentation settings command/event contracts.
- Add a runtime that owns normalized presentation settings.
- Add smoke coverage proving settings events do not mutate bars/replay state.

Status: complete.

Completed:

- Added chart presentation command/event contracts.
- Added `createChartPresentationRuntime`.
- Registered presentation settings runtime in the V5 app shell.
- Added runtime smoke coverage for defaults, partial updates, reset,
  normalization, event emission, and invalid values.
- Added the runtime smoke to `v5/scripts/smoke_all.js`.

### Step 373.3 - Chart And Status Consumers

- Let chart runtime consume margins, right offset, time format, and crosshair
  readout state.
- Let chart replay status consume status field visibility and time format.
- Preserve chart/runtime ownership boundaries.

Status: complete.

Completed:

- Extended display timestamp formatting with `12h` support.
- Chart runtime now consumes presentation settings for candle title time format,
  margins, right offset, and crosshair readout state.
- Chart runtime subscribes to presentation setting changes and rerenders
  mounted hosts without changing chart bars.
- Chart replay route status now has OHLC/change rows controlled by presentation
  settings.
- Added chart runtime smoke assertions for presentation layout and 12-hour
  chart titles.

### Step 373.4 - UI And Verification

- Add lightweight chart-route controls for key presentation settings.
- Add browser smoke proving presentation changes do not reload bars or alter
  replay state.
- Run full V5 smoke and update this handoff.

Status: complete.

Completed:

- Added lightweight chart-route presentation controls for `24h/12h`, OHLC,
  change, crosshair, compact margins, and right offset.
- Added CSS so presentation controls share the existing compact chart-control
  treatment.
- Added `v5/tests/chart-presentation-browser-smoke.js`.
- Added the browser smoke to `v5/scripts/smoke_all.js`.
- Browser coverage verifies presentation changes update labels/layout while
  replay cursor, display bar count, and `/v4/bars` request count remain
  unchanged.

## Completed

- Added `v5/docs/specs/chart-presentation-settings.md`.
- Added chart presentation command/event contracts.
- Added `createChartPresentationRuntime` and registered it in the V5 app shell.
- Chart runtime now consumes presentation settings for candle title time format,
  chart margins, right offset, and crosshair readout state.
- Chart replay route status now exposes OHLC/change rows controlled by
  presentation settings.
- Added lightweight route controls for the initial presentation settings
  foundation.
- Added runtime, chart runtime, and browser smoke coverage.

## Verified

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Notes For Next Session

Step 373 is complete. Future FXReplay-style settings should extend the
presentation settings schema/runtime instead of adding one-off feature state.
Reasonable next additions are axis formatter wiring, richer crosshair readout,
and persisted user/workspace settings. Avoid template systems and full color
editors until the chart runtime has a real axis/tooltip surface.

## Manual Acceptance

- Presentation settings changes do not request bars.
- Presentation settings changes do not mutate replay cursor.
- Presentation settings changes do not mutate `displayBars`.
- Chart runtime owns chart presentation rendering.
- UI dispatches commands and subscribes to events.
- Time labels continue to use the Step 372 display timezone contract.

## Checks

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
