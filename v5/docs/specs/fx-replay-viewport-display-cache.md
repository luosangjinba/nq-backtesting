# FX Replay Viewport Display Cache

This spec defines the target V5 rules for chart display history in FX Replay
after Step 369.

It supersedes prefix-only history loading as the product direction. The older
`fx-replay-prefix-demand-retention.md` spec remains useful as the Step 365 MVP
baseline, but future work should move toward viewport-driven display windows and
cache reuse.

## Scope

Applies to chart display state while a replay session is active:

- display timeframe switching;
- viewport-driven historical bar loading;
- loaded-window cache reuse;
- delayed cache release;
- no-future display guarantees across all supported timeframes.

This spec does not change replay cursor ownership or order/trade workflows.

## Time Concepts

FX Replay has two separate timeframe concepts.

- `replayTimeframe`: the session progression timeframe. Next/Play reveal exactly
  one replay-timeframe bar at a time.
- `displayTimeframe`: the chart timeframe currently being viewed. It may be any
  supported chart timeframe and may change independently of replay progression.

Rules:

- `session.timeframe` is the initial `replayTimeframe`.
- `displayTimeframe` defaults to `replayTimeframe` on chart entry.
- Switching `displayTimeframe` must not mutate the replay cursor.
- Switching `displayTimeframe` must not request a full session range or full
  left-side history.

## Right Boundary

The replay cursor is the right-side visibility boundary for every display
timeframe.

Rules:

- Display bars must not expose data to the right of the current replay cursor.
- Chart right-pan must remain clamped to the current replay cursor display
  boundary.
- Next/Play may move the replay cursor; display reload may then reveal display
  bars newly allowed by that cursor.

Higher timeframe caution:

- If a bar timestamp represents bar open time, the runtime must compute bar end
  from the display timeframe and require the bar to be complete relative to the
  cursor before rendering it.
- If the product later allows partial higher-timeframe bars, that must be an
  explicit documented exception with its own harness.

## Left Boundary

Session start is not a left-side display boundary.

Rules:

- Users can pan left from the replay start/cursor into older history.
- Older history can continue loading until the data source has no more bars.
- Left loading must be bounded and viewport-driven.
- V5 must not preload all older history in one request.

## Viewport Demand

Chart runtime owns viewport tracking and demand detection. It does not request
bars.

Demand payloads should describe the missing display window rather than only
"prefix near earliest loaded bar".

A viewport demand should include:

- `instrument`;
- `displayTimeframe`;
- `visibleFrom`;
- `visibleTo`;
- current loaded coverage for that display timeframe;
- missing bounded range or anchor/count request needed to fill visible context;
- demand direction such as `backward`, `forward-within-cache`, or
  `reload-window`.

The exact payload shape can evolve during implementation, but it must preserve
these constraints:

- demand describes viewport need;
- demand does not mutate replay state;
- demand does not request bars directly;
- demand can be satisfied from cache without fetch when coverage already exists.

## Display Window Loading

Replay runtime owns display state decisions. Bar data runtime owns bars API
requests and bar window cache.

Rules:

- replay runtime translates viewport demand into bounded bar-data window loads;
- requests are scoped by instrument and `displayTimeframe`;
- requests should approximate the viewport plus small operational padding, not
  the full session range;
- display windows are merged sparsely and sorted oldest to newest;
- bars outside the allowed cursor boundary are excluded;
- chart updates go only through chart runtime commands.

## Cache Reuse

Loaded display windows should remain available for smooth pan-back behavior.

Rules:

- Cache keys must include instrument, display timeframe, and range.
- Dragging right back into a previously loaded area should re-render from cache
  without a new bars fetch.
- Switching display timeframes must not destroy other timeframe caches.
- Caches can be released, but release must be explicit and delayed.

Recommended release policy:

- retain recently visible windows;
- retain windows within a configurable distance from current viewport;
- track optional session/pane scopes separately from cache keys so multi-pane
  reuse can survive one pane being removed;
- release session/pane scopes explicitly and defer deleting the final unscoped
  window until capacity pruning;
- release only when a capacity or distance threshold is exceeded;
- expose release decisions in runtime/cache summary for smoke tests.

Immediate off-screen release is not the target behavior for Step 369.

## Runtime Ownership

- Chart runtime owns viewport range observation, display surface writes, and
  chart right-edge clamp.
- Bar data runtime owns bars API requests, normalized bars, bounded window cache,
  and release policy execution.
- Replay runtime owns replay cursor, display timeframe, display allowed range,
  display window planning, and no-future display invariants.
- UI modules dispatch commands and subscribe to events only.

## Forbidden

- Loading all left history when a session starts or a timeframe changes.
- Loading the full replay session range as a display shortcut.
- Treating session start as a hard left boundary.
- Immediately releasing every off-screen display window.
- Letting UI or feature modules request bars directly.
- Letting UI or feature modules write chart series directly.
- Displaying higher-timeframe bars that contain data to the right of the replay
  cursor.
- Sharing display chunks across timeframes without timeframe-scoped cache keys.

## Verification

Step 369 should add harnesses for:

- arbitrary timeframe switching, not only `1m -> 1D`;
- viewport-sized initial display loading for each display timeframe;
- left pan requesting only missing bounded windows;
- right pan back into cached coverage without a new fetch;
- delayed cache release behavior;
- higher-timeframe no-future display;
- no full-history or full-session requests.

Expected checks:

- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
