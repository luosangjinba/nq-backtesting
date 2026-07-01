# FX Replay Controls UI

This spec defines the stable V5 rules for chart-page replay controls.

## Scope

Applies to the chart replay route controls for:

- Next;
- Play;
- Pause;
- Reset;
- Previous;
- truncate pick mode;
- replay playback speed / interval controls;
- floating transport positioning;
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
- `Pause` dispatches `replay.pause`;
- `Reset` dispatches `replay.reset`.

Rules:

- controls remain disabled until initial replay loading completes;
- command execution is serialized, but normal replay transport command-in-flight
  is not a disabled UI state. Next, Previous, and Play must not flash disabled
  or show a forbidden cursor while their command is being processed;
- duplicate or adjacent replay commands may queue behind the current command,
  but the route must not silently drop user transport commands just because
  another replay command is in flight;
- Play is disabled while playback is active;
- Pause is disabled while playback is inactive;
- Reset is disabled until initial replay loading completes;
- terminal replay state must not expose future bars.
- replay controls that are intentionally deferred remain visibly disabled and
  must not be wired to unrelated behavior.

Replay interval rules:

- the replay interval dropdown controls transport step size, not chart display
  timeframe;
- supported replay interval options are `1m`, `2m`, `3m`, `4m`, `5m`, `10m`,
  `15m`, `30m`, `1H`, `2H`, `3H`, and `4H`;
- replay interval must not include very large chart study intervals such as
  `1D`, `1W`, or `1M` because they are not practical transport step sizes;
- chart display interval may include the replay interval options plus `1D`,
  `1W`, and `1M`;
- UI converts the selected replay interval into a replay command `stepCount`
  relative to the session timeframe;
- for a 1m replay session, `5m` means Next, Previous, and Play move five
  session bars per transport step;
- changing the replay interval alone must not dispatch chart display timeframe
  commands;
- the active-chart sync toggle is explicit. When enabled, chart display interval
  changes copy into the replay interval selection;
- replay runtime owns the cursor/reveal mutation. The route may keep local
  interval and sync UI state, but it must only affect replay transport through
  command payloads.

The floating replay transport is viewport-level UI:

- it may be moved with the drag handle outside the chart/canvas area;
- it is clamped to the visible browser viewport;
- dragging is route-local UI state and must not mutate replay cursor,
  `displayBars`, chart data, or bar-data windows;
- modal/popover surfaces such as Settings, Go to, and truncate warnings must
  layer above the floating transport while open.

## Status

The controls UI renders read-only status from runtime state/events:

- session id is shown by the route;
- start, cursor, end, and revealed count come from `replay.getState`;
- playback state comes from `replay.getPlaybackState` and replay playback
  events;
- terminal reason comes from replay runtime playback state.

The UI may keep local view state for command in-flight handling and labels, but
must not treat local state as authoritative replay state.

When Play advances to session end, replay runtime exposes
`stoppedReason: "session-end"` through `replay.getPlaybackState`. The controls
UI must show that terminal reason in the replay state label and status message.
Manual Pause does not set a terminal stopped reason.

## Route Lifecycle

The chart replay route may subscribe to replay events for read-only refreshes.
Those subscriptions must be disposed when the route is replaced.

Rules:

- route render may attach event subscriptions;
- route replacement must call the rendered route element's cleanup hook when it
  exists;
- replay controls must not leave `replay:initialLoaded`, `replay:next`,
  `replay:reset`, or `replay:playbackChanged` listeners behind after navigating
  away.
- initial route loading is disposable. A chart route that has been unmounted
  must not continue updating its DOM after async initial-load work completes.
- stale initial replay loads must not overwrite a newer session load. Replay
  runtime is the final guard against concurrent `LOAD_INITIAL_SESSION` requests
  completing out of order.

## Browser Verification

`v5/tests/replay-controls-browser-smoke.js` verifies the user-facing command
chain:

1. create a replay session;
2. open chart replay;
3. wait for initial load and enabled controls;
4. click Next and verify one-bar advancement;
5. click Play and verify repeated advancement;
6. click Pause and verify advancement stops;
7. verify chart bar count matches replay display count;
8. resume Play and verify automatic stop at `session-end`;
9. verify progress labels reflect runtime state;
10. navigate away and verify replay event subscriptions are cleaned up.
11. verify transport buttons do not flash disabled during normal command
    execution.
12. verify floating transport can leave the chart area while staying inside the
    browser viewport and below open popovers.
13. verify replay interval controls are enabled after initial load, 5m interval
    advances five 1m session bars, and active-chart sync follows display
    interval changes.

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
- Controls persisting cursor state directly.
- Treating command-in-flight as a normal disabled visual state for replay
  transport buttons.
- Letting viewport-level floating controls cover active modal/popover surfaces.
- Allowing unmounted route async work to continue writing route DOM.
- Treating replay interval selection as a direct chart display timeframe change.
- Implementing active-chart interval sync by feature modules directly mutating
  each other's state instead of using runtime commands/events.

## Verification

Current harnesses:

- `v5/tests/replay-next-smoke.js`
  - runtime Next behavior.
- `v5/tests/replay-play-smoke.js`
  - runtime Play/Pause behavior.
- `v5/tests/replay-controls-browser-smoke.js`
  - browser-level controls interaction.
- `v5/tests/replay-floating-controls-browser-smoke.js`
  - browser-level floating transport movement, enabled interval controls, active
    interval sync, and popover layering.
- `v5/tests/replay-session-switch-smoke.js`
  - stale concurrent initial session loads are ignored.
- `v5/tests/replay-restore-browser-smoke.js`
  - browser-level re-enter restore and Reset interaction.
- `v5/tests/boundary-smoke.js`
  - feature modules do not import forbidden runtime internals.
- `v5/scripts/smoke_all.js`
  - keeps controls UI and runtime harnesses running together.
