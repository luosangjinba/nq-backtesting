# Session 2026-07-29 — Calendar Timeframe Activation

## Report

The timeframe menu displayed `1 day`, `1 week`, and `1 month` as disabled even
though users expected the complete V6-derived interval set to be usable.

## Root Cause

The controls were intentionally registered with `unavailable: true` because V7
had only a fixed-duration aggregation owner. Simply removing the disabled flag
would have violated capability identity, Session Hours alignment, compact
history, and no-future provenance. The projected-history service also accepted
only numeric `1h`–`12h` durations.

## Correction

- Add `core.calendar-timeframe-domain` as the pure Projection-owned day/week/month
  policy boundary.
- Register calendar alignment identity separately from fixed durations and
  preserve ETH/RTH-before-aggregation plus exclusive Replay cutoff ordering.
- Use New York exchange-wall trading dates: ETH rolls at `18:00`; RTH remains
  on the same date at `09:30`; weeks use Monday trading dates; months use the
  calendar trading month.
- Place every calendar candle at the final eligible minute before its next
  period while retaining its canonical period-start provenance.
- Extend projected-history request/cache identity with alignment kind/policy,
  and extend the V4 read-only service/adapter to `1D`, `1W`, and `1M`.
- Merge compact projected prefix and authoritative raw tail before the single
  Workspace/Chart replacement, including premarket RTH.
- Keep calendar display independent of fixed Replay-step ownership; selection
  does not synthesize a month duration or move the cursor.

## Evidence

- Pure calendar domain harness: passed with five negative controls.
- Python calendar projected-history smoke: all six ETH/RTH × day/week/month
  cases passed; existing fixed boundary smoke remained green.
- Real API parity: frontend source-`1m` aggregation equals API projected output
  for `4h` plus all six calendar combinations across the November DST boundary.
- Focused real Chrome: all three controls are enabled; every switch commits
  useful left history without incrementing the native history-boundary capture
  count; Replay is unchanged; premarket RTH monthly history remains ready.
- The open-menu visual fixture was inspected and now shows calendar choices at
  the same enabled contrast and interaction role as the fixed choices.

## Human Acceptance

Accepted through R8.15 on 2026-07-31. After the binding hard-reload checklist,
the user explicitly reported `验收通过`, including that `1D`, `1W`, and `1M`
are clickable and arrive filled without follow-up pointer/wheel input.
