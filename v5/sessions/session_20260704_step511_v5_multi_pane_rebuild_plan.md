# Step 511 - Multi-Pane Rebuild Plan

Date: 2026-07-04

## Trigger

Manual testing after Step 510 showed the current multi-pane implementation is
still structurally unstable:

- triple-pane layouts can open with one pane not rendering candles;
- reset view does not reliably recover the missing pane;
- initial active-pane policy is incomplete for triple variants;
- replay `Next` / playback still feels delayed and catch-up based compared
  with V4, FXReplay, and TradingView.

## Decisions

- Stop adding incremental behavior patches to the current multi-pane
  orchestration path.
- Treat `chart-replay-pane-orchestrator.js` as a temporary adapter while the
  rebuild lands, not as a place to accumulate new policy.
- Keep Lightweight Charts as the chart renderer behind V5 chart runtime; the
  TradingView ecosystem reference did not provide a ready-made replay-aware
  multi-pane layout/runtime.
- Rebuild around explicit layers:
  - layout-runtime active-pane policy table;
  - pane shell and chart runtime host lifecycle separation;
  - pane display coordinator with deterministic pane readiness;
  - replay pane projection that advances the shared cursor once and updates or
    projects every pane for that cursor.

## Step 512+ Plan

- Step 512: add failing/guarding browser smokes for twice/triple variants,
  initial active pane, every-pane rendered bars, reset recovery, and immediate
  replay `Next`.
- Step 513: move initial active-pane choice into layout-runtime policy helpers.
- Step 514: add pane display coordinator and pane lifecycle readiness.
- Step 515: replace primary-first catch-up replay with coordinated pane
  projection.
- Step 516: add a deterministic multi-pane replay performance gate.

## Verification

- `git diff --check`

This was a planning/spec step, so no production behavior smoke was required.

## Status

Completed.
