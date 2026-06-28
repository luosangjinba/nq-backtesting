# Step 351.14 - FX Replay Design Gate

## Purpose

This is a design gate for Step 352. It intentionally does not implement FX
Replay behavior.

The goal is to freeze the replay semantics before writing code, so Step 352 can
be implemented as small, reviewable commits instead of mixing design decisions
with runtime behavior changes.

## Non-Goals

- Do not modify legacy replay behavior in this step.
- Do not reintroduce the reverted Step 351 virtual-window logic.
- Do not reintroduce the reverted Step 353 replay-session implementation.
- Do not make `calendar-navigator.js`, `toolbar.js`, or legacy
  `ui/replay-controls.js` own FX Replay session loading.

## Core Semantics

FX Replay is not a sliced view of a fully loaded date range.

FX Replay is a session with a hard separation between:

- Prefix context bars: bars before the session start, loaded only to satisfy the
  current visible viewport.
- Start bar: the first replay bar selected by the session start.
- Revealed forward bars: bars at or after session start that have been exposed
  by Next/Play.
- Unrevealed future bars: bars after the current cursor that must not be loaded
  or rendered.

The default chart mode remains `history`. Existing legacy replay remains
`legacy-replay`. FX Replay must use a separate future mode, `fx-replay`, and
must not overload the legacy replay model.

## Session Model

The minimum FX Replay session state should be explicit:

- `sessionId`: stable session identifier.
- `instrument`: session instrument, such as `NQ`.
- `timeframe`: current replay timeframe in minutes.
- `sessionStart`: requested start datetime.
- `sessionEnd`: requested end datetime.
- `startBarTimestamp`: timestamp of the first replay bar.
- `cursorTimestamp`: latest revealed replay bar timestamp.
- `loadedPrefixRange`: oldest/newest loaded prefix range.
- `loadedPrefixChunks`: chunk descriptors for loaded prefix data.
- `revealedForwardRange`: start/cursor range of revealed replay bars.
- `revealedForwardBars`: currently retained revealed bars.
- `viewportDemandRange`: latest visible logical/time demand.
- `retentionPolicy`: current prefix/revealed retention settings.

The model must allow sparse loaded ranges. It must not assume one continuous
array from date range start to date range end.

## Loading Law

Initial session load:

1. Resolve `sessionStart` to the first replay bar.
2. Load that start bar.
3. Load only enough prefix bars before `sessionStart` to fill the current
   visible viewport.
4. Do not load any bars after `sessionStart`.

Forward reveal:

1. Next reveals exactly one bar for the active timeframe.
2. Play repeatedly reveals one active-timeframe bar per tick.
3. 1M advances by 1 minute, 5M by 5 minutes, 1H by 60 minutes, etc.
4. Forward requests may fetch small future chunks internally only when needed
   to reveal the next bar, but unrevealed bars must not be rendered or exposed
   as display bars.
5. The session must stop at `sessionEnd`.

Prefix loading:

1. Prefix bars are loaded only for viewport demand.
2. Dragging left may request older prefix chunks.
3. Prefix loading is not capped by a fixed day count such as 1 day for 1M or 2
   days for 2M.
4. Prefix loading is bounded by data availability and backend safety limits, not
   by an arbitrary visible-history duration.
5. Prefix chunks outside retention may be released.

Forbidden behavior:

- Do not load the whole selected date range on session entry.
- Do not preload all future bars after `sessionStart`.
- Do not let a Date Range load imply a full chart history load.
- Do not reuse legacy replay's "slice existing loaded bars" model for FX Replay.

## Viewport Law

On session entry:

- The start bar is the latest replay bar.
- Prefix bars may appear to the left as context.
- Future bars to the right of the start bar are blank/unavailable.

During navigation:

- Left drag requests older prefix if the visible range demands it.
- Right drag cannot display beyond `cursorTimestamp`.
- The chart cannot visually reveal unrevealed future bars.
- Different screen resolutions may request different prefix ranges, but both
  must follow the same viewport-demand rule.

During play:

- Revealed forward bars append to the right as the cursor advances.
- The visible range may follow cursor if follow mode is enabled.
- User-driven pan/zoom must not force future preloading.

Retention:

- Prefix chunks outside the retained viewport buffer can be released.
- Revealed forward bars should be retained enough for normal review and
  immediate pan-back, but retention must be explicit and testable.

## Module Ownership

Step 352 should introduce a separate FX Replay feature domain.

Expected modules:

