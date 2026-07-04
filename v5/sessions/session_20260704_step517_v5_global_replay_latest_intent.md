# Session 2026-07-04 - Step 517 Global Replay Latest-Intent Responsiveness

## Goal

Make the replay responsiveness standard global. The 100ms latest-intent target
applies to single pane and multi-pane. Single pane is the baseline; multi-pane
must not be used as an excuse for delayed manual replay stepping.

## Plan

1. Document the global latest-intent replay contract and make clear that it
   applies to single pane and multi-pane.
2. Add a single-pane browser smoke that rapidly clicks `Next`, records the final
   click timestamp, and measures final-click-to-visible-cursor latency.
3. Run single/multi replay responsiveness gates and update TODO/session handoff.

## Product Standard

- Human click rate is roughly capped around 10 clicks/second.
- Product target: about 100ms from the latest `Next` intent to the expected
  candle being visible.
- Browser smoke thresholds may be looser for headless/CI variance, but the
  product standard remains 100ms.
- V4 already has this feel. V5 failing this standard is a V5 implementation
  defect.
- FXReplay demonstrates that even 8 panes can replay with effectively zero
  perceptible delay. V5 currently exposes fewer panes, but the architecture must
  remain scalable to that standard.

## Status

- Step 517.1: completed. The global replay latest-intent contract is documented
  and explicitly applies to single pane and multi-pane.
- Step 517.2: completed. Added a single-pane browser smoke that measures
  final-click-to-visible-cursor latency for rapid `Next` input.
- Step 517.3: completed. The `Next` visible path no longer waits for cursor
  persistence; persistence is queued in the background and only patches
  `persistedCursor` when it still matches the active cursor. Chart metadata now
  exposes `viewportCursorTimestamp` so browser gates can assert the visible
  cursor directly.

## Verification Notes

- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js` passed
  after switching the multi-pane gate to assert per-pane
  `viewportCursorTimestamp`.
- `node v5/tests/replay-viewport-follow-browser-smoke.js` passed after moving
  lightweight hidden debug rendering off the synchronous append path.
- `node v5/tests/replay-latest-intent-browser-smoke.js` passed after measuring
  visible cursor directly from canvas metadata instead of repeatedly polling
  runtime state inside the latency window.
