# FX Replay Initial Load

This spec defines the stable V5 rules for entering a replay chart from a replay
session id.

## Scope

Applies to initial chart entry only:

- resolving the session start bar;
- loading visible prefix context;
- rendering the first replay display state.

Forward reveal, Play/Pause, right-bound clamping, and prefix retention belong to
later replay specs.

## Time Semantics

V5 session setup preserves exchange wall-clock time.

- `datetime-local` input is stored as `YYYY-MM-DD HH:mm`.
- V5 must not convert session start/end through UTC ISO before requesting V4
  bars.
- Requests to `/v4/bars` use the same wall-clock values selected by the user.

Reason: the V4 bars API queries wall-clock timestamps in the local trading data.
Converting through UTC can shift the requested replay start.

## Initial Loading Law

Given a replay session id:

1. Resolve the first active-timeframe bar at or after `sessionStart`.
2. Read viewport metrics from chart runtime.
3. Request only a bounded prefix window through bar data runtime.
4. Render `prefix bars + start bar` through chart runtime.
5. Start bar is the latest visible replay bar.

## Display Invariants

Initial replay display state must satisfy:

- `displayBars.at(-1)` is the resolved start bar;
- no `displayBars` item has `timestamp > startBar.timestamp`;
- prefix bars are sorted oldest to newest;
- prefix bars are clipped to viewport demand;
- API padding or extra returned history must not increase visible prefix count.

## Forbidden

- UI or feature modules requesting bars directly.
- UI or feature modules writing chart bars directly.
- Initial replay requesting the full session range.
- Replay runtime storing unrevealed future bars in `displayBars`.
- Converting `datetime-local` setup values into UTC request timestamps.

## Verification

Current harnesses:

- `v5/tests/session-setup-model-smoke.js`
  - setup preserves wall-clock time;
  - invalid dates are rejected.
- `v5/tests/replay-start-bar-smoke.js`
  - start bar resolves through replay runtime and bar data runtime.
- `v5/tests/replay-prefix-load-smoke.js`
  - viewport metrics drive prefix count;
  - extra returned prefix bars are clipped.
- `v5/tests/replay-initial-render-smoke.js`
  - chart rendering goes through chart runtime.
- `v5/tests/replay-no-future-bars-smoke.js`
  - future bars are excluded from display state.
- `v5/tests/replay-initial-browser-smoke.js`
  - real-data browser flow loads prefix plus start;
  - full session range is not requested.
