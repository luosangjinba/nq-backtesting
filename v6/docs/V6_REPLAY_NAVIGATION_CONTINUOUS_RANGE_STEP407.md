# Step 407 - Replay Navigation Continuous Range Correction

Status: continuous-range correction completed; the first human recheck exposed
the fixed-timeframe alignment defect corrected by Step 408. A post-Step-408
human visual recheck is required before Step 407 acceptance closes.

## User evidence

Human visual acceptance exposed a blocking defect after Step 406:

- Replay `Revealed` advanced across the full Go-to interval;
- Chart Data showed the previous visible prefix;
- only the destination K-line, or a very small destination fragment, was added;
- the already revealed interval appeared as a large empty chart gap.

Evidence was supplied in:

- `tmp/2026-07-13_080023.png`;
- `tmp/2026-07-13_080044.png`.

This was not a viewport or zoom problem. Replay state and rendered chart data
were inconsistent.

## Root cause

Step 405 reused `appendReplayCursorAcrossPanes()`, which was intentionally
extracted for Manual Next. That boundary loaded enough source data to build the
single cursor bucket and then selected only the destination bar. This is correct
for a one-source-bar step but incomplete for a Go-to jump.

The coordinator advanced Replay from the old cursor to the resolved target in
one command, but did not tell the materializer to load the skipped revealed
interval.

## Correction

The existing shared materializer now accepts an optional `fromCursorTime`.

- Manual Next omits it and preserves the original single-cursor fast path.
- Replay Navigation passes the old Replay cursor.
- The materializer loads `(fromCursorTime, cursorTime]` in bounded forward
  source chunks.
- Every real source bar from those windows is merged and de-duplicated.
- `1m` panes append the complete real-source range.
- fixed HTF and `1D`/`1W`/`1M` panes send the same complete source range through
  the existing Chart Data Projection owner and append every projected bucket.
- Chart Data's existing duplicate-bucket merge preserves the prior bucket open
  and expands high/low/close correctly when a jump begins inside a bucket.
- cursor-capped Chart Data application continues to enforce no-future state.

No timeframe-specific Go-to coordinator branch was added.

## Verification

- `node v6/tests/replay-cursor-range-materializer-step407-smoke.js`
- `node v6/tests/replay-navigation-acceptance-boundaries-step407-smoke.js`
- `node v6/tests/replay-navigation-timeframe-matrix-step407-smoke.js`
- `node v6/tests/replay-cursor-pane-materializer-step404-smoke.js`
- `node v6/tests/replay-navigation-runtime-step405-smoke.js`
- `node v6/tests/replay-navigation-ui-step406-browser-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/htf-replay-gap-regression-pack-step272-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Real NQ browser evidence now requires the Friday-to-Monday Go-to path to:

- load and append more than 500 intermediate real K-lines;
- end on the configured target K-line;
- keep every Chart Data timestamp at or before the Replay cursor;
- pass the same visible pane ids from Chart Surface to the coordinator.

Regression results:

- Replay Navigation terminal/error/in-flight/active-pane boundary matrix:
  passed;
- shared `1m`/`4h`/`1D`/`1W`/`1M` multi-pane range and no-future matrix:
  passed;
- Manual Next session-gap pack: `5/5`;
- visible K-line latency pack: `6/6`;
- chart browser regression pack: `28/28`;
- HTF replay-gap pack: passed.

The timeframe matrix calls the same range materializer and real Chart Data
Projection domain for every pane. It intentionally adds no action-specific or
timeframe-specific branch to Replay Navigation. A roughly seven-week `1m`
range is split into bounded 40,000-bar source windows and projected across all
five representative timeframe families while preserving ordered unique bars
and cursor-capped no-future state.

## Required human recheck

Step 408 supersedes the original fixed-timeframe portion of this matrix. Use
`v6/docs/V6_FIXED_TIMEFRAME_BUCKET_ALIGNMENT_STEP408.md` for the current `1h`
and `4h` crosshair/grid checks.

Reload the workstation before retesting so the browser uses the corrected
modules. Repeat the supplied scenario first on `1m`:

1. record the current cursor and last visible K-line;
2. run one Go-to action that crosses a long intraday or overnight interval;
3. verify all real intermediate K-lines are present with no artificial blank
   section;
4. verify the destination K-line and footer cursor agree;
5. drag the chart left/right to confirm the filled range remains continuous.

Then sample one fixed HTF and one session-calendar timeframe. Step 407 remains
open until this human visual recheck passes.
