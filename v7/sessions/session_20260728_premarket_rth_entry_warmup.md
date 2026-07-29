# Session 2026-07-28 — Premarket RTH Entry Warmup

## Report

A Session spanning `2026-05-01 05:47 EDT` through `2026-05-31 05:48 EDT`
showed `No visible bars` after selecting RTH even though the date range
contained normal RTH trading days.

## Root Cause

The RTH replacement planned its left context as 240 natural minutes before the
Session start. At `05:48 EDT` that whole nominal window was closed. The same raw
request buffered later bars from the current day, but no-future Projection
correctly excluded them, leaving no eligible bar before the Replay cursor.

The existing closed-window expansion helper was not connected to initial and
replacement `requestThrough` planning.

## Correction

- Keep Bar Data as the sole raw requester and Projection as the no-future/RTH
  eligibility owner.
- Anchor selection-aware context planning at the stable Session entry.
- When the nominal entry context is wholly closed, expand that one request
  backward through the prior close/weekend to eligible RTH minutes.
- Keep the forward request endpoint quantized as before so Manual Next within
  the same 500-minute buffer remains an exact cache hit.

No Replay cursor movement, synthetic candle, Chart ownership change, or
special empty-state retry was added.

## Evidence

- The pure request-plan assertion resolves the reported premarket entry to
  `2026-04-30 12:15 EDT`, supplying 240 prior eligible RTH minutes.
- The real multi-Pane Chrome harness creates the exact reported Session,
  switches to RTH with at least 200 visible bars per Pane, hard-reloads into the
  same ready RTH checkpoint, extends earlier history, and returns to ETH.
- The main real-Chrome workspace harness retains cache-hit aggregate Next with
  no additional provider request.
- The existing dense `4h` one-pass history gate remains green: one visible
  revision, 2,427 bars, full-opacity Canvas, and `381.1ms` in this run.

## Human Acceptance

On `2026-07-29`, the user's hard-reloaded screenshot showed ready `3m` RTH
candles in the reported premarket Session instead of the centered
`No visible bars` state. The interaction gate is accepted.
