# Step 379 - Target-History Pack Reduced-Delay Optional Combination

Status

Accepted.

## Scope

- Verified the combined optional Step 293 target-history diagnostics pack member
  path including `reduced-delay-budget`.
- Kept the default Step 293 pack membership unchanged at eight tests.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay,
  chart viewport intent, chart-engine behavior, request sizing, shell readout
  code, or the Step 362 runtime skeleton.

## Combined Command

```bash
TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js
```

Observed pack plan:

- `plan members 4/8 replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget`

Observed run order:

1. `v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
2. `v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
3. `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
4. `v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`

Observed reduced-delay budget timings inside the combined run:

| TF | input->target fetch | target fetch |
| --- | ---: | --- |
| `4h` | `116.0ms` | `4h` |
| `8h` | `132.9ms` | `8h` |
| `1D` | `134.2ms` | `1D` |
| `1W` | `137.5ms` | `1W` |

## Step 380 Recommendation

Close the HTF leftward-extension performance chain with a short re-audit:

- summarize Steps 367-379;
- mark HTF target-history leftward extension latency as guarded by the Step 377
  budget smoke and optional Step 378/379 pack paths;
- select the next chart-foundation slice outside this narrow HTF latency chain
  unless a new manual regression appears.

## Verification

- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `git diff --check`
