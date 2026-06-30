# Step 369 - V5 Viewport-Based Multi-Timeframe Display Cache

## Goal

Implement the next FX Replay display slice as a viewport-driven, cached chart
history system across all supported display timeframes.

This step is not a one-off `1m -> 1D` switch. The intended behavior applies to
any supported display timeframe transition, such as `1m -> 5m -> 1H -> 1D ->
1m`, while preserving replay cursor ownership and no-future-bars invariants.

## Product Logic

FX Replay has two separate time concepts:

- `replayTimeframe`: the session progression timeframe. Next/Play reveal one
  replay-timeframe bar at a time.
- `displayTimeframe`: the chart timeframe currently being viewed. It can change
  independently of replay progression.

For every display timeframe:

- the replay cursor is the right-side visibility boundary;
- session start is not a left-side boundary;
- left panning can keep loading older bars until the data source is exhausted;
- left history is loaded lazily by viewport demand, not all at once;
- already loaded windows should remain cached so dragging back to the right is
  smooth and does not immediately re-fetch bars;
- higher-timeframe bars must not leak data from to the right of the replay
  cursor.

## Context

Current V5 state:

- initial replay display loads visible prefix plus the start bar;
- forward replay reveals bars only through Next/Play;
- right-pan into unrevealed future is clamped;
- older prefix loading exists as bounded backward chunks;
- off-screen prefix retention currently releases chunks aggressively;
- chart runtime is a simplified DOM chart, not a full TradingView-style
  viewport engine;
- display timeframe switching is not implemented.

Important correction from product review:

- The next step must not be framed as only `1m -> 1D`.
- The current prefix retention behavior is too aggressive for the target user
  experience. FX Replay appears to keep recently loaded windows cached so
  right-dragging back into known history feels instant.
- The correct abstraction is viewport display windows plus cache, not prefix
  chunks that are immediately discarded after leaving the screen.

## Planned Steps

### Step 369.1 - Viewport Display Cache Spec

- Add `v5/docs/specs/fx-replay-viewport-display-cache.md`.
- Define replay/display timeframe separation.
- Define viewport demand windows and cache reuse rules.
- Define no-future display semantics for all timeframes.

Status: complete.

### Step 369.2 - Contracts

- Add command/event contracts for display timeframe and viewport display reload.
- Candidate commands:
  - `replay.setDisplayTimeframe`;
  - `replay.getDisplayContext`;
  - `replay.loadDisplayWindow`.
- Candidate events:
  - `replay:displayTimeframeChanged`;
  - `replay:displayWindowLoaded`;
  - `replay:displayReloaded`.

Status: complete.

### Step 369.3 - Viewport Demand

- Extend chart runtime demand beyond prefix-only semantics.
- Demand payloads should describe:
  - visible range;
  - display timeframe;
  - loaded coverage;
  - missing left/right-in-cache ranges as needed.
- Chart runtime still must not request bars.

Status: complete.

### Step 369.4 - Display Window Cache

- Cache loaded display windows by instrument, display timeframe, and range.
- Re-render from cache when panning back into loaded coverage.
- Replace immediate off-screen release with an explicit delayed release policy:
  capacity, distance, or both.
- Preserve bar data runtime as the only bars API owner.

Status: complete.

### Step 369.5 - Arbitrary Display Timeframe Switching

- Keep replay cursor/progression tied to `replayTimeframe`.
- On display timeframe change:
  - compute the viewport-sized display window around the current cursor/right
    edge;
  - load only missing bounded windows;
  - replace chart bars through chart runtime;
  - update right-edge limit for that display timeframe.

Status: complete.

### Step 369.6 - No-Future Higher-Timeframe Guard

- Define whether bar timestamps represent bar open or bar close/end.
- If timestamps represent bar open, compute bar end using timeframe duration and
  require `barEnd <= cursorTimestamp` for complete higher-timeframe bars.
- If partial higher-timeframe bars become product-approved later, document that
  as an explicit exception before implementation.

Status: complete.

### Step 369.7 - UI Controls

- Add chart display timeframe controls.
- UI dispatches replay/display commands only.
- UI derives selected timeframe/loading state from runtime events or commands.

Status: complete.

### Step 369.8 - Harnesses

Add tests for:

