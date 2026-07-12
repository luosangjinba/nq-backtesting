# Step 376 - HTF Target-History Runtime Delayed-Schedule Suppression

Status

Accepted.

## Scope

- Suppressed HTF target-history `runtime-surface-check` and
  `runtime-left-extension-loaded` delayed `500ms` schedules inside the
  leftward-history input bridge.
- Preserved low-TF/native source behavior, target-history-disabled behavior,
  and programmatic target-history fast path behavior.
- Did not modify `v6/src/app.js`, command surfaces, replay cursor movement,
  chart viewport intent, chart-engine behavior, target-history request sizing,
  shell readout code, or the Step 362 runtime skeleton.

## Runtime Behavior

When target-history is enabled for an HTF pane:

- native visible-range schedules still resolve to
  `native-target-history-reduced-delay` with `delayMs=100`;
- if a native reduced-delay schedule is already pending, later
  `runtime-surface-check` or `runtime-left-extension-loaded` delayed schedules
  are suppressed and the native pending timer is preserved;
- if no native pending timer exists, those two runtime delayed schedules are
  still suppressed instead of creating stale `500ms` HTF target-history work;
- suppression is traced as `phase: 'schedule-suppressed'`.

Low-TF/native source paths and target-history-disabled paths continue to use
the normal delayed schedule.

## Browser Observation

Observed with
`v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
after suppression:

| TF | input->target fetch | result |
| --- | ---: | --- |
| `4h` | `113.3ms` | native `100ms` schedule active; runtime delayed schedules suppressed |
| `8h` | `121.4ms` | native `100ms` schedule active; runtime delayed schedules suppressed |
| `1D` | `125.7ms` | native `100ms` schedule active; runtime delayed schedules suppressed |
| `1W` | `120.4ms` | native `100ms` schedule active; runtime delayed schedules suppressed |

## Step 377 Recommendation

Add a focused browser budget regression for this behavior:

- assert `4h`, `8h`, `1D`, and `1W` target fetches stay near the reduced-delay
  branch instead of the old `500ms` window;
- assert the schedule trace includes native `100ms` and
  `schedule-suppressed` for runtime delayed reasons where present;
- keep the broader Step 371 milestone smoke available for attribution, but add
  a smaller pass/fail guard for future regressions.

## Verification

- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-boundary-step376-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `git diff --check`