- `features/fx-replay/fx-replay-model.js`
  Owns session state, cursor, loaded ranges, and invariant checks.

- `features/fx-replay/fx-replay-loader.js`
  Owns prefix and reveal data requests through the bars client/runtime boundary.

- `features/fx-replay/fx-replay-controller.js`
  Owns start, stop, next, play, pause, seek within revealed range, and lifecycle.

- `features/fx-replay/fx-replay-viewport-policy.js`
  Owns viewport demand detection, prefix load requests, right-bound clamping, and
  retention decisions.

- `features/fx-replay/fx-replay-view.js`
  Owns FX Replay toolbar/session UI rendering if new controls are needed.

- `runtime/chart-mode-store.js`
  Adds `fx-replay` as a distinct mode.

- `runtime/primary-chart-runtime.js`
  Applies projected FX Replay bars to the chart, but does not own session rules.

- `runtime/commands.js`
  Exposes commands for FX Replay lifecycle and stepping.

Modules that must not own FX Replay semantics:

- `ui/calendar-navigator.js`
- `ui/toolbar.js`
- `ui/replay-controls.js`
- `data/bar-store.js`
- `chart/chart-manager.js`

These modules may initialize UI, dispatch commands, or adapt chart primitives,
but the FX Replay loading/reveal law belongs to the FX Replay feature domain.

## Event Contract

FX Replay should emit a separate event or versioned replay event. Preferred
event:

`fx-replay:changed`

Minimum payload:

- `enabled`
- `sessionId`
- `instrument`
- `timeframe`
- `sessionStart`
- `sessionEnd`
- `cursorTimestamp`
- `startBarTimestamp`
- `revealedCount`
- `prefixRange`
- `mode: "fx-replay"`

Legacy `replay:changed` should remain for legacy replay. If shared consumers
need a common abstraction, add a small adapter later instead of changing legacy
payload meaning.

## Backend/API Expectations

The existing `/v4/bars` endpoint can remain the data source in Step 352 if
requests stay bounded.

FX Replay loaders should request:

- Prefix chunks ending at or before `sessionStart`.
- Reveal chunks starting at current cursor and ending at the next small demand
  boundary.

The frontend must treat fetched future chunks as private loader cache until
their bars are revealed. Fetched-but-unrevealed bars must not enter normal
display bars.

## Step 352 Implementation Plan Shape

Step 352 should be split into small commits:

1. Add FX Replay mode constants and no-op command stubs.
2. Add `fx-replay-model` with invariant smoke tests.
3. Add loader request planning without chart integration.
4. Add initial session start: start bar + viewport prefix only.
5. Add next/play reveal controller.
6. Add viewport prefix demand and right-bound clamp.
7. Add retention/release policy.
8. Add browser smoke for real data.
9. Add manual acceptance pass and docs.

No step should combine model, loader, viewport policy, and UI wiring in one
commit.

## Automated Acceptance For Step 352

Required smoke coverage before Step 352 is considered complete:

- Model invariant smoke:
  - session start creates no future bars.
  - next reveals one active-timeframe bar.
  - cursor cannot pass session end.

- Loader planning smoke:
  - initial load plans prefix + start only.
  - left viewport demand plans older prefix.
  - right viewport demand clamps at cursor.

- Browser smoke with real data:
  - NQ 1M session starts with start bar as latest visible replay bar.
  - 1M Next advances exactly one minute/bar.
  - 5M Next advances one 5M bar.
  - 1H Next advances one 1H bar.
  - left drag loads more prefix beyond the initially visible prefix.
  - no future bars are visible before reveal.

## Manual Acceptance For Step 352

Manual checks must be run on at least 1M and 1H:

1. Create a session from a selected start/end.
2. Confirm the first visible replay state resembles FX Replay:
   - prefix bars to the left;
   - start bar is latest visible replay bar;
   - no future bars to the right.
3. Click Next once and confirm only one active-timeframe bar appears.
4. Press Play and confirm forward reveal is smooth and timeframe-correct.
5. Drag left repeatedly and confirm older prefix continues loading beyond fixed
   day boundaries when data exists.
6. Drag right before reveal and confirm the viewport cannot expose future bars.
7. Resize or test on different resolutions and confirm prefix range changes
   according to visible demand, not fixed day caps.
8. Exit FX Replay and confirm normal history mode returns.

## Final Gate Decision

Step 351 is complete when this design gate is committed and local smoke passes.

Step 352 may start only after this document is accepted as the source of truth
for FX Replay behavior.
