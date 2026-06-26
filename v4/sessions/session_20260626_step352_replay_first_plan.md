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

## Step 352.7 Progressive Forward Loading

Status: complete.

Added `src/data/replay-progressive-forward-loader.js` and wired it from
`app.js`.

Behavior:

- The loader listens to `replay:changed`.
- It is active only for 1m replay-first ranges with an active Replay cursor.
- When the cursor is within 24 bars of the loaded window end, it loads the next
  two-hour forward window.
- The forward window is clamped by `outerRange.end`.
- Forward windows use `loadBarsWindow()`, so existing memory cache and
  in-flight dedupe apply.
- Loaded bars are appended through `bar-store`, deduped by timestamp, and
  `bars:loaded` restores Replay to the same cursor timestamp.
- If the user was playing when the forward load started, the loader emits
  `replay:resume-playback` after append so playback continues.
- Empty forward windows still move the loaded range boundary right, avoiding a
  repeated request loop on gaps/weekends.

## Step 352.8 Browser Performance Smoke

Status: complete.

Added `v4/tests/replay-first-browser-smoke.js` and exposed it through
`v4/scripts/smoke_all.py --suite browser`.

The browser smoke runs in headless Chrome against the local web page and mocks
`/v4/bars` in the browser. It verifies:

- one-year 1m replay-first initialization does not request the full outer
  range;
- initial replay loading includes day-sized chunks;
- panning to the left edge triggers a two-hour prefix load;
- replaying toward the loaded end triggers a two-hour forward load;
- progressive loads extend the stored range and keep the Replay cursor valid;
- no request grows beyond a bounded current-window span in the smoke.

Observed during the smoke:

- Replay chunks behave as intended.
- Pane/overlay synchronization can still request the whole currently loaded
  window after prefix/forward growth. In the smoke this reached about 100
  hours, not a full year, but it is the next performance target.

## Step 352.9 Bound Pane/Overlay Sync Requests

Status: complete.

Added `src/ui/comparison/comparison-replay-load-policy.js` and routed Pane 1
load requests through it.

Behavior:

- Replay-first 1m comparison sync no longer uses the full current loaded
  primary range.
- It resolves a bounded comparison window around the Replay cursor:
  cursor - 2 hours to cursor + 2 hours, plus one comparison timeframe bar on
  the right side.
- The policy can use `outerRange.start` as a fallback cursor when no active
  Replay cursor is available.
- Existing normal range behavior is unchanged outside replay-first 1m mode.
- Browser smoke now asserts progressive prefix/forward-stage `/v4/bars`
  requests stay within 24 hours during the mocked one-year replay-first
  workflow.

Result:

- The previous browser-smoke observation of Pane/overlay sync reaching about
  100 hours is fixed for progressive prefix/forward stages in the mocked
  browser workflow.

## Non-Goals For Current Batch

- No full overlay culling yet.
- No IndexedDB persistent cache yet.
- No removal of backend request limits.
- No attempt to render a full year of 1m candles.
- Manual drag/FPS tuning remains open for Step 352.11.

## Step 352.10 Real-Data Browser Validation

Status: complete.

Added `v4/tests/replay-first-real-data-browser-smoke.js` and wired it into
`v4/scripts/smoke_all.py --suite browser-real`.

Scope:

- Uses the real local web/API endpoints instead of mocked `/v4/bars`.
- Defaults to `2012-01-03 09:30` through `2012-12-31 16:00`, `TF=1m`,
  instruments `NQ,ES`.
- Disables comparison by default so the smoke validates the core replay-first
  long-range path, not unrelated comparison overlay fetches.
- For each instrument it validates initial replay window load, left-side
  progressive prefix load, forward progressive chunk load, cursor validity,
  request count, and progressive request span.

Latest local result:

- `NQ`: initial load about 395ms; forward chunk about 228ms; bars increased
  from 3871 to 3991 after prefix/forward loading; 11 `/v4/bars` calls;
  progressive request span max 3h.
- `ES`: initial load about 260ms; forward chunk about 103ms; bars increased
  from 4396 to 4516 after prefix/forward loading; 7 `/v4/bars` calls;
  progressive request span max 2h.
- Initial non-progressive pane/overlay sync can still issue a bounded 96h
  request on `NQ`; this stays below the backend guard and is separate from
  the 2h progressive prefix/forward chunks.

