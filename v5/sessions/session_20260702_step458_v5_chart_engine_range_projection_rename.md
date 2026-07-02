# Step 458 - V5 Chart Engine Range Projection Rename

Status: completed.

Date: 2026-07-02

## Goal

Make the remaining `chart-engine-presentation.js` ownership explicit by
renaming it to a range-projection module after Step 457 removed Lightweight
option mapping.

## Plan

1. Rename the remaining range projection helper module.
2. Update Lightweight adapter imports to use the renamed module.
3. Update boundary smoke tracked module paths.
4. Update TODO and session handoff documentation.
5. Run focused chart-engine and boundary checks.

## Implementation

- Renamed `src/runtime/chart-engine-presentation.js` to
  `src/runtime/chart-engine-range-projection.js`.
- Updated `chart-engine-lightweight-adapter.js` to import
  `followLogicalRangeForBars`, `manualLogicalRangeForVisibleRange`, and
  `visibleRangeWithLogicalWhitespace` from the renamed module.
- Updated chart-engine boundary smoke tracking to use the renamed file.

## Boundary Notes

- `chart-engine-range-projection.js` owns only follow/manual visible-logical
  range projection and logical-whitespace expansion.
- Lightweight option mapping remains in `chart-engine-lightweight-options.js`.
- New chart presentation settings should not be added to the range-projection
  module.
- `createChartEngineAdapter` public API is unchanged.

## Verification

- `node --check v5/src/runtime/chart-engine-range-projection.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 459 should pause broad chart-engine refactoring and pick the next verified
product issue from manual replay use, unless a concrete file-size hotspot
reappears in the current code audit.
