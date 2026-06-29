# FX Replay Cursor Persistence

This spec defines the stable V5 rules for persisted replay cursor progression,
restore, and reset.

## Scope

Applies to replay session cursor state after initial replay loading:

- cursor persistence after Next/Play;
- chart replay restore when re-entering a session route;
- reset/restart back to the start bar;
- read-only progress values shown by the chart replay route.

It does not define auth, cross-device persistence, journal behavior, or order
execution.

## Ownership

- Replay runtime owns active cursor, reveal state, restore, and reset behavior.
- Session runtime owns persisted replay cursor records and exposes cursor
  mutation through session commands.
- Bar data runtime owns all bounded bar requests used during restore.
- Chart runtime is the only module that writes chart bars.
- UI dispatches replay commands and reads runtime state; it must not persist
  cursor state directly.

## Cursor Persistence

`replay.next` is the single one-bar advancement path. When it advances:

- replay runtime reveals exactly one active-timeframe bar;
- replay runtime persists `startBarTimestamp`, `cursorTimestamp`, and
  `revealedCount` through `session.updateCursor`;
- Play persists cursor state by repeatedly using the same `replay.next` path.

Rules:

- UI must not call `session.updateCursor` for replay progression.
- Failed or terminal Next calls must not increment persisted `revealedCount`.
- Persisted cursor updates must not request bars directly from session runtime.

## Restore

Entering chart replay for a session with stored progress restores display state
to the stored cursor.

Restore sequence:

1. Resolve the session start bar.
2. Load viewport-sized prefix bars.
3. If persisted cursor is after the start bar, load revealed bars from the
   start bar toward the stored cursor using bounded forward windows.
4. Render `prefix bars + start bar + revealed bars`.
5. Set chart right-edge limit to the restored cursor.

Rules:

- restore must not load the full session date range;
- restore request sizing is based on persisted revealed progress, not
  `sessionStart` to `sessionEnd`;
- display state must not include bars after the restored cursor;
- re-entering the same session in one app lifetime must use the latest
  persisted cursor, not a stale cursor captured at first load.

## Progress UI

The chart replay route displays read-only progress values:

- start;
- cursor;
- end;
- revealed count;
- playback state;
- replay state.

Rules:

- values come from `replay.getState` and `replay.getPlaybackState`;
- UI may hold local command-in-flight and label state only;
- local UI state is not authoritative replay/session state.

## Reset

`replay.reset` returns a replay session to its start bar.

Reset behavior:

- pauses playback;
- re-renders prefix bars plus the start bar;
- sets active cursor to the start bar;
- sets `revealedCount` to `0`;
- persists the reset cursor through session runtime;
- emits `replay:reset` as a notification.

Rules:

- UI may dispatch `replay.reset`, but must not mutate replay or session cursor
  state directly;
- reset must not request or render unrevealed future bars;
- re-entering the session after reset must restore the start-bar display, not
  the pre-reset cursor.

## Forbidden

- UI directly persisting replay cursor records.
- Restore loading a full session range for chart state.
- Chart runtime requesting restore bars.
- Bar data runtime writing chart series.
- Replay runtime mutating session repository internals directly.
- Events acting as hidden mutation paths for cursor persistence or reset.

## Verification

Current harnesses:

- `v5/tests/replay-cursor-persistence-smoke.js`
  - Next and Play persist cursor state through session commands.
- `v5/tests/replay-restore-smoke.js`
  - runtime restore uses stored cursor state and bounded windows.
- `v5/tests/replay-reset-smoke.js`
  - reset returns state and persisted cursor to the start bar.
- `v5/tests/replay-restore-browser-smoke.js`
  - browser route advance, re-enter restore, reset, and post-reset restore.
- `v5/tests/replay-controls-browser-smoke.js`
  - progress UI and controls remain command-driven.
- `v5/scripts/smoke_all.js`
  - keeps cursor persistence, restore, reset, and existing replay invariants
    running together.