- arbitrary timeframe switching;
- no future leakage on higher display timeframes;
- left panning loads only bounded missing viewport windows;
- right panning back into cached windows does not fetch again;
- cache retention is delayed and observable;
- no full-history or full-session requests.

Status: complete.

## Manual Acceptance

- Creating a session still stores metadata only.
- Initial chart entry still shows context ending at the replay start/cursor.
- Session start does not cap left-side history.
- Left drag loads older bars in bounded viewport-sized windows.
- Previously loaded display windows are reused from cache.
- Display timeframe switching works for every supported timeframe, not only
  `1m -> 1D`.
- Display bars never expose data beyond the current replay cursor.
- Runtime boundaries remain intact:
  - chart runtime writes chart series;
  - bar data runtime requests/caches bars;
  - replay runtime owns cursor and display state;
  - UI dispatches commands and subscribes to events.

## Completed

- Added `v5/docs/specs/fx-replay-viewport-display-cache.md`.
- Documented `replayTimeframe` versus `displayTimeframe`.
- Documented viewport demand as missing display windows rather than prefix-only
  demand.
- Documented display-window cache reuse and delayed release as the Step 369
  target behavior.
- Documented cursor-bound no-future display rules for all supported timeframes,
  including the higher-timeframe bar-completion caveat.
- Updated `v5/docs/specs/README.md`.
- Marked the older prefix demand/retention spec as the Step 365 MVP baseline
  that Step 369 will supersede.
- Added replay display command/event contracts:
  - `replay.setDisplayTimeframe`;
  - `replay.getDisplayContext`;
  - `replay.loadDisplayWindow`;
  - `replay:displayTimeframeChanged`;
  - `replay:displayWindowLoaded`;
  - `replay:displayReloaded`.
- Added `v5/tests/replay-display-contracts-smoke.js`.
- Added the display contracts smoke to `v5/scripts/smoke_all.js`.
- Added chart viewport display context/demand contracts:
  - `chart.setDisplayContext`;
  - `chart.getViewportDemand`;
  - `chart:viewportDemand`.
- Added chart runtime viewport missing-window demand state. It describes
  display timeframe, visible range, loaded coverage, and bounded backward
  missing window without requesting bars.
- Added `v5/tests/replay-display-viewport-demand-smoke.js`.
- Added the viewport demand smoke to `v5/scripts/smoke_all.js`.
- Added bar data deferred release and explicit cache pruning:
  - `barData.pruneCache`;
  - `barData:windowReleaseDeferred`;
  - `releaseWindow({ defer: true })` keeps the window cached;
  - `pruneCache` performs explicit delayed release.
- Added `v5/tests/replay-display-window-cache-smoke.js`.
- Added the display window cache smoke to `v5/scripts/smoke_all.js`.
- Added replay runtime display state and commands:
  - `replay.setDisplayTimeframe`;
  - `replay.getDisplayContext`;
  - `replay.loadDisplayWindow`.
- Display timeframe defaults to the session replay timeframe.
- Display timeframe switching loads bounded display windows through bar data
  runtime and writes chart bars through chart runtime.
- Added cursor-bound display filtering. Display timeframes larger than the
  replay timeframe require bars to be complete before the replay cursor.
- Added `v5/tests/replay-display-timeframe-smoke.js`.
- Added `v5/tests/replay-display-timeframe-no-future-smoke.js`.
- Added both display timeframe smokes to `v5/scripts/smoke_all.js`.
- Added chart route display timeframe controls for `1m`, `5m`, `1H`, and `1D`.
  The controls dispatch `replay.setDisplayTimeframe` and derive selected state
  from replay display context/events.
- Added `v5/tests/replay-display-timeframe-browser-smoke.js`.
- Added the display timeframe browser smoke to `v5/scripts/smoke_all.js`.

## Checks

- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Verified for Step 369.1:

- `git diff --check`

Verified for Step 369.2:

- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/runtime-smoke.js`
- `git diff --check`

Verified for Step 369.3:

- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/prefix-demand-detect-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `git diff --check`

Verified for Step 369.4:

- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `git diff --check`

Verified for Step 369.5/369.6:

- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-initial-render-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `git diff --check`

Verified for Step 369.7/369.8:

- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Notes For Next Session

Step 369 is complete. The next V5 slice should continue from the remaining
product gap after viewport/display switching: route viewport-demand events into
replay display-window loads during actual chart panning, while preserving the
same runtime ownership boundaries.
