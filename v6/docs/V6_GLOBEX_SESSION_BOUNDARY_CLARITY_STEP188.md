# V6 Step 188 - Globex Session Boundary / Chart Data Range Clarity

## Problem

The dashboard currently shows a replay session as a calendar date range such as
`2026-06-01 / 2026-06-05`. For CME futures such as NQ and ES, the chart can
legitimately show bars before the calendar start date because the Monday
trading day opens during the prior Sunday evening Globex session.

For the default NQ session beginning on `2026-06-01`, the local database has
tradable bars beginning at `2026-05-31 18:00`. That is expected market-session
data, not evidence that leftward historical extension leaked outside the
session or failed to stop at a correct boundary.

## Decision

V6 distinguishes these labels:

- **Trading dates**: the replay session date range chosen by the user, derived
  from `session.startTime` and `session.endTime`.
- **Chart data boundary**: the earliest tradable chart bar the bar-data owner
  can expose for that session and symbol.

The dashboard may surface both labels so users can understand why a Monday
futures replay starts drawing from the prior Sunday Globex open. The wording
must be compact and data-like, not instructional copy.

## Ownership

- Session/domain data owns the selected replay dates and symbols.
- The session dashboard model may derive display-only labels from session data.
- The dashboard UI may render those labels.
- Bar-data runtime remains the only owner of actual bar requests and data
  availability.
- Chart runtime remains the only owner of chart series writes.
- Replay runtime remains the only owner of reveal cursor and replay progress.

Step 188 does not change the bar loading window, replay cursor, chart series, or
leftward-history request caps. It only prevents date-label ambiguity from being
mistaken for chart extension instability.

## Acceptance

- A model or browser smoke proves the default NQ `2026-06-01` session exposes a
  `2026-05-31 18:00` prior Globex open label.
- Non-Globex or non-Monday sessions do not receive the prior Sunday label.
- Existing replay-safe leftward-history latency coverage still passes.
- The chart browser regression pack and boundary smoke still pass.
