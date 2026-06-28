# Step 356 - FX Replay Initial Loading Law

## Goal

Implement only the first FX Replay behavior slice:

- initial session chart state is `visible prefix bars + start bar`;
- the start bar is the latest visible replay bar;
- no future bars after the start/cursor are loaded into display state,
  rendered, or exposed to normal chart consumers;
- initial prefix demand comes from the visible viewport, not from a fixed day
  cap.

This step intentionally does not implement Next, Play, infinite left-drag prefix
loading, right-bound clamp, or retention/release. Those belong to later steps
after the initial loading law is stable.

## Ground Rules

- Do not revive the reverted full-date-range replay-session approach.
- Do not use legacy replay's continuous `chartData/cursorIndex` slice model for
  FX Replay.
- Do not make `ui/replay-controls.js`, `ui/toolbar.js`,
  `ui/calendar-navigator.js`, `data/bar-store.js`, or `chart/chart-manager.js`
  own FX Replay loading semantics.
- Keep FX Replay under `src/features/fx-replay/` with explicit runtime command
  integration.
- Keep legacy Replay behavior unchanged while Step 356 is in progress.

## Acceptance Definition

Step 356 is complete when a real-data browser smoke and manual check can start a
FX Replay session for NQ 1M and 1H and observe:

- prefix bars exist to the left;
- the session start bar is the latest visible replay bar;
- there are no visible bars after the start bar;
- initial loader/planner did not request the whole selected date range;
- the implementation has automated guards against exposing future bars.

## Step 356.1 - FX Replay Model Foundation

Completed:

- Added `src/features/fx-replay/fx-replay-model.js`.
- Defined an explicit session state with:
  - `sessionId`
  - `instrument`
  - `timeframe`
  - `sessionStart`
  - `sessionEnd`
  - `startBarTimestamp`
  - `cursorTimestamp`
  - `prefixBars`
  - `startBar`
  - `revealedForwardBars`
  - `loaderCache`
  - `viewportDemandRange`
- Added model helpers for:
  - creating a draft/session state;
  - applying resolved start bar;
  - applying prefix bars;
  - producing initial display bars.
- Added invariant checks:
  - initial display bars must not contain timestamps greater than
    `cursorTimestamp`;
  - start bar must be the latest initial display bar;
  - revealed future bars are empty before Next/Play exists.
- Added `v4/tests/fx-replay-model-smoke.js`.
- Added the model smoke to `v4/scripts/smoke_all.py --suite local`.

Checks:

- `node v4/tests/fx-replay-model-smoke.js`
- `node v4/tests/replay-model-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.2 - Loader Request Planner

Completed:

- Added `src/features/fx-replay/fx-replay-loader.js`.
- Implemented request planning only; no chart integration in this step.
- Initial plan supports:
  - a bounded start-bar resolve request around `sessionStart`;
  - one prefix request ending before `startBarTimestamp` after start bar is
    resolved.
- Initial plan guards against:
  - full date range load;
  - request beginning at session start and ending at session end;
  - prefix generation before `startBarTimestamp` is resolved.
- Added `v4/tests/fx-replay-loader-smoke.js`.
- Added the loader smoke to `v4/scripts/smoke_all.py --suite local`.

Checks:

- `node v4/tests/fx-replay-loader-smoke.js`
- `node v4/tests/fx-replay-model-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.3 - Viewport Prefix Policy

Completed:

- Added `src/features/fx-replay/fx-replay-viewport-policy.js`.
- Estimated initial prefix demand from visible chart capacity:
  - chart/container width;
  - bar spacing or visible logical range width;
  - active timeframe;
  - current desired start-bar right edge.
- Allows different screen sizes to request different prefix counts.
- Does not cap by fixed days such as 1 day for 1M or 2 days for 2M.
- Added policy smoke coverage for 1080p-like and 4K-like inputs, logical
  range priority, and max request guard.
- Added the policy smoke to `v4/scripts/smoke_all.py --suite local`.

Checks:

