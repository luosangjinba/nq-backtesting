# 2026-05-31 Large Range / 1m Performance Guard

## Phase 13 Step 162: Load Range Protection

Goal:

- Prevent accidental full-window loads that make 1m charts unusable for large ranges.
- Keep the semantics clear: this is a single chart-window limit, not a ban on viewing long-term 1m data.

Implemented:

- Added `v4/src/data/load-range-policy.js`.
- Added timeframe-specific single-window limits:
  - 1m: 45 days
  - 5m: 90 days
  - 15m: 180 days
  - 1H: 730 days
  - 4H: 1460 days
  - 1D: 3650 days
- Toolbar load now validates the requested range before calling `/v4/bars`.
- Calendar range/manual/history loads now validate through the same policy before calling `/v4/bars`.
- Over-limit requests emit a status message instead of freezing the chart with a very large `setData()`.

Main files:

- `v4/src/data/load-range-policy.js`
- `v4/src/ui/toolbar.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/TODO.md`

Notes:

- Step 162 only blocks unsafe single-window loads.
- Step 164 should convert long 1m ranges into an outer research range plus a smaller loaded chart window.

## Phase 13 Step 163: Display Bars Cache

Goal:

- Remove repeated `bars.filter(...)` work from hot read paths.
- Keep `getBars()` as the full padded dataset and `getDisplayBars()` as the chart-visible requested range.

Implemented:

- Added a cached `displayBars` array in `v4/src/data/bar-store.js`.
- `setBars()` now derives `displayBars` once from `requestedRange`.
- `getDisplayBars()` now returns the cached array directly.
- `clearBars()` clears both full bars and display bars.

Validation:

- `node --check v4/src/data/bar-store.js`
- Module smoke confirmed padded bars stay in `getBars()` while `getDisplayBars()` returns only requested-range bars.

## Phase 13 Step 164: 1m Windowed Load Mode

Goal:

- Let users choose a long 1m research range without loading the entire range into the chart.
- First version loads a safe chart window and stores the outer research range for later navigation work.

Implemented:

- Added `resolveChartLoadRange()` to `v4/src/data/load-range-policy.js`.
- Long 1m requests now resolve to:
  - `outerRange`: the user-requested research range.
  - `start/end`: the first safe chart window, capped at the 45-day 1m limit.
- `bar-store.setBars()` now accepts optional `outerRange` metadata.
- `bars:loaded` events include `requestedOuterRange` and `isWindowedRange`.
- Toolbar long 1m loads fetch the first 45-day window and update the visible toolbar inputs to that current chart window.
- Calendar range/manual/history loads share the same resolution path and still record the originally requested outer range in history.

Main files:

- `v4/src/data/load-range-policy.js`
- `v4/src/data/bar-store.js`
- `v4/src/ui/toolbar.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/TODO.md`

Validation:

- Policy smoke confirms a 1-year 1m range resolves to a 45-day window with `outerRange` metadata.
- Store smoke confirms `requestedOuterRange` is retained while `getCurrentRange()` reports the loaded chart window.

Notes:

- This is not infinite scrolling yet.
- Step 165 should use Calendar/object navigation to load the window around a target date inside the outer range.

## Phase 13 Step 165: Calendar-Driven 1m Window Switching

Goal:

- Let Calendar navigation move across a long 1m outer research range without loading the full range.

Implemented:

- Added `resolveWindowAroundTimestamp()` to `v4/src/data/load-range-policy.js`.
- Calendar `jump-day` now checks whether the target timestamp is already loaded.
- If the target is outside the current chart window but inside the current 1m `requestedOuterRange`, Calendar loads a 45-day window centered around the target date, clamped to the outer range.
- If there is no usable outer range, Calendar keeps the previous behavior and loads a small week around the target date.
- The toolbar date inputs are updated to the newly loaded chart window while the outer range remains stored in `bar-store`.

Main files:

- `v4/src/data/load-range-policy.js`
- `v4/src/ui/calendar-navigator.js`
- `v4/TODO.md`

Validation:

- Policy smoke confirms a target date in a 1-year 1m outer range resolves to a 45-day window around that target.
- Policy smoke confirms target dates outside the outer range are rejected.

Notes:

- This is explicit Calendar-driven switching, not automatic infinite scrolling.
- Object locate/open can reuse the same window resolver later if needed.
