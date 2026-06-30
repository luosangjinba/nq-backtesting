# Step 381 - V5 Crosshair Readout And Inspection

## Goal

Add chart-owned crosshair readout and time/price inspection so users can inspect
replay bars without giving UI, replay, or bar-data modules ownership of chart
internals.

This step advances Historical Replay Review: after Step 380 made the real chart
engine interaction defaults stable, Step 381 adds the first inspection readout
needed for deliberate replay review.

## Planned Steps

### Step 381.1 - Plan

- Add Step 381 to `v5/TODO.md`.
- Update presentation and chart-engine specs with chart-owned crosshair readout
  rules.
- Create this session handoff.

Status: complete.

### Step 381.2 - Adapter Crosshair Events

- Add adapter callbacks for DOM fallback hover.
- Add adapter callbacks for Lightweight `subscribeCrosshairMove` events.
- Normalize adapter output to V5 chart-domain data.
- Keep engine-specific objects behind `chart-engine-adapter.js`.

Completed:

- Added DOM fallback hover readout normalized to V5 chart-domain data.
- Added Lightweight `subscribeCrosshairMove` support behind the adapter.
- Added a shell hover readout path for the normal Lightweight browser route so
  headless/browser smoke can verify the chart-owned readout without depending
  on engine hit-testing internals.

Status: complete.

### Step 381.3 - Chart Runtime Crosshair State

- Add chart-runtime crosshair state and readback command.
- Emit crosshair changes as chart events.
- Prove crosshair movement does not mutate replay cursor, display bars, visible
  range, follow state, or bar cache.

Completed:

- Added chart-runtime crosshair state.
- Added `chart:crosshairChanged` events.
- Added `chart.getCrosshairState` readback.
- Preserved replay cursor, display bars, visible range, follow state, and bar
  cache during crosshair movement.

Status: complete.

### Step 381.4 - Route Readout

- Render a compact crosshair readout in the chart route.
- Subscribe to chart crosshair events.
- Respect `showCrosshairReadout` presentation settings.
- Keep route behavior command/event-driven.

Completed:

- Added a compact Inspect readout to the chart route.
- Subscribed to chart crosshair events.
- Wired the readout to `showCrosshairReadout` presentation settings.

Status: complete.

### Step 381.5 - Verification And Closeout

- Add or update adapter/runtime/browser smoke coverage.
- Run relevant checks, full V5 smoke, and `git diff --check`.
- Update TODO and this handoff.
- Commit.

Completed:

- Extended adapter and runtime adapter smoke coverage.
- Added `chart-crosshair-browser-smoke.js`.
- Added the new browser smoke to `v5/scripts/smoke_all.js`.
- Ran relevant checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Moving the chart crosshair updates a visible time/price/OHLC readout.
- Crosshair readout obeys the `showCrosshairReadout` presentation setting.
- Crosshair movement does not request bars, mutate replay cursor, mutate
  `displayBars`, or change visible range/follow state.
- Lightweight engine crosshair events remain behind the chart-engine adapter.
- DOM fallback keeps deterministic hover/readout coverage for runtime tests.
- Axis labels, tooltip polish, go-to time, order, journal, dashboard, AI, SaaS
  auth, billing, and production packaging remain out of scope.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 381 is complete.
- Crosshair inspection state is chart-owned and exposed through chart
  commands/events.
- The route displays a compact Inspect readout and honors the Crosshair
  presentation toggle.
- Lightweight engine crosshair APIs remain behind `chart-engine-adapter.js`.
- Recommended next step: Step 382 should continue Phase 3 with axis/tooltip
  formatting polish before go-to time, orders, journal, dashboard, AI, or SaaS
  work.
