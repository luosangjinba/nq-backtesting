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

Planned:

- Add `src/features/fx-replay/fx-replay-controller.js` for minimal session start.
- Add a runtime command for starting an FX Replay session.
- Enter `fx-replay` chart mode only for this new flow.
- Load start bar and viewport-demand prefix through the FX Replay loader.
- Project only `prefixBars + startBar` to the primary chart runtime.
- Emit `fx-replay:changed` with minimum payload:
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

Manual check:

- Starting a session shows prefix bars on the left.
- The start bar is the rightmost/latest visible replay bar.
- No visible future bars exist to the right.
- Legacy Replay remains available separately.

Commit after this step.

## Step 356.5 - No-Future-Bars Guards

Planned:

- Add smoke coverage that fails if:
  - initial display max timestamp is greater than `startBarTimestamp`;
  - chart projection receives bars after `cursorTimestamp`;
  - loader cache exposes unrevealed future bars through display helpers.
- Extend module boundary smoke if needed to keep FX Replay semantics out of UI
  shells and legacy replay controls.

Manual check:

- Starting FX Replay reports/derives `futureVisible=0`.
- Switching timeframe for initial session still respects the same invariant.

Commit after this step.

## Step 356.6 - Real-Data Browser Smoke

Planned:

- Add `v4/tests/fx-replay-initial-load-browser-smoke.js`.
- Use real bars through the normal app/API path.
- Cover at least:
  - NQ 1M initial session;
  - NQ 1H initial session;
  - prefix bars exist;
  - start bar is latest visible replay bar;
  - no future bars visible;
  - initial loading does not trigger full date range chart load.

Manual check:

- Run on desktop browser and compare 4K vs 1080p:
  - prefix count/range may differ;
  - neither is fixed by an arbitrary day cap;
  - right side after start is blank/unrevealed.

Commit after this step.

## Step 356.7 - Closeout And Manual Acceptance

Planned:

- Update TODO/session with completed checks and any implementation notes.
- Record deferred work:
  - Step 357: left drag older-prefix demand loading and prefix release;
  - Step 358: Next/Play reveal and timeframe-correct stepping;
  - later: right-bound clamp, retention policy, history/session persistence.
- Run:
  - FX Replay model/loader/policy/browser smokes;
  - `python3 v4/scripts/smoke_all.py --suite local`;
  - `git diff --check`.

Manual acceptance:

- 1M and 1H sessions start with FX Replay-like first screen:
  - prefix bars to the left;
  - start bar latest;
  - future bars absent;
  - no full selected date range load.

Commit after this step.
