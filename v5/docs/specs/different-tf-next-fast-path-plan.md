# Step 538 Different-TF Next Fast Path Plan

## Problem

Step 537 fixed mixed-timeframe pane correctness by projecting different-TF
panes inside `replay.next`, but that can put display-window projection on the
click path even when the target pane already has enough higher-timeframe bars
to cover the new replay cursor.

For example, a `1H` pane that already has the `09:00` candle does not need a new
display-window load for replay cursor `09:31`; it only needs viewport follow
metadata updated to the new replay cursor.

## Goal

Keep Step 537's synchronized mixed-TF behavior while restoring the fast visible
path:

- do not load a display window on every `Next` when the pane already covers the
  cursor;
- sync pane-local right edge and viewport follow immediately in the covered
  case;
- load a display window only when the pane lacks the display bar needed for the
  cursor bucket.

## Steps

1. Step 538.1 - Document the fast-path plan and commit it.
2. Step 538.2 - Add focused coverage proving covered higher-timeframe cursors
   do not request a display-window load on every `Next`.
3. Step 538.3 - Implement the projection fast path in replay display-window
   runtime.
4. Step 538.4 - Run latency/projection regressions and close TODO/session docs.

## Acceptance

- Mixed-TF `Next` still updates all pane viewport cursors before `replay.next`
  returns.
- Covered higher-timeframe panes do not issue duplicate display-window loads on
  ordinary minute-by-minute `Next`.
- Same-timeframe single-pane and multi-pane append paths still use
  `APPEND_BARS` / `series.update`.

## Result

Completed in Step 538.

- Added `replay-different-tf-projection-fast-path-smoke.js` to prove a covered
  higher-timeframe pane does not issue another `barData.loadWindow` during
  cursor projection.
- Added a replay display-window fast path that checks the target pane's current
  rendered display bars. If the aligned cursor bucket is already present, the
  runtime syncs pane-local right edge and viewport follow without loading a
  display window.
- Preserved Step 537's invariant that mixed-TF panes reach the new replay
  cursor before `replay.next` returns.
- Single-pane and same-TF multi-pane traces confirm the original append path was
  not lost: `fallbackAppendMs` stayed `null`, and cadence/latest-intent gates
  remained below the 120ms observer threshold.
