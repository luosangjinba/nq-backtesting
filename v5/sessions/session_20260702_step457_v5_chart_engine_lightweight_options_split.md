# Step 457 - V5 Chart Engine Lightweight Options Split

Status: completed.

Date: 2026-07-02

## Goal

Reduce `chart-engine-presentation.js` to range projection by moving
Lightweight-specific option mapping into a dedicated module while preserving
adapter behavior and public API.

## Plan

1. Identify Lightweight option mapping inside `chart-engine-presentation.js`.
2. Extract constants, option builders, series/watermark mapping, price-scale
   margins, and tick formatting into a dedicated options module.
3. Update Lightweight adapter imports so options and range projection have
   separate owners.
4. Update DOM metadata imports so it reuses the same Lightweight constants and
   margin helper.
5. Run focused chart-engine and boundary checks.

## Implementation

- Added `src/runtime/chart-engine-lightweight-options.js`.
- Moved Lightweight replay constants, grid/crosshair options, chart options,
  series options, watermark options, price-scale margins, and Lightweight tick
  formatting into the new module.
- Updated `chart-engine-lightweight-adapter.js` to import options from the new
  module and range projection from `chart-engine-presentation.js`.
- Updated `chart-engine-dom-metadata.js` to import Lightweight constants and
  price-scale margins from the new options module.

## Boundary Notes

- `chart-engine-presentation.js` is now 52 lines, down from 274 after Step 455
  and 463 at the Step 451 audit.
- `chart-engine-lightweight-options.js` owns Lightweight option mapping.
- `chart-engine-presentation.js` now only owns visible/logical range projection
  until it is renamed to a range-projection module.
- `createChartEngineAdapter` API is unchanged.

## Verification

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 458 can rename `chart-engine-presentation.js` to a range-projection module,
or pause refactoring and pick the next verified product issue from manual
replay use.
