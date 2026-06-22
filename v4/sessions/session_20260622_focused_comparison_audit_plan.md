# Step 320: Focused Comparison Real-use Audit

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Step 319 closed the drawing sync audit and recorded the current readiness decision as `needs more real-use data`.

The remaining gaps are not primarily code implementation gaps. They are workflow-readiness checks that decide whether the legacy Split view can eventually be removed.

## Goal

Run one focused real-use audit session covering the remaining Comparison Window blockers:

- NQ/ES SMT review and locate;
- 1M + HTF replay progressive candles;
- Replay History restore with Comparison Window state;
- fixed layout ergonomics without old Split;
- advanced PDA tool frequency.

## Non-goals

- Do not remove Split in Step 320.
- Do not start Split removal planning unless Step 320 ends with all rows `pass` or explicitly `waived`.
- Do not migrate advanced PDA tools unless the audit shows they are frequent blockers.

## Step 320.1: NQ/ES SMT Real-use Pass

Status: pending.

Setup:

- Main: NQ.
- Comparison: ES.
- Same timeframe.
- Drawings sync state does not substitute for SMT validation; SMT depends on same-time alignment.

Actions:

- Create or review SMT evidence.
- Select SMT from chart/Inspector.
- Use locate from Inspector.

Pass:

- SMT renders on the expected charts.
- Selection opens the correct Inspector state.
- Locate lands on the expected time without old Split.

Fail:

- SMT requires old Split to understand or locate.
- Selection misses Comparison context.
- Locate silently falls back to the wrong chart/time.

## Step 320.2: 1M + HTF Replay Progressive Pass

Status: pending.

Setup:

- Main: NQ 1M.
- Comparison: NQ 1H or 4H.
- Replay On.

Actions:

- Step replay across at least one HTF candle boundary.
- Watch the Comparison HTF candle progress.
- Check hover/crosshair usability while replay is active.

Pass:

- Comparison HTF candle does not reveal future completed OHLC.
- Cursor/hover sync remains usable.
- Visual state is not misleading during replay.

Fail:

- Future HTF candle data appears early.
- Comparison chart desyncs from replay cursor.
- User still needs old Split to reason about the replay.

## Step 320.3: Replay History Restore Pass

Status: pending.

Setup:

- Comparison Window enabled.
- Non-default instrument/timeframe and moved/resized window.
- Replay state saved to History.

Actions:

- Save replay state.
- Reload app.
- Restore from History.

Pass:

- Primary cursor/range restores.
- Comparison instrument/timeframe restores.
- Comparison window state restores enough for normal review.
- No stale range or wrong symbol appears.

Fail:

- Comparison state is missing, stale, wrong timeframe, wrong instrument, or wrong window state.

## Step 320.4: Fixed Layout Ergonomics Pass

Status: pending.

Setup:

- Use Comparison Window without old Stack/Side Split for a focused review segment.

Actions:

- Move/resize floating window as needed.
- Use sliding/floating workflow for repeated comparison checks.

Pass:

- Floating/sliding window is acceptable for repeated review.
- Old Split is not required for normal comparison work.

Fail:

- Fixed Side/Stack remains materially better.
- Window movement/size management interrupts review enough to require a fixed layout mode.

## Step 320.5: Advanced PDA Frequency Pass

Status: pending.

Track every need for Comparison-context:

- OB/Breaker range draft;
- Fib;
- EQH/EQL point sets;
- other secondary-only PDA tools.

Pass:

- Needs are low-frequency or acceptable on Main/old Split until later.

Waive:

- User explicitly accepts the gap for Split removal.

Fail:

- Any advanced PDA action is frequent enough that Comparison Window cannot replace Split without migrating it.

## Step 320.6: Audit Closeout

Status: pending.

Update:

- `v4/docs/user/COMPARISON_WINDOW_REAL_USE_AUDIT.md`
- `v4/TODO.md`
- this session file

Decision options:

- `ready for Split removal planning`;
- `needs focused fixes`;
- `keep Split`.

If ready:

- Open Step 321 as Split removal planning.

If not ready:

- Open focused fix steps for the failed rows only.
