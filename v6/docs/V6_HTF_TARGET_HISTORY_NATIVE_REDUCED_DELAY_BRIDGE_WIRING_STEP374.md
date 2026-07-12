# V6 HTF Target-History Native Reduced Delay Bridge Wiring - Step 374

Status

Accepted with follow-up attribution.

## Decision

Step 374 wires the selected Step 372/373 reduced-delay policy into
`leftward-history-input-bridge.js`.

The bridge now passes `nativeTargetHistoryDelayMs` to the pure scheduling
resolver only when:

- the scheduling reason is `native-visible-range`;
- target-history activation resolved to enabled for the pane;
- `shouldRequest` has already accepted the visible range.

Default HTF target-history native delay:

- `100ms`.

Preserved paths:

- low-TF/native source paths keep `requestDelayMs=500`;
- target-history disabled paths keep `requestDelayMs=500`;
- existing programmatic target-history fast path stays `delayMs: 0`;
- target-history activation still happens before dispatch;
- target-history request sizing is unchanged.

## Added Coverage

- `v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
  proves HTF native target-history schedules at `100ms`, custom override
  schedules at the configured value, low-TF and disabled paths stay `500ms`,
  and programmatic display-timeframe apply remains immediate.
- `v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js`
  locks the bridge wiring scope and forbidden runtime surfaces.
- Existing Step 326, Step 286, Step 148, Step 373, and Step 372 tests were
  updated or rerun to preserve older behavior under the new bridge wiring.

## Browser Measurement

The focused real CDP wheel milestone smoke was rerun:

`node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`

Observed `inputToTargetFetchStartMs` after bridge wiring:

| TF | input -> target fetch |
| --- | ---: |
| `4h` | 479.2ms |
| `8h` | 132.1ms |
| `1D` | 462.8ms |
| `1W` | 447.9ms |

Interpretation:

- The new bridge wiring is effective on at least one real wheel HTF path (`8h`).
- `4h`, `1D`, and `1W` still hit a roughly `requestDelayMs=500` window in this
  smoke.
- The next bottleneck is no longer "add the resolver option"; it is attribution
  of why some real wheel HTF cases do not reach the native target-history
  reduced-delay resolver branch.

## Next Slice

Step 375 should add targeted attribution for real wheel scheduling branch
selection.

Recommended Step 375 boundary:

- instrument or expose harness-only milestones for resolved schedule reason,
  target-history activation enabled/disabled state, selected delay, and timer
  delay;
- run `4h`, `8h`, `1D`, and `1W` real CDP wheel cases;
- identify why `8h` reaches the reduced-delay path while `4h`, `1D`, and `1W`
  still appear delayed;
- do not change request sizing, replay, chart viewport, chart engine, shell,
  or target-history data loading behavior.
