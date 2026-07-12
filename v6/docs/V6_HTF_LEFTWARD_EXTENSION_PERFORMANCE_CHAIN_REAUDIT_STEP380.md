# Step 380 - HTF Leftward Extension Performance Chain Re-audit

Status

Accepted.

## Scope

This is a closeout and selection audit for the HTF leftward-extension latency
chain from Steps 367-379.

No runtime behavior changed in this step. It does not modify `v6/src/app.js`,
command surfaces, replay cursor movement, chart viewport intent, chart-engine
behavior, target-history request sizing, shell readout code, producer runtimes,
or the Step 362 runtime skeleton.

## Chain Summary

| Range | Result |
| --- | --- |
| Steps 367-371 | Measured the real HTF leftward-extension path and isolated the dominant delay to native wheel scheduling, not target fetch, source fetch, chart-data replacement, viewport reapply, or readout. |
| Steps 372-374 | Selected and wired HTF target-history native visible-range `100ms` scheduling while preserving low-TF/native and target-history-disabled paths. |
| Step 375 | Attributed the remaining slow cases to runtime-originated `500ms` schedules: `runtime-surface-check` and `runtime-left-extension-loaded`. |
| Step 376 | Suppressed those HTF target-history runtime delayed schedules while preserving low-TF/native, target-history-disabled, and programmatic fast-path behavior. |
| Step 377 | Added a focused browser budget guard requiring `4h`, `8h`, `1D`, and `1W` target fetches to remain under `300ms`. |
| Steps 378-379 | Added the budget guard as optional pack member `reduced-delay-budget` and verified it inside the combined optional pack path. |

## Current Latency Evidence

The original slow path was around the old `requestDelayMs=500` window:

- Step 371 measured `4h`, `8h`, `1D`, and `1W` `inputToTargetFetchStartMs`
  around `460-536ms`.
- Step 375 proved the remaining slow cases still had native `100ms` available
  but were dominated by runtime `500ms` delayed schedules.

After Step 376:

- Step 376 measured `4h` `113.3ms`, `8h` `121.4ms`, `1D` `125.7ms`, and
  `1W` `120.4ms`.
- Step 377 standalone guard measured `4h` `119.4ms`, `8h` `140.1ms`,
  `1D` `127.7ms`, and `1W` `139.7ms`.
- Step 379 combined optional pack measured `4h` `116.0ms`, `8h` `132.9ms`,
  `1D` `134.2ms`, and `1W` `137.5ms`.

## Decision

HTF target-history leftward-extension latency is closed for now.

Current evidence shows the previously observed `500ms` scheduling bottleneck is
fixed and guarded. There is no remaining concrete uncovered HTF leftward
extension performance regression in this chain.

## Active Guards

- Detailed attribution:
  `v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- Focused budget guard:
  `v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- Optional pack member:
  `TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- Combined optional pack path:
  `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

## Preserved Boundaries

- Default Step 293 target-history diagnostics pack membership remains eight
  tests.
- Optional members `replay-coordination`, `readout-producer-flow`,
  `handoff-registration`, and `reduced-delay-budget` remain available.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- Diagnostics runtime remains read-only observability.
- Shell readout code does not call target APIs.
- Display-Timeframe Runtime remains the TF-switch owner.

## Step 381 Recommendation

Select a chart-foundation regression refresh outside the narrow HTF latency
chain:

- run or package the current foundation-level chart regression commands;
- include timeframe switching, interval menu parity, display-timeframe
  leftward history, daily/weekly/monthly projection, replay gap coverage, and
  the new HTF reduced-delay budget guard;
- use the refresh to choose the next chart-foundation slice from current
  failures or weakest coverage instead of continuing HTF latency work by
  inertia.

## Verification

- `node v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-closeout-step377-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-closeout-step376-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
