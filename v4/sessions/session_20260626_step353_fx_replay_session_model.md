# Step 353 - FX Replay-Style Session Runtime

## Goal

Replace the old date-range chart loading model with an FX Replay-style replay session runtime.

The selected Date Range is no longer a chart payload range. It is only the replay session boundary:

- `sessionStart`: first replayable timestamp and initial cursor.
- `sessionEnd`: last replayable timestamp.
- `cursor`: current replay position.
- Initial chart rule: after entering the chart, the latest/rightmost visible K line is `sessionStart`.
- Future rule: bars after `cursor` are not requested, not retained in the replay buffer, and not rendered until that specific timestamp is being revealed.
- Prefix rule: bars before `sessionStart` are historical context. Load only enough prefix bars for the visible screen, then lazy-load more only when the user pans left.
- Memory rule: loaded prefix chunks may be released when they are far outside the active visible area.
- End rule: replay stops at `sessionEnd` and shows a finished state.

This step replaces the reverted Step 352 path and must not revive the old "load the whole selected date range, then slice it" approach.

## Product Semantics

The target behavior is modeled after FX Replay:

1. The session dialog selects an initial date/time and an end date/time.
2. Creating/opening the session enters the chart with the right edge at the initial date/time.
3. The chart is not a blank single start candle: it includes left-side historical prefix context that fills the current viewport.
4. The app does not preload extra invisible prefix chunks in the background.
5. The app does not request or preload any bars after the initial date/time.
6. Dragging/panning left near the earliest loaded bar requests the next older prefix chunk and prepends it.
7. Replay next/play is the only operation that moves `cursor` forward and reveals future bars.
8. Forward replay requests only the next bar needed for the next cursor reveal. If continuous-play tuning later uses a short transport batch, unrevealed bars must be discarded or held outside the replay buffer and never exposed to renderers.
9. Switching timeframe preserves `sessionStart`, `sessionEnd`, and `cursor`, then reloads only the visible prefix context for the new timeframe.
10. `sessionEnd` caps forward replay only; it never clips left-side historical context.

## Hard Invariants

- No UI path may call `/v4/bars` for the full selected Date Range by default.
- No primary chart path may pass future bars (`timestamp > cursor`) into the visible series.
- No background prefetch may fetch future bars (`timestamp > cursor`) before replay advances.
- No active replay buffer may retain bars with `timestamp > cursor`; renderers and stores must only see revealed bars.
- Initial session load must request a bounded visible-context window ending at `sessionStart`.
- Left prefix loading is demand-driven by viewport position, not by session length.
- The old 1m "outer range + 14-day visible window" behavior is not the target runtime for Step 353. It can remain only as temporary legacy code until replaced, but new Step 353 work should route through replay-session loading.
- Pane 1/Comparison/Calendar/overlays must not bypass the replay session by loading or displaying the full Date Range.

## Step 351 Conflict Audit

Step 351 added a safety layer for the old range-first model, but several parts directly conflict with the FX Replay runtime and must be removed or bypassed for active replay sessions.

### Conflicting Concepts

- `resolveChartLoadRange(start, end, 1)` converts long 1m ranges into `outerRange + 14-day window`.
- `outerRange` still means "the user's whole selected range", and follow-up actions can resolve different windows inside it.
- `store.setBars(result.bars, loadRange.start, loadRange.end, ..., { outerRange })` makes the active bar store represent a loaded display window, not a replay session buffer.
- `requestedOuterRange` enables follow-up window loads that are unrelated to replay cursor state.
- The cache keys are full request windows, which is fine for chunks, but the calling code currently requests old range windows rather than cursor-bound replay chunks.

### Conflicting Call Sites

- `v4/src/ui/toolbar.js`
  - `handleLoad()` currently treats Date Range as load/display range.
  - For long 1m ranges it loads the first 14 days from `start` to `start + 14d`, which includes future bars after `sessionStart`.
  - Step 353 must replace this with `create/open replay session -> initial prefix request ending at sessionStart`.

- `v4/src/ui/calendar-navigator.js`
  - `loadRange()`, `loadSelectedRange()`, `loadManualRange()`, and `loadHistoryRange()` load range windows into primary store.
  - `jumpToActiveDate()` can use `resolveWindowAroundTimestamp(outerRange, targetTimestamp)` to load a 14-day window around a target.
  - In an active replay session, Calendar must not load a window that includes future bars beyond cursor. It should either reposition within loaded visible bars, request safe prefix context, or require replay advancement for future dates.

- `v4/src/ui/viewport-controls.js`
  - Prev/Next Window buttons use `requestedOuterRange` and `resolveAdjacentWindow()` to load adjacent 14-day windows.
  - Active replay sessions should not expose these old window controls. Left panning should trigger prefix loading instead; forward movement should go through replay next/play.

