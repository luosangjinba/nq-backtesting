# V6 Step 249 - Drag/Scroll Display Stability Reaudit/Gate

Date: 2026-07-09

## Decision

Step 249 closes as an audit and static gate for drag/scroll display stability.
No runtime behavior change is required in this step.

Existing browser-visible coverage is sufficient for the current automatable
risk: sticky hover-drag after release, fast right-drag jump-back, delayed
older-history extension, replay responsiveness while history is pending,
visible-range compensation after prepends, and manual projection suppression.

The remaining risk is subjective visual smoothness under human drag. That
should stay a manual UX check when testing a browser build, but it should not
create another owner path or per-timeframe display implementation.

## Owner Map

- Native Lightweight Charts interaction owns immediate drag/scroll chart
  movement.
- Chart surface owns visible-range observation and prepend visible-range
  compensation.
- Manual-wall input bridge may record viewport intent after native drag, but
  must not immediately project measured range back into chart.
- Leftward-history input bridge owns delayed/coalesced history-extension
  scheduling, not bar requests.
- Chart-history owns older-window orchestration and in-flight/exhausted
  suppression.
- Bar-data owns bounded request planning, database/cache reads, and chunked
  windows.
- Chart-data owns pane-local prepend/append/replace records.
- Chart viewport owns manual/default viewport intent and suppresses
  prepend-triggered manual projection.
- Replay owns cursor/reveal state and must not be mutated by history
  extension.

## Coverage Matrix

| Risk | Current Gate | What It Proves |
| --- | --- | --- |
| Mouse release leaves chart stuck to cursor | `v6/tests/chart-drag-release-lifecycle-browser-smoke.js` | `mouseReleased` followed by hover `mouseMoved` with `buttons: 0` must not mutate viewport intent, projection, or visible range except prepend compensation. |
| Fast right drag jumps back to initial/default wall | `v6/tests/fast-right-drag-stability-browser-smoke.js` | Five quick native right drags produce manual viewport intent, no immediate projection feedback, no hover mutation, and stable visible range after prepends. |
| Drag/scroll near canvas-left does not request older history | `v6/tests/drag-triggered-history-extension-browser-step149-smoke.js` | Wheel-driven chart movement reaches canvas-left, plans an `older-window` with `requestCap: canvas-left`, grows chart/cache history, and leaves replay state unchanged. |
| Replay is delayed by pending older-history extension | `v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js` | Manual Next advances while history is delayed/pending, stays under the latency budget, keeps latest K-line visible, and preserves replay state through older prepends. |
| Prepending older bars shifts the user screen | `v6/tests/chart-surface-prepend-visible-range-stability-smoke.js` | Chart surface compensates visible logical range by the prepended bar count. |
| Prepend-triggered range observation projects manual viewport back into chart | `v6/tests/chart-viewport-prepend-manual-stability-smoke.js` | Chart viewport suppresses manual projection caused only by prepend compensation. |
| Coverage drifts out of the chart foundation regression pack | `v6/tests/chart-browser-regression-pack.js` | Drag release and fast right-drag browser gates remain part of the broader chart browser regression pack. |
| Replay/transport regressions mask drag/history bugs | `v6/tests/replay-transport-chain-regression-pack-step245-smoke.js` | Replay transport, leftward history, pane bootstrap, reset view, and display-TF gates stay runnable together. |

## Findings

- There is one intended drag/scroll display path. Native Lightweight Charts
  handles immediate movement; V6 observes and reacts through chart surface,
  leftward-history input, chart-history, bar-data, chart-data, and chart
  viewport owners.
- No separate 1m, 5m, or 15m drag/display path is accepted. Timeframe-specific
  behavior belongs in data planning and projection inputs, not in a duplicate
  chart interaction owner.
- The current gates cover the failures reported before and after Step 186:
  sticky mouse behavior, quick right-drag jump-back, unstable prepends, and
  replay lag while older history is pending.
- No new browser gate is needed for Step 249 because the existing browser gates
  already exercise the relevant user-visible paths. This static gate prevents
  the coverage from becoming implicit or forgotten.

## Residual Manual UX Check

Manual testing should still watch for:

- perceptible K-line jitter during fast human drag;
- delayed leftward loading feeling too eager or too lazy;
- visible-range stability after wheel zoom followed by drag;
- multi-pane focus/pane-local behavior while dragging an inactive pane.

Those are follow-up UX tuning candidates only if the existing deterministic
gates continue passing.

## Verification

- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Step 250 Recommendation

Step 250 should select the next bounded chart-foundation slice after this
drag/scroll stability audit, without jumping ahead to indicators, SMC/ICT
modules, trading simulation, prop firm logic, or journal workflows.
