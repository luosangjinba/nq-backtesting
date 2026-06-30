# Step 385 - V5 Lightweight Native Interaction Fix

## Goal

Fix the K-line chart's mouse interaction path so Lightweight Charts native
wheel zoom, pressed-mouse pan, price-axis scaling, and crosshair behavior work
without V5 fighting the chart engine.

This step advances Historical Replay Review by making chart interaction usable
enough for replay study. It is a bug-fix/performance step, not a new product
feature.

## Planned Steps

### Step 385.1 - Plan And Vendor Docs

- Add Step 385 to `v5/TODO.md`.
- Add Lightweight Charts vendor notes with official API links and V5 usage
  rules.
- Update chart interaction specs with native interaction performance rules.
- Create this session handoff.

Completed:

- Added Step 385 to `v5/TODO.md`.
- Added `v5/docs/vendor/lightweight-charts.md`.
- Updated chart interaction specs with native interaction performance rules.
- Created this session handoff.

Status: complete.

### Step 385.2 - Native Interaction Boundary

- Let Lightweight Charts own wheel zoom, pressed mouse pan, price-axis scaling,
  and crosshair pointer behavior.
- Observe native visible-range changes without calling `setData()` on every
  interaction frame.
- Clamp only when native range exceeds the replay right-edge limit.

Completed:

- Added a chart-runtime native visible-range observation path.
- Lightweight native visible-range changes now update chart-owned interaction
  state without rerendering bars.
- Out-of-bounds future movement is clamped back to the replay right-edge limit.

Status: complete.

### Step 385.3 - Crosshair And Grid Cleanup

- Remove duplicate canvas mousemove crosshair handling in Lightweight mode.
- Throttle or dedupe high-frequency crosshair readout updates.
- Explicitly style grid and crosshair lines so default bright white lines do not
  dominate the chart.

Completed:

- Removed the duplicate canvas `mousemove` crosshair shim in Lightweight mode.
- Crosshair events are now scheduled/deduped before reaching route DOM.
- Added explicit Lightweight grid and crosshair styling.

Status: complete.

### Step 385.4 - Verification

- Add or update browser smoke coverage for native wheel/pan behavior.
- Prove native visible-range movement does not create a `setData` storm.
- Run relevant checks, full V5 smoke, and `git diff --check`.

Completed:

- Added `chart-native-interaction-browser-smoke.js`.
- Updated adapter/runtime/crosshair smoke coverage for throttled native
  interaction.
- Ran relevant checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- Wheel over the chart zooms the time axis through Lightweight Charts native
  behavior.
- Left-button drag over the chart pans horizontally through Lightweight Charts
  native behavior.
- Left-button drag on the price axis keeps native vertical scaling behavior.
- Native pan/zoom does not repeatedly call `series.setData()`.
- Replay right-edge/no-future clamping still prevents scrolling into unrevealed
  future bars.
- Crosshair readout remains functional without duplicate canvas mousemove
  handlers.
- Grid/crosshair lines are subdued and no unexpected bright white solid lines
  dominate the chart.
- UI, chart runtime, replay runtime, and bar-data runtime ownership boundaries
  remain intact.

## Checks

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 385 is complete.
- This step intentionally supersedes replay toolbar layout work because native
  K-line interaction correctness is a higher-priority Phase 3 gate.
- Recommended next step: Step 386 should consolidate replay toolbar layout and
  interaction-control ergonomics after the native chart interaction fix.