- `v4/src/ui/replay/replay-history-actions.js`
  - Restore currently loads a stored range/window, then seeks replay cursor inside it.
  - Step 353 restore must recreate a replay session and load prefix context ending at the saved cursor, not load the old display window.

- `v4/src/ui/comparison/comparison-window-data.js`
  - Comparison follows the primary current range and calls `resolveChartLoadRange()` for its own display.
  - Under active replay session, Comparison must request only the visible/synced session window and must not infer a 14-day display window from primary range.

- `v4/src/ui/inspector/time-reaction-actions.js`
  - `ensurePrimaryTimeframe()` reloads the current range through `resolveChartLoadRange()`.
  - Under active replay session, timeframe switching must route through session reload ending at cursor.

### Keep From Step 351

- `loadBarsWindow()` and `bars-window-cache.js` are still useful as bounded chunk loading primitives.
- Cache entries should be used for replay chunks keyed by instrument/timeframe/start/end.
- The backend `/v4/bars` safety limit remains important.

### Remove Or Bypass From Replay Session Paths

- `outerRange` as a driver for active primary chart display.
- 14-day virtual windows as the default response to long 1m Date Range.
- Prev/Next Window buttons during active replay sessions.
- Calendar and Replay History restoring arbitrary windows inside `outerRange`.
- Comparison deriving load ranges from primary `currentStart/currentEnd` while a session is active.

## Runtime Model

### Session State

Create a dedicated replay session state/store independent from legacy load-range state.

Minimum fields:

- `instrument`
- `timeframe`
- `sessionStart`
- `sessionEnd`
- `cursor`
- `autoUpdateEnd`
- `mode`
- `loadedChunks`
- `visibleChunkRange`
- `dataEarliestTimestamp`
- `dataLatestLoadedTimestamp`

Chunk metadata should record direction and purpose:

- `prefix`: historical bars at or before cursor.
- `forward`: the next bar requested because replay advanced.

There should be no "full range loaded" state in the new runtime.

### Initial Load

Initial load is anchored to `sessionStart`.

The loader should estimate the visible bar count from the chart width/timeframe, then request a bounded prefix window:

- request end: `sessionStart`;
- request start: enough bars before `sessionStart` to fill the current viewport plus small safety padding;
- render all returned bars at or before `sessionStart`;
- set `cursor = sessionStart`;
- set the chart right edge around the start/cursor.

If viewport-size estimation is unavailable early in boot, use a conservative small fallback chunk. Do not fall back to the full Date Range.

### Left Prefix Loading

When the visible logical range approaches the earliest loaded bar:

- request the next older prefix chunk ending just before the current earliest loaded timestamp;
- prepend/merge bars by timestamp;
- keep chart ordering stable;
- do not move `cursor`;
- do not request future bars;
- skip duplicate requests for chunks already loaded or in flight.

The implementation may release old loaded chunks once they are far from the visible area, as long as panning back can re-request them.

### Forward Replay Loading

Replay next/play advances `cursor`.

If the next replay bar is already loaded, reveal it by extending the visible series by one bar.

If the next replay bar is not loaded:

- request exactly the next forward replay bar after the current cursor;
- never request past `sessionEnd`;
- append the returned bar only when it becomes the new cursor bar;
- reveal only up to the new cursor;
- stop and show a finished status if no next bar exists before or at `sessionEnd`.

Forward replay requests exist only because replay moved forward. They are not speculative future preloads. If performance tuning later proves that continuous play needs a short transport batch, that batch must stay outside the active replay buffer and any unrevealed bars must be dropped before render/store consumers can observe them.

### Timeframe Switching

Timeframe switch is a session-preserving reload:

- keep `sessionStart`;
- keep `sessionEnd`;
- keep `cursor`;
- clear loaded chunks for the old timeframe;
- request only a visible prefix window ending at `cursor` for the new timeframe;
- render only bars at or before `cursor`;
- keep forward replay capped by `sessionEnd`.

### Auto-Update End Date

`autoUpdateEnd` supports daily review.

When enabled and the session end is "latest", refresh `sessionEnd` from the current instrument's latest available timestamp before session load/resume.

This must not move `cursor` and must not trigger future-bar prefetch.

## Non-Goals

- Do not remove the backend `/v4/bars` safety limit.
- Do not load a full year of 1m bars into memory or into the chart.
- Do not preserve or reuse reverted Step 352 modules.
- Do not use Date Range as a full chart display range.
- Do not build IndexedDB persistence in the first pass.
- Do not solve multi-user/live collaboration in this step.

## Step Plan

### Step 353.1 - Rewrite Design Boundary

Freeze the corrected FX Replay semantics after the failed previous attempt.

Acceptance:

