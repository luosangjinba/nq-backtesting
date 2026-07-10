# V6 Date-Range Entry Viewport Alignment Audit/Gate - Step 247

Date: 2026-07-09

## Boundary

Step 247 covers the session date-range entry path:

1. Session dashboard reads selected trading dates from the setup form.
2. Session runtime stores the selected session start/end.
3. Chart-entry initialization converts the session start into a bounded
   context window.
4. Bar-data plans and loads the bounded window and publishes actual loaded
   boundary metadata.
5. Chart-entry default-wall/projection runtimes prepare chart-data replacement
   and viewport intent.
6. Chart-data stores pane-local bars.
7. Chart viewport owns the initial default-wall visible range.
8. Chart surface renders already-applied chart-data and exposes the visible
   logical range.

Shell UI does not own date-range math, bar requests, chart-data writes, replay
cursor mutation, or viewport projection.

## Gate

`date-range-entry-viewport-alignment-step247-smoke.js` creates a non-default
date-range session through the real session setup form and verifies:

- selected trading dates remain visible in the session row;
- chart boundary wording still uses product wording (`Chart starts at`);
- chart-entry context and projection apply reach loaded/applied states;
- chart-data exists for the main pane;
- the initial chart surface visible logical range includes the latest loaded
  K-line without user drag, click, or wheel input;
- the context window remains bounded and does not load the full selected end
  date range.

## Findings

The gate passes without a runtime fix. Current chart-entry/context and
chart-viewport ownership already align the non-default date-range entry view
after the recent leftward-history and replay/transport stabilization work.

## Non-Goals

- No date picker or date-range management UI was added.
- No new timeframes were added.
- Replay cursor semantics, Manual Previous, transport controls, leftward
  extension planning, and display-timeframe projection were not changed.
- Indicators, Pine Script compatibility, SMC/ICT overlays, trading simulation,
  order tickets, prop firm rule engines, and journal workflows were not changed.

## Verification

- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 248 should select the next bounded chart-foundation slice using the
current TODO direction and the Step 247 gate result.
