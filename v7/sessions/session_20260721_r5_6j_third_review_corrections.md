# Session — R5.6j Third-Review Corrections

Date: 2026-07-21
Status: automated complete; fourth human review pending

## Outcome

The two correctness regressions reported in the third review are closed while
preserving the bounded high-timeframe performance correction.

## Root Causes And Corrections

The pane source ledger retained every accepted batch ending before a new
replacement window, even if the retained tail and replacement start were not
adjacent. In the reported `1h` case this combined old April 1–10 bars with a new
window beginning April 21, yielding 523 candles with a visible ten-day hole.
Replacement now retains only the exact contiguous prefix ending at the new
window start. Projection independently rejects gapped request windows before a
workspace can become visible.

After repeated left-history dragging, the manual logical offset could project
both bounds before the first candle when switching to fewer aggregate bars.
The earlier left-only clamp then produced `from > to`, which Lightweight Charts
rejected and left the old candles visible. A focused adapter range planner now
repairs that transient range to include loaded candles while leaving the
canonical manual Viewport intent unchanged.

## Automated Evidence

- focused source-ledger fixtures cover overlapping and exactly adjacent
  replacements;
- Projection Domain passes with a new gapped-window negative control;
- Lightweight Chart Adapter passes an inverted-range regression;
- real Chrome performs history expansion→`1h`→RTH→ETH, reaches the Replay tail,
  and reports 185 continuous `1h` ETH candles with a 50-hour maximum interval;
- all V7 Harnesses pass, including all three real-browser Harnesses;
- final real-Chrome timings: first `5m` about `156ms`, ETH→RTH about `55ms`,
  uncached `12h` RTH about `1.69s`, and 100 aggregate Next actions at p95
  `62.4ms`, p99 `70.1ms`, max `72.1ms`;
- `git diff --check` passes.

## Gate

Execute `docs/V7_R5_6_CORRECTIVE_REVIEW.md`. R6 remains blocked until explicit
fourth-review acceptance.
