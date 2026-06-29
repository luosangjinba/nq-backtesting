# Step 366 - V5 Replay Controls UI

## Goal

Expose the completed replay runtime behavior through usable chart-page controls
without weakening V5 runtime ownership boundaries.

## Planned Steps

### Step 366.1 - Controls Shell

- Add a compact controls area to the chart replay route.
- Keep layout consistent with the existing V5 shell.
- Do not wire runtime behavior yet beyond rendering a stable surface.

Status: complete.

### Step 366.2 - Next Control

- Add a Next button.
- Button dispatches `replay.next`.
- UI must not directly request bars or write chart series.
- Show in-flight disabled state while the command is running.

Status: complete.

### Step 366.3 - Play/Pause Controls

- Add Play and Pause controls.
- Controls dispatch `replay.play` and `replay.pause`.
- Playback state comes from replay runtime command/event state, not UI-owned
  replay state.

Status: complete.

### Step 366.4 - Replay Status

- Render status from replay runtime state/events:
  - session id;
  - cursor time;
  - playing/paused state;
  - terminal state when session end is reached.
- Keep status display read-only.

Status: complete.

### Step 366.5 - Browser Smoke

- Add `v5/tests/replay-controls-browser-smoke.js`.
- Browser smoke should create a replay session, open chart replay, click Next,
  verify chart bars/cursor advance, click Play, verify repeated advance, click
  Pause, and verify playback stops.

Status: complete.

### Step 366.6 - Controls Spec

- Add a short controls UI spec only after the interaction model stabilizes.
- Spec should document command ownership, disabled/loading behavior, and browser
  smoke expectations.

Status: complete.

## Completed

- Added chart replay controls shell.
- Wired Next through command dispatch.
- Wired Play/Pause through command dispatch.
- Rendered read-only replay status from runtime state/events.
- Added `v5/tests/replay-controls-browser-smoke.js`.
- Added `v5/docs/specs/fx-replay-controls-ui.md`.
- Review follow-up: documented command in-flight refresh locking, playback
  terminal stopped reasons, and route subscription cleanup in the controls spec.

## Boundaries

- UI dispatches commands and subscribes to events only.
- Only replay runtime owns cursor/playback state.
- Only bar data runtime requests bars.
- Only chart runtime writes chart series.
- Controls must not import chart internals, bars API clients, or mutate replay
  runtime state directly.

## Checks

- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Review Follow-Up

- Controls must stay disabled while a command is in flight, even if replay events
  refresh status before the command resolves.
- Play auto-stop at session end must surface `stoppedReason: "session-end"` from
  replay runtime playback state; manual Pause leaves stopped reason empty.
- Chart replay route event subscriptions must be disposed when navigating away.
- `v5/tests/replay-controls-browser-smoke.js` covers terminal stop display and
  listener cleanup.
