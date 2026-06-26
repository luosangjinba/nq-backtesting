# Step 351 - 1m Range Cache / Virtual Load Plan

## Problem

In public/server mode, selecting a long `1M` range can fail with:

```text
1m request is too large: estimated 527078 bars, limit 64839.
```

The backend limit is intentional and should stay. It prevents a single request
from forcing the API, DuckDB, JSON serialization, Caddy, and the browser to
handle hundreds of thousands of bars at once.

There is also a local usability issue: even when data loads, dragging a large
1m chart window is noticeably slow. The current 45-day 1m window can approach
the backend max and still leaves the chart rendering too many bars for smooth
interaction.

## Goal

Allow users to choose a large outer research range, such as one year of 1m
data, while the app only loads and renders a smaller current window.

The user-facing behavior should feel like the date range is not artificially
limited. The implementation should remain bounded:

- backend single-request limits stay enabled;
- frontend requests only the current 1m virtual window;
- already loaded windows are cached;
- navigation can move across the outer range.

## Proposed Design

Keep two ranges:

- `outerRange`: the user's full selected date range;
- `windowRange`: the currently loaded/rendered 1m slice.

For 1m long ranges:

- initial load resolves to the first virtual window inside `outerRange`;
- Prev/Next Window moves by one virtual window;
- Calendar locate and Replay History restore load the window around the target
  timestamp;
- Pane 1 / Comparison follows the same resolved window, not the full outer
  range.

Use a smaller frontend virtual window than the backend hard limit. The current
backend max is 45 days for 1m; the first frontend target should be about 10-14
days to reduce chart drag latency.

## Cache

Add an in-memory bars window cache keyed by:

```text
instrument | timeframe | windowStart | windowEnd
```

The cache should:

- return the same API payload for repeated visits to the same window;
- dedupe in-flight requests for the same key;
- use a small LRU cap so very long reviews do not grow memory without bound.

Do not start with IndexedDB. Add persistent cache only if real use shows reload
cost is still painful.

## Acceptance

Use `2012-01-01 - 2012-12-31`, `TF=1M`:

- initial load does not request the full year from `/v4/bars`;
- no backend `estimated ... limit 64839` error appears;
- the chart renders a non-empty current window;
- dragging and zooming are usable;
- Prev/Next Window can move through the outer year;
- returning to a previously loaded window uses cache;
- Pane 1 / Comparison does not bypass virtual loading.

## Non-Goals

- Do not remove backend request limits.
- Do not load a full year of 1m candles into Lightweight Charts at once.
- Do not build IndexedDB persistence in the first pass.
- Do not change the formal K-line storage schema.

## Step 351.1 Boundary Decision

Status: complete.

The backend `/v4/bars` single-request limit remains mandatory. Step 351 changes
the frontend loading model, not the server safety guard:

- long user-selected ranges are stored as `outerRange`;
- API requests use the current bounded `windowRange`;
- large 1m reviews move through the outer range by switching windows;
- cache can avoid repeated API calls, but it is not a reason to send oversized
  first requests.

## Step 351.2 Virtual Window Size

Status: complete.

The frontend 1m virtual window is now 14 days. The backend hard limit remains
45 days / `64839` estimated bars. This means a user-selected 30-day, 60-day, or
one-year 1m range is treated as an outer range, while the chart initially loads
only the first 14-day window.

Rationale:

- 45 days is a server safety ceiling, not a good rendering target.
- 14 days keeps the current visible dataset much smaller for drag/zoom.
- Large reviews can still move through the full outer range with window
  navigation.

## Step 351.3 Window Cache

Status: complete.

Added an in-memory bars window cache keyed by:

```text
instrument | timeframe | windowStart | windowEnd
```

The first pass cache:

- clones payloads before returning them to callers;
- dedupes in-flight requests for the same key;
- keeps a small LRU cap;
- does not use IndexedDB.

Business load paths are connected in later Step 351 substeps.

## Step 351.4 Primary Load Path Integration

Status: complete.

Added `data/load-bars-window.js` as the shared wrapper around `/v4/bars` and
the in-memory window cache. The primary chart load paths now use it:

- Toolbar Date Range;
- Calendar selected/manual/history/week loads;
- Viewport Prev/Next Window;
- Replay History restore;
- Time Reaction timeframe switch.

Pane 1 / Comparison is left for Step 351.5 because its follow-primary behavior
has separate replay-source and pane-status handling.

## Step 351.5 Pane 1 / Comparison Integration

Status: complete.

Pane 1 / Comparison now uses the same resolved window and cache wrapper as
primary loads. A long 1m outer range no longer gets sent directly to
`/v4/bars` from the comparison follow-primary path.

The comparison loader now:

- resolves the follow-primary range through `resolveChartLoadRange()`;
- requests only the current virtual window;
- uses `loadBarsWindow()` for the comparison bars;
- uses `loadBarsWindow()` for replay source bars when needed;
- reports cache hits in the status message.

## Step 351.7 Tests And Docs

Status: complete.

Added/updated smoke coverage:

- `load-range-policy-smoke.js`: validates 14-day 1m virtual windows.
- `bars-window-cache-smoke.js`: validates cache hits, in-flight dedupe, cloning,
  and LRU eviction.
- `comparison-load-range-smoke.js`: validates Pane 1 does not request the full
  long 1m outer range.
- `smoke_all.py --suite local`: includes the new 1m virtual-load smoke checks.

Updated user guides to explain that large 1M ranges use virtual window loading
with in-memory cache for already visited windows.
