# Session 2026-07-14 - Step 430 Compact Replay Status Contract

## Outcome

Audited the seven-field Replay footer and froze a user-facing presentation
contract before production changes.

## Decision

- keep one compact lifecycle message: preparing, ready, complete, or
  unavailable;
- show `Future data hidden` only while unrevealed bars remain;
- do not duplicate Play/Pause or show raw session/time/count fields;
- retain those values in a versioned JSON diagnostic property;
- keep the compact surface in the bottom status row and preserve Replay
  Transport clearance;
- keep Replay Runtime as the only Replay state owner.

## Verification

- `node v6/tests/compact-replay-status-presentation-step430-smoke.js`
- `git diff --check`

## Next

Step 431 implements the accepted model/renderer/layout contract. Step 432 then
owns the broad Replay flow, responsive layout, and human visual acceptance
matrix.