Interpretation:

- The one-year 1m path no longer depends on loading the full outer date range.
- Backend request limits remain useful and are not bypassed.
- Remaining user-visible drag/FPS tuning should be handled separately with
  manual browser profiling because headless smoke validates request shape and
  state correctness, not perceived drag smoothness.

## Step 352.11 Manual Drag/FPS Tuning

Status: in progress.

Planned substeps:

- Step 352.11.1: add replay-first performance diagnostics.
- Step 352.11.2: run/record real browser drag profile using the diagnostics.
- Step 352.11.3: tune the highest-impact bottleneck based on measured data.
- Step 352.11.4: enforce FX Replay start semantics.
- Step 352.11.5: remove legacy 1m long-range window fallback.
- Step 352.11.6: default Replay Bar for all timeframes.
- Step 352.11.7: manual confirmation in the real browser.

### Step 352.11.1 Replay-First Performance Diagnostics

Status: complete.

Added `src/data/replay-performance-diagnostics.js`.

Behavior:

- Diagnostics are off by default.
- Enable in browser with `?replayPerf=1` or
  `window.v4ReplayPerfDiagnostics.enable()`.
- Inspect with `window.v4ReplayPerfDiagnostics.snapshot()`.
- Disable with `window.v4ReplayPerfDiagnostics.disable()`.

Captured events:

- `bar-store:set-bars`: operation, instrument, timeframe, current bar count,
  display bar count, windowed-range flag, and duration.
- `replay-prefix:chunk`: prefix chunk range, fetched bars, added bars,
  cache hit flag, and duration.
- `replay-forward:chunk`: forward chunk range, fetched bars, added bars,
  cache hit flag, and duration.
- `chart:visible-logical-range`: visible logical range, width, and active
  chart data count.

Validation:

- `node v4/tests/replay-performance-diagnostics-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`

### Step 352.11.2 Real Browser Drag Profile

Status: complete.

Extended `v4/tests/replay-first-real-data-browser-smoke.js` so the existing
`browser-real` suite enables diagnostics during the real local API/DB NQ/ES
workflow.

Profile shape:

- Load one-year `1m` replay-first window for `NQ` and `ES`.
- Load one prefix chunk and one forward chunk.
- Move the chart visible logical range 48 times after the progressive loads.
- Record total drag profile time, visible range event count, bar-store event
  count, chunk event count, and the last active chart data count.

Latest local result:

- `NQ`: initial load about 538ms; forward chunk about 212ms; 48 drag moves
  about 1584ms; 15 visible range events; 3 bar-store events; active chart
  data count 211.
- `ES`: initial load about 183ms; forward chunk about 184ms; 48 drag moves
  about 1600ms; 16 visible range events; 4 bar-store events; active chart
  data count 211.

Interpretation:

- Headless programmatic drag is bounded and does not show a full-year render
  problem.
- Replay mode is rendering a small active slice (`activeDataCount=211`) even
  though the store holds about 4k bars after prefix/forward loading.
- Remaining manual-browser stutter is more likely tied to event/sync churn,
  overlays, status updates, or the real interactive drag path than to a
  simple "too many candles in the chart series" issue.

Validation:

- `python3 v4/scripts/smoke_all.py --suite browser-real`

### Step 352.11.3 Visible Range Coalescing

Status: complete.

Change:

- `chart-manager.subscribeVisibleLogicalRangeChange()` now coalesces callback
  delivery to animation frames. Raw diagnostic events are still recorded, but
  business handlers such as replay prefix loading receive only the latest
  range for the frame.
- `chart-pane-range-sync` now also coalesces primary/comparison pane visible
  range writes to animation frames.

Why:

- Step 352.11.2 showed the chart series is not rendering the full one-year
  dataset in replay mode (`activeDataCount=211`), so the first tuning target
  should be interactive visible-range churn rather than API chunk size.
- Coalescing keeps final range state correct while reducing same-frame work
  during real drag gestures.

Latest local result after tuning:

- `NQ`: initial load about 423ms; forward chunk about 243ms; 48 drag moves
  about 1587ms; 15 visible range events; 3 bar-store events; progressive
  request span max 3h.
