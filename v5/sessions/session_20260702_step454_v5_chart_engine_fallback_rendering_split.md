# Step 454 - V5 Chart Engine Fallback Rendering Split

Status: completed.

Date: 2026-07-02

## Goal

Reduce `chart-engine-presentation.js` ownership pressure by moving DOM fallback
rendering and fallback range helpers into a dedicated module while preserving
the chart engine adapter API.

## Plan

1. Identify DOM fallback rendering responsibilities inside
   `chart-engine-presentation.js`.
2. Extract fallback canvas creation, candle rendering, debug plot rendering, and
   fallback range helpers into a dedicated module.
3. Update fallback and Lightweight adapters to import those helpers from the new
   module.
4. Keep presentation mapping, Lightweight options, and range projection helpers
   in `chart-engine-presentation.js`.
5. Run focused chart-engine and boundary checks.

## Implementation

- Added `src/runtime/chart-engine-fallback-rendering.js`.
- Moved runtime canvas creation, fallback candle rendering, fallback bar-time
  formatting, visible-bar filtering, hidden debug plot rendering, fallback
  visible-range inference, and range span helper into the new module.
- Updated `chart-engine-fallback-adapter.js` and
  `chart-engine-lightweight-adapter.js` imports.
- Kept `createChartEngineAdapter` API unchanged.

## Boundary Notes

- `chart-engine-presentation.js` is now 378 lines, down from 463.
- `chart-engine-fallback-rendering.js` owns DOM fallback/debug plot rendering
  only.
- The new helper does not import runtime commands/events, replay runtime, or
  bar-data runtime.
- The split preserves the existing fallback adapter and Lightweight adapter
  behavior.

## Verification

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 455 can continue chart-engine presentation modularization by splitting
dataset metadata writers or Lightweight options mapping, unless a product bug
takes priority.
