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

## Phase 13 Step 166: Manual 1m Window Controls

Goal:

- Provide explicit previous/next chart-window navigation for long 1m research ranges.

Implemented:

- Added `resolveAdjacentWindow()` to `v4/src/data/load-range-policy.js`.
- Primary chart viewport controls now show `‹‹` / `››` only when a 1m `requestedOuterRange` is active.
- `‹‹` loads the previous 45-day window inside the outer range.
- `››` loads the next 45-day window inside the outer range.
- Edge windows disable the corresponding button.
- Toolbar start/end inputs update to the newly loaded chart window.
- Secondary chart, replay, and renderers continue to follow the current loaded window through existing `bars:loaded` behavior.

Main files:

- `v4/src/data/load-range-policy.js`
- `v4/src/ui/viewport-controls.js`
- `v4/style.css`
- `v4/TODO.md`

Validation:

- Policy smoke confirms previous/next window resolution and edge rejection.
- `node --check` passed for touched JS files.

Notes:

- This keeps window movement explicit; no automatic infinite scroll is introduced yet.

## Phase 13 Step 167: Closeout Validation

Goal:

- Validate the Phase 13 large-range protection path end to end before returning to real usage.

Validated:

- `resolveChartLoadRange()`:
  - 1-year 1m resolves to a 45-day window plus `outerRange`.
  - 31-day 1m loads directly.
  - 1-year 1H loads directly.
  - invalid date ranges are rejected.
- `resolveWindowAroundTimestamp()`:
  - Calendar target inside a 1-year 1m outer range resolves to a 45-day natural-day window around the target.
  - Target outside the outer range is rejected.
- `resolveAdjacentWindow()`:
  - Next window advances by 45 days.
  - Previous window at the first window is rejected/disabled.
  - Previous window from the second window returns to the first window.
- `bar-store`:
  - `getBars()` retains full padded bars.
  - `getDisplayBars()` returns cached requested-range bars.
  - `requestedOuterRange` is retained during windowed loads and cleared on `clearBars()`.
- Runtime smoke:
  - Full `v4/src/**/*.js` syntax check passed.
  - `git diff --check` passed.
  - `http://127.0.0.1:8001/index.html` returned `200 OK`.
  - API health returned OK.
  - API 45-day 1m window request returned bars successfully.

Milestone status:

- Phase 13 is closed for the first performance guard pass.
- Long 1m ranges are no longer loaded as one chart dataset.
- The working model is now: choose a long 1m research range, load/use 45-day chart windows, navigate by Calendar or manual Prev/Next window controls.

Remaining possible improvements:

- Object locate/open can auto-load the target 1m window using the same resolver.
- Future infinite scroll can build on `resolveAdjacentWindow()` if real usage needs it.
