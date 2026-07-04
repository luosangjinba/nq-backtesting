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

## Status

- Step 517.1: in progress.
- Step 517.2: pending.
- Step 517.3: pending.
