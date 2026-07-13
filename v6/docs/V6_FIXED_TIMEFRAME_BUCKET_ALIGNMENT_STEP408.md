# Step 408 - Fixed Timeframe Bucket Alignment

Status: correction and automated regression completed; human visual recheck
required before Step 407/408 acceptance closes.

## User evidence

The Step 407 visual recheck found that Go-to filled the skipped range but mixed
two fixed-timeframe bucket grids:

- existing `1h` history used whole-hour bars, while a New York Session jump
  appended `09:30`, `10:30`, and later half-hour buckets;
- existing `4h` target history used the canonical target-bars grid, while an
  Asian Session jump appended replay-start-aligned `09:30`, `13:30`, and
  `17:30` buckets;
- crosshair evidence showed old and new bars in the same pane using different
  step boundaries.

Evidence was supplied in:

- `tmp/2026-07-13_084819.png`;
- `tmp/2026-07-13_084921.png`;
- `tmp/2026-07-13_085143.png`;
- `tmp/2026-07-13_085152.png`;
- `tmp/2026-07-13_085202.png`;
- `tmp/2026-07-13_085216.png`.

## Root cause

Fixed-duration aggregation allowed each caller to choose
`sessionStartTimestamp` as its bucket origin. Display Timeframe fallback used
origin `0`, while Go-to range materialization, initial projection, leftward
history, and pane reload could use replay/session/window starts. A `09:30`
replay start therefore shifted every derived `1h` and `4h` bucket even though
target-history bars already had a canonical grid.

Go-to exposed the inconsistency, but the ownership error was in the shared
projection boundary. Fixing only Replay Navigation would have preserved the
same defect in Manual Next, reload, and history fallback paths.

## Correction

`target-timeframe-domain` now owns the fixed-duration alignment policy used by
Chart Data Projection:

- fixed periods are Unix/clock aligned by default;
- `4h` uses the existing target-bars service offset of two hours, producing
  `02:00/06:00/10:00/14:00/18:00/22:00` bucket starts;
- `1D`/`1W`/`1M` remain session-calendar projections and are unchanged;
- caller-provided replay/session start values no longer shift fixed buckets.

All callers continue to use one Chart Data Projection command. No Go-to action
or timeframe-specific branch was added to Replay Navigation.

## Verification

- `node v6/tests/fixed-timeframe-projection-alignment-step408-smoke.js`
- `node v6/tests/replay-navigation-fixed-timeframe-alignment-step408-browser-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/minute-hour-timeframe-projection-step265-smoke.js`
- `node v6/tests/replay-navigation-timeframe-matrix-step407-smoke.js`
- `python3 v4/tests/target-bars-full-timeframe-matrix-smoke.py`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

The real NQ browser gate proves:

- New York Session cursor `09:30` on `1h` renders into the `09:00` bucket;
- Asian Session cursor `19:00` on `4h` renders into the `18:00` bucket;
- every bar in each pane remains on the matching canonical grid;
- chart timestamps remain at or before the Replay cursor.

Regression results:

- Manual Next session-gap pack: `5/5`;
- visible K-line latency pack: `6/6`;
- target-bars full-timeframe service matrix: passed;
- chart browser regression pack: final run `28/28`.

The chart pack twice observed its existing `1m` Manual Next latency assertion
above `160ms` under accumulated browser load. The isolated test passed, the
limit was not relaxed, and the final full pack passed at `133.9ms`. The test now
reports its measured latency so a recurrence is diagnosable rather than only
printing a boolean mismatch.

## Required visual recheck

Hard reload the workstation, then repeat the reported paths:

1. switch to `1h`, Go-to New York Session, and verify all K-line starts remain
   on whole hours even though the Replay cursor is `09:30`;
2. switch to `4h`, Go-to Asian Session, and verify the chart stays on the
   `02/06/10/14/18/22` grid;
3. move the crosshair across old and newly appended bars and verify the step
   boundary never switches grid;
4. drag left/right and confirm the full range remains continuous.

Step 407/408 remains open until this human visual gate passes.
