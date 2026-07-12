# Step 375 - HTF Target-History Native Reduced Delay Branch Attribution

Status

Accepted with follow-up scheduling fix.

## Scope

- Added harness-only attribution for real high-timeframe wheel scheduling.
- Preserved bridge behavior from Step 374.
- Did not modify `v6/src/app.js`, command surfaces, replay cursor movement,
  chart viewport intent, chart-engine behavior, target-history request sizing,
  shell readout code, or the Step 362 runtime skeleton.

## Attribution Surface

The leftward-history input bridge now exposes an optional no-op test hook:

- `globalThis.__v6LeftwardHistoryInputBridgeTrace(record)`

The hook is only active when a harness installs it. It records:

- `schedule-resolved`: activation display timeframe, activation status,
  requested/resolved reason, selected delay, selected mode, and whether
  target-history was enabled.
- `timer-scheduled`: timer delay and resolved scheduling mode/reason.

## Browser Observation

Observed with
`v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
after adding schedule trace collection.

| TF | input->target fetch | schedule branch evidence | target fetch |
| --- | ---: | --- | --- |
| `4h` | `463.3ms` | native `100ms` is present, then `runtime-surface-check` and `runtime-left-extension-loaded` schedule `500ms` delayed timers | `4h` |
| `8h` | `130.1ms` | native `100ms` schedule is the observed active branch | `8h` |
| `1D` | `464.0ms` | native `100ms` is present, then `runtime-left-extension-loaded` schedules `500ms` delayed timers | `1D` |
| `1W` | `462.6ms` | native `100ms` is present, then `runtime-left-extension-loaded` schedules `500ms` delayed timers | `1W` |

## Conclusion

Step 374 did wire the native target-history reduced-delay branch correctly.
The remaining slow cases are not missing activation: `4h`, `1D`, and `1W`
report target-history enabled and show native `100ms` scheduling records.

The practical difference is that runtime-originated reasons still participate
in the same interaction window:

- `runtime-surface-check`
- `runtime-left-extension-loaded`

Those reasons resolve to the default delayed mode with `delayMs=500`. In the
observed run, `8h` reaches the target fetch near the reduced-delay window, while
`4h`, `1D`, and `1W` still line up with the old roughly `500ms` window because
the runtime delayed schedules remain active or are reintroduced during the
wheel-triggered extension cycle.

## Step 376 Recommendation

Select a narrow scheduling fix:

- keep low-TF/native and target-history-disabled paths on the existing delayed
  policy;
- preserve programmatic fast path `delayMs=0`;
- for HTF target-history native interaction windows, prevent runtime
  `runtime-surface-check` / `runtime-left-extension-loaded` delayed schedules
  from replacing or dominating an already active native reduced-delay schedule;
- add browser coverage proving `4h`, `8h`, `1D`, and `1W` target fetches all
  reach the reduced-delay branch without changing replay or request sizing.

## Verification

- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-boundary-step375-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
