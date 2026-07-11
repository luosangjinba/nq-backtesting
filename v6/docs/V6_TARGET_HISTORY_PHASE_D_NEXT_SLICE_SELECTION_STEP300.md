# V6 Step 300 - Target-History Phase D Next Slice Selection

Date: 2026-07-10

## Decision

The next target-history Phase D slice is **`1D` fallback browser coverage**.

## Basis

The Step 299 pack now covers:

- fixed-duration target-history success;
- fixed-duration target-history fallback;
- daily target-history request sizing success.

The remaining daily safety gap is fallback behavior when daily target bars are
missing or empty. Covering that before `1W`/`1M` keeps session-aware expansion
incremental and preserves the current target-history safety net.

Step 300 adds a pure selector:

- `selectTargetHistoryPhaseDSlice`

With daily success packed and fixed success/fallback packed, the selector
chooses:

- `daily-fallback-browser-coverage`

## Rejected For Now

- **`1W` request-sizing selection/audit:** useful later, but daily fallback
  should be browser-covered first.
- **Display-history responsiveness audit:** valuable, but less immediate than
  completing daily success/fallback coverage.
- **Runtime changes:** no runtime change is needed for a selection step.

## Next

Step 301 should add a focused `1D` target-history fallback browser smoke. It
should force the daily target-bars path to return empty, assert fallback to
source-window projection, preserve source bars for `1m` round trips, and keep
target bars loaded through bar-data commands.

## Verification

- `node v6/tests/target-history-phase-d-selection-step300-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`
