# FX Replay Controls UI

This spec defines the stable V5 rules for chart-page replay controls.

## Scope

Applies to the chart replay route controls for:

- Next;
- Play;
- Pause;
- read-only replay status.

It does not define chart rendering internals, bar request planning, or prefix
retention behavior.

## Ownership

- UI dispatches replay commands and subscribes to events.
- Replay runtime owns cursor, reveal state, and playback state.
- Bar data runtime owns all bar requests and cache state.
- Chart runtime owns chart series writes.

The controls UI must not import replay runtime internals, chart runtime
internals, bar data runtime internals, bars API clients, or mutate runtime state
directly.

## Controls

The chart replay route exposes compact controls:

- `Next` dispatches `replay.next`;
- `Play` dispatches `replay.play`;
- `Pause` dispatches `replay.pause`.

Rules:

- controls remain disabled until initial replay loading completes;
- controls are disabled while a command is in flight;
- Play is disabled while playback is active;
- Pause is disabled while playback is inactive;
- terminal replay state must not expose future bars.

## Status

The controls UI renders read-only status from runtime state/events:

- session id is shown by the route;
- cursor comes from `replay.getState`;
- playback state comes from `replay.getPlaybackState` and replay playback
  events;
- terminal reason may be shown after a command returns no advancement.

The UI may keep local view state for command in-flight handling and labels, but
must not treat local state as authoritative replay state.

## Browser Verification

`v5/tests/replay-controls-browser-smoke.js` verifies the user-facing command
chain:

1. create a replay session;
2. open chart replay;
3. wait for initial load and enabled controls;
4. click Next and verify one-bar advancement;
5. click Play and verify repeated advancement;
6. click Pause and verify advancement stops;
7. verify chart bar count matches replay display count.

The browser smoke may use synthetic bars to isolate controls behavior from V4
data availability. Wall-clock request semantics are covered by the initial-load
spec and related harnesses.

## Forbidden

- Controls importing `replay-runtime`, `chart-runtime`, `bar-data-runtime`, or
  bars API modules.
- Controls writing chart bars directly.
- Controls requesting bars directly.
- Controls mutating replay state directly.
- Controls using events as hidden mutation channels.

## Verification

Current harnesses:

- `v5/tests/replay-next-smoke.js`
  - runtime Next behavior.
- `v5/tests/replay-play-smoke.js`
  - runtime Play/Pause behavior.
- `v5/tests/replay-controls-browser-smoke.js`
  - browser-level controls interaction.
- `v5/tests/boundary-smoke.js`
  - feature modules do not import forbidden runtime internals.
- `v5/scripts/smoke_all.js`
  - keeps controls UI and runtime harnesses running together.
