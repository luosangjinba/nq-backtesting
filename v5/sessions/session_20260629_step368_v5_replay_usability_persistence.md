# Step 368 - V5 Replay Usability And State Persistence

## Goal

Make V5 replay sessions resumable and easier to understand while preserving the
runtime boundary model established through Steps 357-367.

This step should move V5 from "the replay can advance" toward "the replay
session can be continued after navigation or refresh." It must not reintroduce
full-range chart loading or UI-owned replay state.

## Context

Completed foundation:

- replay initial load shows visible prefix plus start bar only;
- Next and Play reveal future bars one active-timeframe bar at a time;
- session end and right-pan no-future behavior are guarded;
- prefix demand and retention are bounded;
- controls dispatch replay commands and show read-only status;
- runtime contracts and boundary smokes are in place.

Remaining usability gap:

- replay cursor changes are runtime-local;
- re-entering a session route does not yet restore an advanced cursor;
- the chart page shows minimal progress context;
- there is no explicit reset/restart command.

## Planned Steps

### Step 368.1 - Persist Replay Cursor Updates

- Add a session/runtime command for updating stored replay cursor state.
- After `replay.next` advances, persist cursor timestamp and revealed count.
- Play should persist through the same Next path.
- UI must not persist replay cursor directly.

Status: pending.

### Step 368.2 - Restore Replay From Cursor

- When entering chart replay for a session with stored cursor progress, restore
  display state up to the stored cursor.
- Restoration must remain bounded and must not load the full session range.
- Start bar and no-future-bars invariants still apply.

Status: pending.

### Step 368.3 - Read-Only Replay Progress UI

- Show start, cursor, end, and revealed count in the chart replay route.
- Values come from replay/session runtime state.
- UI keeps only local view state for loading/disabled labels.

Status: pending.

### Step 368.4 - Reset/Restart Command

- Add a replay command that resets a replay session back to start.
- Reset clears persisted cursor progression and re-renders prefix plus start.
- UI may dispatch the command, but must not mutate replay/session state.

Status: pending.

### Step 368.5 - Restore Browser Smoke

- Add browser coverage for:
  - create session;
  - advance replay;
  - leave/re-enter or reload;
  - verify cursor/display restore;
  - reset back to start.

Status: pending.

### Step 368.6 - Persistence Spec

- Document stable rules for replay cursor persistence, restore, and reset.
- Include ownership boundaries and no-full-range preload constraints.
- Update this session and TODO when complete.

Status: pending.

## Manual Acceptance

- Next/Play progression is persisted through runtime/session commands.
- Re-entering a session route restores replay state without full-session preload.
- Progress UI is read-only and runtime-derived.
- Reset/restart is command-driven and returns display state to prefix plus start.
- Existing replay controls, prefix demand, retention, session-end, and
  no-future-bars smokes continue passing.

## Checks

- `node v5/tests/replay-cursor-persistence-smoke.js` if added in this step
- `node v5/tests/replay-restore-smoke.js` if added in this step
- `node v5/tests/replay-reset-smoke.js` if added in this step
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
