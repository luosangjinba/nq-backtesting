# Step 538 V5 Different-TF Next Fast Path

Date: 2026-07-04

## Trigger

Manual testing reported that `Next` felt close to half a second again after the
mixed-timeframe pane fixes.

## Initial Findings

- Step 517 cursor persistence queue is still present.
- Step 518 `APPEND_BARS` / Lightweight `series.update` fast path is still
  present.
- Single-pane cadence automation measured max visible latency around 10.4ms.
- Single-pane latest-intent trace showed `fallbackAppendMs: null`, confirming
  incremental append is still active.
- Same-TF multi-pane latest-intent observer measured about 17ms, but polling /
  frame observations can be much later.
- The likely regression is Step 537 putting different-TF display-window
  projection on the `Next` click path even when the target pane already covers
  the cursor bucket.

## Plan

1. Document and commit this plan.
2. Add a regression for covered different-TF projection.
3. Add a fast path that syncs viewport follow without display-window load when
   pane bars already cover the cursor bucket.
4. Run targeted latency and replay regressions, then close the docs.

## Result

Completed.

Step 538 did not find evidence that the Step 517/518 fast path was deleted:

- replay cursor persistence is still queued after visible update;
- same-timeframe `Next` still goes through `APPEND_BARS`;
- Lightweight still uses `series.update` for append;
- single-pane cadence max measured about 14.3ms in the final run;
- same-TF multi-pane all-pane observer measured about 23.2ms in the final run.

The real regression risk was mixed-TF projection from Step 537. That path
correctly made panes consistent, but could wait on display-window projection
even when the target pane already had the display bar covering the new cursor.
The new fast path skips `barData.loadWindow` in that covered case and only syncs
the target pane's right edge plus viewport follow.

## Verification

- `node v5/tests/replay-different-tf-projection-fast-path-smoke.js` passed.
- `node v5/tests/chart-replay-pane-projection-smoke.js` passed.
- `node v5/tests/replay-chart-sync-fanout-smoke.js` passed.
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js` passed.
- `node v5/tests/replay-cadence-latency-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/multi-pane-latest-intent-audit-browser-smoke.js` passed.
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.

## Commits

- `49034e0 docs(v5): plan different timeframe next fast path`
- `ae2eab4 test(v5): expose covered different timeframe projection load`
- `49cf0b7 fix(v5): skip covered different timeframe projection loads`
