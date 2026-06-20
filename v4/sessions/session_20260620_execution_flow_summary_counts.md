# Step 301: Execution Flow Summary Counts

Date: 2026-06-20

## Goal

Make Live Record Execution Flow show order counts explicitly:

- opened order count;
- stop-loss orders set / hit / canceled;
- target orders set / hit / canceled;
- manual or market exit count.

This is derived UI state only. Review JSON and persisted Live Record schema stay unchanged.

## Plan

1. Extend `buildLiveRecordExecutionFlow()` with a `summary` object.
2. Render summary rows above the flow:
   - Open;
   - Stop;
   - Target;
   - Exit.
3. Add focused smoke coverage for:
   - manual market exit;
   - stop filled;
   - target filled.

## Acceptance

- A manual market exit trade clearly shows `Exit Manual/Market`.
- A stopped trade clearly shows `Stop ... hit`.
- A target-filled trade clearly shows `Target ... hit`.
- Raw orders remain available below the flow.

## Completed

- Added `summary` to `buildLiveRecordExecutionFlow()`.
- Summary fields:
  - `opened.filled`;
  - `stopLoss.set/hit/canceled`;
  - `target.set/hit/canceled`;
  - `exit.manual/stopHit/targetHit/matched`.
- Live Record Detail renders `Execution Summary` at the top of `Execution Flow`.
- Summary rows render:
  - `Open`;
  - `Stop`;
  - `Target`;
  - `Exit`.
- Manual market exit remains distinct from stop/target hit even when the trade result is a loss.

## Verification

- `node --check v4/src/live-record/live-record-execution-flow.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-browser-smoke.js`
- `node v4/tests/entry-context-catalog-integration-smoke.js`
- `git diff --check`
