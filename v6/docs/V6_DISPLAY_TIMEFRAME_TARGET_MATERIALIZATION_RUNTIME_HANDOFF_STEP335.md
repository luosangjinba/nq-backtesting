# V6 Display-Timeframe Target Materialization Runtime Handoff - Step 335

## Status

Accepted.

## Outcome

Step 335 implements the first bounded
`display-timeframe-target-materialization-runtime-handoff` wiring slice inside
Display-Timeframe Runtime.

New helper modules:

- `v6/src/display-timeframe/display-timeframe-target-materialization-handoff.js`
- `v6/src/materialization/target-bar-reveal-policy.js`

New coverage:

- `v6/tests/display-timeframe-target-materialization-handoff-step335-smoke.js`
- `v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js`
- `v6/tests/display-timeframe-target-materialization-runtime-boundary-step335-static-smoke.js`

## Runtime Handoff

Display-Timeframe Runtime now follows the Step 334 owner sequence for
target-history display materialization:

1. read source cursor state through `replay.getState`;
2. preserve source bars through `chartData.getSourceBars`;
3. plan the target window through `barData.planTargetWindow`;
4. load target bars through `barData.loadTargetWindow`;
5. resolve target-bar visibility through the source-cursor reveal policy;
6. apply visible target bars through `chartData.replaceBars` with
   `preserveSource: true`;
7. keep viewport ownership on the existing chart-data revision path.

If source cursor state is unavailable, target bars are not requested and the
runtime falls back to source projection.

## Boundary

This step keeps replay source `1m` as cursor authority. Target bars are display
materialization inputs only.

The handoff does not call replay cursor mutation commands, does not mutate
viewport intent directly, does not write chart-engine APIs, and does not change
target-history request sizing or chart-history fast-path scheduling.

## Verification

- `node v6/tests/display-timeframe-target-materialization-handoff-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-boundary-step335-static-smoke.js`
- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 336 should verify the runtime handoff in browser-visible flows and
remeasure high-timeframe target materialization responsiveness. Focus on `8h`,
`1D`, and `1W`, source preservation when switching back to `1m`, and fallback
behavior when target data is unavailable.
