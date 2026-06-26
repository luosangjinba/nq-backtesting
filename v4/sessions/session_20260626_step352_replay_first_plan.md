# Step 352 - Replay-First Long Range Plan

Status: in progress.

## Goal

Move long 1m review from range-first loading to replay-first loading.

The old model is:

```text
Date Range -> load all bars in range -> replay over loaded bars
```

The target model is:

```text
Date Range -> define outerRange -> set replay cursor -> load cursor window
```

This follows the practical shape of replay products such as FX Replay: long
history is a navigable boundary, not a single chart dataset.

## Step 352.1 Boundary

Status: complete.

Rules:

- 1m long ranges must not attempt to load the full date range.
- Backend `/v4/bars` single-request limits remain mandatory.
- Date Range defines `outerRange`.
- Replay cursor defines the current loaded window.
- Replay Bar is the primary control surface for long 1m ranges.
- Default cursor is `outerRange.start`, unless a replay history restore provides
  a better cursor.
- Bars already walked through are not guaranteed to remain in the chart.
- Future bars are loaded as cursor-adjacent chunks, not as full outer range.

## First Batch Scope

1. Freeze replay-first boundary.
2. Add explicit range model helpers/state.
3. Add replay window resolution.
4. Add chunk loader.
5. Convert long 1m Load Range into replay initialization.

## Step 352.2 Range Model

Status: complete.

Added `src/data/replay-range-model.js`.

The first pass model separates:

- `outerRange`: the selected research boundary;
- `cursorTimestamp`: the replay anchor;
- `windowRange`: the actual loaded window;
- `visibleBars`: the bars currently handed to the chart;
- `loadedChunks` / `prefetchChunks`: reserved chunk metadata.

It also adds `isReplayFirstCandidate()` so 1m long ranges can be routed away
from range-first loading.

## Step 352.3 Replay Window Policy

Status: complete.

Added `src/data/replay-window-policy.js`.

First-pass policy:

- default left context: 1 day before cursor;
- default right buffer: 3 days after cursor;
- right side clamps to `outerRange.end`;
- left-side prefix is not clamped by `outerRange.start`, because the selected
  date range is the replay study range, not the hard boundary for historical
  context bars;
- return explicit `windowRange` for the actual bars request.

This keeps the current chart dataset bounded by cursor context instead of the
full selected outer range.

## Step 352.4 Chunk Loader

Status: complete.

Added `src/data/replay-chunk-loader.js`.

The first pass chunk loader:

- splits a replay window into natural-day chunks;
- loads each chunk through `loadBarsWindow()`;
- inherits cache LRU and in-flight dedupe from `bars-window-cache`;
- merges bars by timestamp and sorts ascending;
- returns chunk metadata for later status/prefetch UI.

## Step 352.5 Replay Initialization Load

Status: complete.

Added `src/data/replay-first-loader.js` and routed long 1m Date Range loads
through replay initialization.

Behavior:

- Toolbar Load and Calendar Date Range both detect long 1m ranges with
  `isReplayFirstCandidate()`.
- The selected date range remains the `outerRange` shown in the toolbar.
- The actual API work loads only the replay cursor window.
- Prefix bars before `outerRange.start` are loaded as normal context bars, not
  discarded.
- Replay windows are loaded by daily chunks through the existing bars window
  cache.
- After `store.setBars()`, the UI emits `replay:activate-at` so Replay Bar
  starts at the first available cursor bar.
- If the selected outer start is before the first market bar in the loaded
  window, activation uses the first returned bar timestamp.

## Step 352.6 Progressive Prefix Loading

Status: complete.

Added `src/data/replay-progressive-prefix-loader.js` and wired it from
`app.js`.

Behavior:

- The loader subscribes to primary chart visible logical range changes.
- It is active only for 1m replay-first ranges with an active Replay cursor.
- When the visible range approaches the left edge, it loads the previous
  two-hour prefix window.
- Prefix windows are requested through `loadBarsWindow()`, so existing memory
  cache and in-flight dedupe apply.
- Loaded prefix bars are prepended through `bar-store`, deduped by timestamp,
  and `bars:loaded` restores Replay to the same cursor timestamp.
- Empty prefix windows still move the loaded range boundary left, avoiding a
  repeated request loop on gaps/weekends.

## Non-Goals For Current Batch

- No full overlay culling yet.
- No IndexedDB persistent cache yet.
- No removal of backend request limits.
- No attempt to render a full year of 1m candles.
- No forward progressive loading yet; Replay stops at the current loaded
  window end until Step 352.7.