- `node v4/tests/fx-replay-viewport-policy-smoke.js`
- `node v4/tests/fx-replay-loader-smoke.js`
- `node v4/tests/fx-replay-model-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.4 - Initial Session Chart Projection

Completed:

- Added `src/features/fx-replay/fx-replay-controller.js` for minimal session
  start.
- Added `fxReplay.startInitialSession` runtime command.
- Added chart mode helper/source for `fx-replay` initial load.
- Added a chart-manager viewport metrics reader for the runtime command.
- Primary chart projection now supports `showEnd`, so the start bar can be the
  latest visible replay bar.
- Loads start bar and viewport-demand prefix through injected loader
  dependency.
- Projects only `prefixBars + startBar` to the primary chart runtime.
- Emits `fx-replay:changed` with minimum payload:
  - `enabled`
  - `sessionId`
  - `instrument`
  - `timeframe`
  - `sessionStart`
  - `sessionEnd`
  - `startBarTimestamp`
  - `cursorTimestamp`
  - `prefixRange`
  - `revealedCount`
  - `mode: "fx-replay"`
- Added `v4/tests/fx-replay-controller-smoke.js`.
- Added the controller smoke to `v4/scripts/smoke_all.py --suite local`.

Checks:

- `node v4/tests/fx-replay-controller-smoke.js`
- `node v4/tests/chart-mode-store-smoke.js`
- `node v4/tests/runtime-commands-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.5 - No-Future-Bars Guards

Completed:

- Added smoke coverage that fails if:
  - initial display max timestamp is greater than `startBarTimestamp`;
  - chart projection receives bars after `cursorTimestamp`;
  - loader cache exposes unrevealed future bars through display helpers.
- Added `assertFxReplayBarsDoNotExceedCursor()` and called it before initial
  chart projection.
- Extended module boundary smoke to keep FX Replay semantics out of legacy
  replay controls and keep the FX Replay controller dependency-injected rather
  than coupled to runtime/chart-store modules.
- Added `v4/tests/fx-replay-no-future-bars-smoke.js`.
- Added the no-future smoke to `v4/scripts/smoke_all.py --suite local`.

Checks:

- `node v4/tests/fx-replay-no-future-bars-smoke.js`
- `node v4/tests/fx-replay-controller-smoke.js`
- `python3 v4/tests/module-boundary-closeout-smoke.py`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.6 - Real-Data Browser Smoke

Completed:

- Added `v4/tests/fx-replay-initial-load-browser-smoke.js`.
- Uses real bars through the normal app/API path and runtime command.
- Covers:
  - NQ 1M initial session;
  - NQ 1H initial session;
  - prefix bars exist;
  - start bar is latest visible replay bar;
  - no future bars visible;
  - initial loading does not trigger full date range chart load.
- Uses `2025-06-02 10:00` as session start because `2025-06-01 18:00` is
  Sunday open and has no older prefix data, which would create a false negative
  for the first-prefix browser smoke.

Checks:

- `node --check v4/tests/fx-replay-initial-load-browser-smoke.js`
- `node v4/tests/fx-replay-initial-load-browser-smoke.js`
- `node v4/tests/fx-replay-no-future-bars-smoke.js`
- `node v4/tests/fx-replay-controller-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 356.7 - Closeout And Manual Acceptance

Completed:

- Updated TODO/session with completed checks and implementation notes.
- Recorded deferred work:
  - Step 357: left drag older-prefix demand loading and prefix release;
  - Step 358: Next/Play reveal and timeframe-correct stepping;
  - later: right-bound clamp, retention policy, history/session persistence.

Automated checks:

- `node v4/tests/fx-replay-model-smoke.js`
- `node v4/tests/fx-replay-loader-smoke.js`
- `node v4/tests/fx-replay-viewport-policy-smoke.js`
- `node v4/tests/fx-replay-controller-smoke.js`
- `node v4/tests/fx-replay-no-future-bars-smoke.js`
- `node v4/tests/fx-replay-initial-load-browser-smoke.js`
- `python3 v4/tests/module-boundary-closeout-smoke.py`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

Manual acceptance target for this step:

- 1M and 1H sessions can start with an FX Replay-like first screen:
  - prefix bars to the left;
  - start bar latest;
  - future bars absent;
  - no full selected date range load.

Implementation notes:

- The runtime entry is `COMMANDS.START_FX_REPLAY_SESSION`.
- The feature owner is `src/features/fx-replay/`.
- `fx-replay-controller.js` remains dependency-injected; `runtime/commands.js`
  composes real `loadBars`, viewport metrics, chart projection, and chart mode.
- The browser smoke uses `2025-06-02 10:00` because Sunday open has no older
  prefix data and would not validate prefix loading.
- This step intentionally does not add toolbar UI for starting FX Replay.

Deferred:

- Step 357 should add viewport-left demand loading for older prefix and release
  policy for prefix chunks outside the retained viewport buffer.
- Step 358 should add Next/Play reveal and timeframe-correct stepping.
- A later step should add right-bound clamp, history/session persistence, and
  user-facing controls once the loading/reveal laws are stable.
