# Step 377 - HTF Target-History Reduced-Delay Browser Budget Guard

Status

Accepted.

## Scope

- Added a focused browser pass/fail guard for HTF target-history reduced-delay
  behavior.
- Kept the broader Step 371 milestone smoke as the detailed attribution
  harness.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay,
  chart viewport intent, chart-engine behavior, request sizing, shell readout
  code, or the Step 362 runtime skeleton.

## Guard

The new browser smoke is:

- `v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`

It asserts for `4h`, `8h`, `1D`, and `1W`:

- target fetch starts under `300ms`;
- target fetch uses the expected target timeframe;
- source fetch count remains `0`;
- native target-history schedule resolves to `delayMs=100`;
- native target-history timer schedules at `100ms`;
- any observed runtime delayed `500ms` reason is paired with
  `schedule-suppressed`.

## Browser Observation

Observed run:

| TF | input->target fetch | native schedules | suppressed schedules | target fetch |
| --- | ---: | ---: | ---: | --- |
| `4h` | `119.4ms` | `2` | `1` | `4h` |
| `8h` | `140.1ms` | `1` | `0` | `8h` |
| `1D` | `127.7ms` | `1` | `0` | `1D` |
| `1W` | `139.7ms` | `1` | `0` | `1W` |

All measured target fetches are comfortably below the `300ms` regression budget
and away from the old roughly `500ms` delayed window.

## Step 378 Recommendation

Add this budget guard as an optional target-history diagnostics pack member:

- keep the default Step 293 pack membership unchanged;
- add a focused member name such as `reduced-delay-budget`;
- include the Step 377 browser smoke only when that member is selected;
- add static coverage proving the default comprehensive command remains
  unchanged and the optional member is discoverable.

## Verification

- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-boundary-step377-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `git diff --check`