- `ES`: initial load about 205ms; forward chunk about 98ms; 48 drag moves
  about 1594ms; 14 visible range events; 3 bar-store events; progressive
  request span max 2h.
- `NQ` request shape was cleaner in this run: max request span 24h instead
  of the previous occasional 96h initial sync request.

Validation:

- `python3 v4/scripts/smoke_all.py --suite browser-real`
- `python3 v4/scripts/smoke_all.py --suite local`

### Step 352.11.6 Default Replay Bar For All Timeframes

Status: complete.

User-facing rule:

- Any Date Range load, regardless of timeframe or outer range length, should
  enter Replay Bar by default.
- The visible chart can include prefix context before the operation start.
- Replay operations still begin at the Date Range start / first available bar
  after that start.

Change:

- Toolbar and Calendar load actions now route through `loadReplayFirstWindow`
  by default instead of only using it for long 1m ranges.
- Replay prefix and forward progressive loaders now request the active
  timeframe instead of hard-coding `1m`.
- Prefix/forward chunk size scales with timeframe, using at least 120 bars per
  chunk.
- Comparison loading skips transient `replayFirstRequired` failures while
  replay activation is pending, preventing Pane 1 from showing a false load
  error during Replay Bar startup.
- `smoke_all.py --suite local` now includes prefix/forward progressive loader
  smoke tests that verify non-1m timeframe requests.

Validation:

- `python3 v4/scripts/smoke_all.py --suite browser`
- `python3 v4/scripts/smoke_all.py --suite browser-real`
- `python3 v4/scripts/smoke_all.py --suite local`

Remaining:

- Headless programmatic drag does not fully represent subjective manual
  dragging. Step 352.11.5 should manually confirm in Chrome with
  `?replayPerf=1` and inspect `window.v4ReplayPerfDiagnostics.snapshot()`
  if stutter remains.

### Step 352.11.4 FX Replay Start Semantics

Status: complete.

User-facing rule:

- Date Range `start` is the Replay Bar operation start.
- Bars before Date Range `start` may be displayed as prefix context and may
  be extended further left progressively.
- Replay progress, First, Back, and initial cursor position must not count or
  enter the prefix context.
- Right side continues through Replay Bar one bar at a time, with forward
  progressive chunks loaded as needed.

Change:

- `app.js` now recognizes `replay:pending-activate-at` and avoids first
  rendering the full prefetched window as a normal chart before replay
  activation.
- Replay activation carries `replayStartTimestamp` from the outer Date Range
  start.
- `replay-controls.js` now tracks `replayStartIndex` separately from the
  absolute chart cursor index. The chart may render prefix context plus the
  cursor, but Replay Bar progress is calculated as
  `cursorIndex - replayStartIndex + 1`.
- First/Back clamp to `replayStartIndex`, so the user cannot step replay
  backward into the prefix area.

Validation:

- `python3 v4/scripts/smoke_all.py --suite browser`
- `python3 v4/scripts/smoke_all.py --suite browser-real`
- `python3 v4/scripts/smoke_all.py --suite local`

Latest real-data result:

- `NQ`: initial active chart data count 211 because prefix context is visible,
  but `cursorIndex=210`, `replayStartIndex=210`, `progressIndex=1`.
- `ES`: initial active chart data count 211 because prefix context is visible,
  but `cursorIndex=210`, `replayStartIndex=210`, `progressIndex=1`.

### Step 352.11.5 Remove Legacy 1m Long-Range Window Fallback

Status: complete.

Problem:

- A 1m date range longer than 14 days could still fall back to the older
  virtual-window path and show status text like `1m 长区间已进入窗口模式`.
- That behavior made the UI look like it was loading forward from the Date
  Range start to a later window endpoint instead of starting Replay Bar at
  Date Range start.

Change:

- `resolveChartLoadRange()` no longer returns a 14-day `windowed` range for
  long 1m requests. It now returns `replayFirstRequired: true`.
- Toolbar and Calendar continue to route long 1m ranges through replay-first.
- Tests now assert that ordinary long 1m load-range fallback is rejected and
  cannot silently reintroduce the old window mode.

Validation:

- `node v4/tests/load-range-policy-smoke.js`
- `node v4/tests/comparison-load-range-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite browser`
- `python3 v4/scripts/smoke_all.py --suite browser-real`
- `python3 v4/scripts/smoke_all.py --suite local`