- TODO and session document explicitly say Date Range is a replay session boundary, not a display range.
- Initial load ends at `sessionStart`.
- No future bars are requested before replay advances.
- Replay advancement requests only the next reveal bar, not a retained future chunk.
- Prefix bars are visible-context only and load on demand.
- Old full-range/outer-range behavior is marked as legacy to remove from replay-session paths.

### Step 353.2 - Session State and Chunk Policy Only

Add isolated session state/store and chunk policy helpers without changing UI behavior yet.

Acceptance:

- Can create, update, serialize, and reset a session.
- Can compute initial prefix request ending at cursor/start from viewport bar capacity.
- Can compute previous-prefix requests and next-forward-bar replay requests.
- State rejects or clips requests that would load after cursor unless the request reason is the immediate next replay reveal.
- Unit smoke covers create/reset/serialize/chunk planning.

### Step 353.3 - Step 351 Bypass Gate

Add active-session guards around Step 351 range/window paths before changing the user-facing Date Range entry.

Acceptance:

- Active replay session detection is available to Toolbar, Calendar, Viewport controls, Replay History, Comparison, and Time Reaction timeframe switching.
- Old `outerRange` adjacent-window controls are hidden or disabled during active replay sessions.
- Shared load helpers can load bounded chunks without writing `requestedOuterRange` as the active primary display model.
- No active-session path calls `resolveWindowAroundTimestamp()` or `resolveAdjacentWindow()` for primary display.
- Existing non-session load behavior remains unchanged until the session entry is switched.

### Step 353.4 - Replace Date Range Load Entry With Session Initial Load

Change Date Range loading for the main chart to create/open a replay session instead of displaying the selected range.

Acceptance:

- Selecting a long 1m range does not request the full range and does not request the old 14-day window.
- First request is a bounded prefix request ending at `sessionStart`.
- Rightmost rendered bar is at or before `sessionStart`.
- Bars after `sessionStart` are absent from network requests, buffers, and rendered series.
- Existing object stores remain intact.

### Step 353.5 - Primary Chart Replay Buffer

Move primary chart rendering to an all-in replay buffer while a session is active.

Acceptance:

- Primary chart series receives only `replayVisibleBars`.
- Old `store.getDisplayBars()` full-range assumptions are removed or gated outside active sessions.
- Replay cursor, Calendar date, PDA context, notes, order/live renderers use session visible bars when active.
- Exiting a session has an explicit behavior; it must not silently show the whole Date Range.

### Step 353.6 - Demand-Driven Left Prefix Loading

Add viewport-driven prefix lazy loading.

Acceptance:

- Panning left near earliest loaded bar requests an older bounded chunk.
- No prefix request happens just because a long Date Range exists.
- Duplicate/in-flight chunks are skipped.
- Previously loaded far-left chunks may be released and re-requested later.
- Browser smoke verifies repeated left panning extends history without future leakage.

### Step 353.7 - Forward Replay Append

Make replay next/play the only source of future bars.

Acceptance:

- Next/play advances cursor one replay unit at a time.
- If needed, exactly the next forward bar is requested after cursor and clipped to `sessionEnd`.
- Network requests never retain unrevealed future bars in the active replay buffer.
- At `sessionEnd`, play stops and status says the session is finished.
- Future bars remain hidden until their timestamp becomes `<= cursor`.

### Step 353.8 - Timeframe Switching

Switch timeframe through session reload instead of full Date Range reload.

Acceptance:

- 1M/5M/15M/1H/1D keep the same `sessionStart/sessionEnd/cursor`.
- New timeframe initial request is a bounded prefix ending at cursor.
- No future bars appear after switching.
- Left prefix loading still works before `sessionStart`.

### Step 353.9 - Pane 1, Comparison, Calendar, and Overlays

Remove bypass paths that load or display the full Date Range while a replay session is active.

Acceptance:

- Pane 1 and Comparison request only visible/synced session windows.
- Overlay renderers read session-visible bars when active.
- Calendar locate either moves/reloads session context safely or refuses future display without replay advancement.
- Replay History restore recreates the session cursor model rather than loading a full old range.

### Step 353.10 - Browser Smoke

Add real browser coverage for the FX Replay behavior.

Acceptance:

- One-year 1m session initial request is bounded and ends at start.
- Initial right edge is the start/cursor.
- No request contains session-end as initial chart load end.
- Left panning loads older prefix chunks.
- Replay forward requests/reveals only the next needed bar.
- End boundary stops replay.
- Timeframe switching preserves cursor clipping.

### Step 353.11 - Manual UX Validation

Validate against actual FX Replay behavior and daily review usage.

Acceptance:

- Start date appears as the latest/rightmost K line on entry.
- The chart has enough prefix context, not a single isolated candle.
- Dragging left keeps loading older history smoothly.
- No future K lines leak before play.
- Long 1m sessions are usable without browser or server overload.
- Remaining tuning items are recorded separately.
