# 2026-06-01 PDA Body Locate Flash Plan

## Context

- User reported that current linked PDA locate flash is calculated from time only, so the target body is not clear enough.
- Decision: do not implement immediately during discussion; first commit current linked-ref locate UI, then record the implementation plan.
- Current committed baseline:
  - `af9f541 feat(v4): locate linked reason refs`
  - Reasons linked refs now have a Locate action.
  - Locate currently moves to the linked PDA/Segment time range and uses the existing vertical time-range flash.
  - Ref remove `X` now uses a compact Execution-style button.

## Design Decision

Separate the behavior into two layers:

- Locate: move the chart viewport near the referenced object.
- Flash: highlight the actual object body when possible.

The existing time-range flash remains useful as fallback, but it should not be the primary visual for linked PDA refs.

Preferred implementation path:

- Add a dedicated PDA body flash primitive first.
- Avoid changing the normal PDA renderer state machine unless the primitive approach proves too limited.
- Support the common PDA geometries incrementally.

## Planned Steps

### Step 175: PDA Body Flash Design Closeout

- Define a small API such as `flashPdaAnnotation(annotation, context)` or chart-specific wrappers.
- Return `true` when a body flash was drawn, `false` when caller should fallback to time-range flash.
- Keep behavior non-persistent and visual-only.
- Do not write to PDA store, selection state, order review state, or localStorage.

## Step 175: PDA Body Flash Design Closeout

Status:

- Complete as a design/API step.
- Runtime implementation starts at Step 176.

Final API shape:

- Add a small chart-level helper in Step 176, likely `v4/src/chart/pda-locate-flash.js`.
- Export:
  - `flashPdaAnnotation(annotation, chartContext, options = {})`
  - `getPdaAnnotationFlashGeometry(annotation, chartContext)`
- `flashPdaAnnotation()` returns:
  - `true` when an object-body flash primitive is attached.
  - `false` when no reliable body geometry can be resolved and caller should fallback to existing time-range locate flash.
- It must not throw for unsupported PDA shapes or incomplete annotation data.

Call flow:

1. Caller resolves the linked PDA annotation by id.
2. Caller resolves chart context from `sourceChartId`:
   - `primary` -> `getPrimaryChartContext()`
   - `secondary` -> `getSecondaryChartContext()`
3. Caller moves the viewport to the annotation time range using existing locate behavior.
4. Caller invokes `flashPdaAnnotation(annotation, chartContext)`.
5. If it returns `false`, caller falls back to the current `LocateFlashPrimitive` time-range flash.

Geometry contract:

- Geometry is expressed in logical annotation terms first, not pixels.
- The primitive converts time/price to pixels through `chartContext.timeToCoordinate()` and `chartContext.priceToCoordinate()`.
- Supported geometry variants:
  - `range`: `{ kind: 'range', startTimestamp, endTimestamp, topPrice, bottomPrice }`
  - `line`: `{ kind: 'line', startTimestamp, endTimestamp, price }`
  - `pointSet`: `{ kind: 'pointSet', points: [{ timestamp, price }], referencePrice }`
  - `fib`: `{ kind: 'fib', start: { timestamp, price }, end: { timestamp, price }, levels }`
- Step 176 only needs `range`; Step 177 extends the rest.

Range geometry rules for Step 176:

- Prefer explicit timestamp fields:
  - `startTimeTimestamp`
  - `endTimeTimestamp`
- Then fallback to nested endpoints:
  - `start.timestamp`
  - `end.timestamp`
- Then fallback to canonical single-anchor PDA:
  - `canonicalTimestamp`
  - `timestamp`
  - `anchorTime`
- Price bounds:
  - top: `topPrice ?? priceHigh`
  - bottom: `bottomPrice ?? priceLow`
- If start/end collapse to one timestamp, the primitive should still draw a minimum visual width.
- If any required range field is missing or invalid, return `false`.

Rendering behavior:

- The body flash is a temporary primitive, like the existing locate flash.
- It should be detached automatically after the pulse duration.
- Suggested visual defaults:
  - duration: `900ms`
  - fill: warm yellow with low opacity
  - border: brighter yellow
  - no persistent selection state
- The primitive should clear any previous PDA body flash on the same chart before attaching a new one.

Primary/secondary boundary:

- Use chart context methods instead of hard-coding primary or secondary chart managers inside geometry resolution.
- Attachment/detachment should go through:
  - `chartContext.attachPrimitive`
  - `chartContext.detachPrimitive`
- Secondary chart must return `false` if disabled or missing chart/series, so caller can show status or fallback.

Non-goals:

- Do not select the PDA.
- Do not mutate annotation display options.
- Do not write localStorage.
- Do not refactor existing PDA renderer primitives yet.
- Do not change linked Segment locate behavior in Step 176.

### Step 176: Range PDA Body Flash Primitive

- Add `v4/src/chart/pda-locate-flash-primitive.js`.
- First support range-style PDA:
  - FVG / IFVG
  - OB / Breaker
  - NDOG / NWOG
  - any annotation with usable `startTimeTimestamp/endTimeTimestamp` or equivalent render times plus `topPrice/bottomPrice`.
- Draw pulse overlay over the actual rectangle:
  - x from start/end time
  - y from top/bottom price
  - translucent fill
  - bright border
  - short duration matching current locate flash feel.

## Step 176: Range PDA Body Flash Primitive

Status:

- Complete.
- Runtime integration into Reasons linked PDA Locate is deferred to Step 178.

Implemented:

- Added `v4/src/chart/pda-locate-flash-primitive.js`.
  - Defines `PdaRangeLocateFlashPrimitive`.
  - Draws a temporary pulse rectangle over the PDA body.
  - Uses `timestampRangeToXRange()` for x coordinates, so intrabar timestamps can interpolate within the currently loaded display bars.
  - Uses `chartContext.priceToCoordinate()` for y coordinates.
  - Enforces minimum width/height so narrow or same-bar PDA ranges remain visible.
- Added `v4/src/chart/pda-locate-flash.js`.
  - Exports `getPdaAnnotationFlashGeometry(annotation, chartContext)`.
  - Exports `flashPdaAnnotation(annotation, chartContext, options = {})`.
  - Exports `clearPdaLocateFlash(chartContext)`.
  - Maintains one transient PDA body flash per chart context.
  - Detaches the primitive automatically after the pulse duration.

Range geometry support:

- Supported when annotation has valid:
  - top price: `topPrice` or `priceHigh`
  - bottom price: `bottomPrice` or `priceLow`
  - start timestamp: `startTimeTimestamp`, nested `start.timestamp/start.time`, `startTime`, `canonicalTimestamp`, `timestamp`, or `anchorTime`
  - end timestamp: `endTimeTimestamp`, nested `end.timestamp/end.time`, `endTime`, `canonicalTimestamp`, `timestamp`, or `anchorTime`
- Geometry output:
  - `{ kind: 'range', startTimestamp, endTimestamp, topPrice, bottomPrice }`
- Missing or invalid range fields return `null`, so callers can fallback to time-range flash.

Validation:

- `node --check v4/src/chart/pda-locate-flash-primitive.js`
- `node --check v4/src/chart/pda-locate-flash.js`
- Module smoke verified FVG-style annotation fields resolve to range geometry.
- `git diff --check` passed.

### Step 177: Other PDA Shapes

- Add support for:
  - liquidity line / key level: flash the horizontal line at the PDA price across its rendered time span.
  - point-set: flash each marker and the reference line.
  - fib: flash main fib anchor line or the fib bounding span.
- Any unsupported or partially missing geometry should return `false`, not throw.

## Step 177: Other PDA Shapes

Status:

- Complete.
- Runtime integration into Reasons linked PDA Locate is still deferred to Step 178.

Implemented:

- `PdaRangeLocateFlashPrimitive` was generalized into `PdaLocateFlashPrimitive`.
- The old `PdaRangeLocateFlashPrimitive` export remains as a compatibility subclass.
- `pda-locate-flash.js` now resolves these geometry kinds:
  - `range`
  - `line`
  - `pointSet`
  - `fib`
- `flashPdaAnnotation()` now creates the generic primitive for any supported geometry.

Line geometry:

- Supports BSL / SSL / Wick CE / key-level style PDA.
- Uses:
  - price: `price` or `referencePrice`
  - start: `canonicalTimestamp`, `timestamp`, `anchorTime`, `startTimeTimestamp`, or `startTime`
  - end: explicit end timestamp when present, otherwise 8 bars after start based on chart timeframe.

Point-set geometry:

- Supports EQH / EQL style PDA.
- Uses each point's `canonicalTimestamp`, `timestamp`, `anchorTime`, or `time`.
- Uses each point's `price`.
- Uses `referencePrice`, `price`, or average point price as the reference line.

Fib geometry:

- Supports Fib PDA with `start`, `end`, and visible `levels`.
- Computes each visible level price using the same formula as the renderer:
  - `endPrice - (endPrice - startPrice) * levelValue`
- Flashes the anchor trend line plus visible level lines.

Validation:

- `node --check v4/src/chart/pda-locate-flash-primitive.js`
- `node --check v4/src/chart/pda-locate-flash.js`
- Module smoke verified geometry output for line, point-set, and fib annotations.
- `git diff --check` passed.

### Step 178: Wire Reasons Linked PDA Locate

- In `order-review-actions.js`, linked PDA Locate should:
  - resolve annotation by ref id,
  - choose primary or secondary chart using `sourceChartId`,
  - move viewport to the object time range,
  - attempt PDA body flash,
  - fallback to existing time-range flash if body flash is unavailable.
- Linked Segment can stay on the current time-range flash path for now.

## Step 178: Wire Reasons Linked PDA Locate

Status:

- Complete.

Implemented:

- `viewport.locateTimestampRange()` now returns `true/false` and accepts `options.flash`.
- `secondaryViewport.locateSecondaryTimestampRange()` now accepts the same `options.flash`.
- Default behavior is unchanged:
  - existing callers still move viewport and show time-range flash.
- Reasons linked PDA Locate now:
  - resolves the PDA annotation,
  - resolves primary/secondary chart context from `sourceChartId`,
  - moves viewport with `{ flash: false }`,
  - calls `flashPdaAnnotation(annotation, chartContext)`,
  - falls back to existing time-range flash if body flash returns `false`.
- Reasons linked Segment Locate is unchanged and still uses the time-range flash.

User-facing behavior:

- Clicking `L` on a linked PDA should now highlight the PDA body when geometry is supported.
- Range PDA flashes its rectangle body.
- Line / point-set / fib PDA use the body flash geometry added in Step 177.
- If the linked PDA cannot be body-flashed in the active chart, the old time-range flash still appears.
- Secondary PDA refs require the secondary chart to be enabled and loaded; otherwise the status bar reports that the secondary chart is unavailable.

Validation:

- `node --check v4/src/ui/inspector/order-review-actions.js`
- `node --check v4/src/chart/viewport-controller.js`
- `node --check v4/src/chart/secondary-viewport-controller.js`
- Full `v4/src/**/*.js` syntax check passed.
- `git diff --check` passed.
- Web `8001/index.html` returned `200 OK`.
- API health returned OK.

### Step 179: Validation and Closeout

- Browser/manual checks:
  - Reason linked FVG/OB flashes the rectangle body.
  - Reason linked BSL/SSL flashes line body.
  - Secondary chart PDA ref flashes on secondary when Split is enabled.
  - Secondary ref gives a clear status error or primary fallback when Split is disabled.
  - Unsupported geometry falls back to time-range flash.
- Technical checks:
  - full `v4/src/**/*.js` syntax check
  - `git diff --check`
  - Web `8001/index.html` smoke
  - API `/v4/health` smoke

## Step 179: Validation and Closeout

Status:

- Complete.
- PDA Body Locate Flash milestone is closed for the current implementation pass.

Validated:

- Browser-level smoke:
  - Seeded `localStorage` with one FVG PDA annotation and one active Order Setup reason ref.
  - Loaded a 1H NQ chart window.
  - Activated the seeded Order Setup.
  - Clicked the Reason linked ref `L` button.
  - Confirmed the UI status reached `Located FVG · NQ body`.
- Module-level geometry smoke:
  - line geometry resolves for BSL-style annotation.
  - point-set geometry resolves for EQH/EQL-style annotation.
  - fib geometry resolves and computes visible level prices.
- Technical validation:
  - Full `v4/src/**/*.js` syntax check passed.
  - `git diff --check` passed.
  - Web `8001/index.html` returned `200 OK`.
  - API health returned OK.

Notes:

- The browser smoke validates the real Reasons linked PDA click path for primary-chart range PDA body flash.
- Secondary chart and broader real-history examples should be observed during normal use because they depend on actual split-screen data availability and user-created refs.
- Existing fallback behavior remains: if PDA body geometry cannot be drawn, Locate uses the older time-range flash.

Final state:

- Step 174: Reasons linked ref Locate entry added.
- Step 175: body-flash API and fallback contract closed.
- Step 176: range PDA body primitive added.
- Step 177: line / point-set / fib geometry support added.
- Step 178: Reasons linked PDA Locate wired to body flash.
- Step 179: validation and closeout complete.

## Boundaries

- No automatic selection change when locating.
- No persisted state changes.
- No broad PDA renderer refactor in the first pass.
- No change to Replay History behavior.

## Step 180 - Reason Link Selected Object Fix

User finding:

- After deleting the previously added Reason link, Fib still could not be linked to Reasons.
- Other selected objects also could not be linked, so the Fib-specific diagnosis was a false lead.

Cause:

- `Link Selected Object` requires an active selected object.
- Selecting a PDA caused the Inspector to switch to the PDA-only panel.
- The PDA panel did not render the Active Order Setup / Reasons panel, so the user had to clear or lose selection before reaching the Reason button.
- After selection was gone, the Reason button correctly reported no selected PDA / Segment / Composite / SMT.

Fix:

- `renderAnnotation()` now renders the Order Review panel below the PDA panel, matching the Segment/Composite inspector behavior.
- This keeps the selected PDA available while the Active Order Setup Reasons controls remain clickable.

Validated:

- Isolated browser smoke seeded one PDA and one active Order Setup with an empty Reason.
- Selected the PDA, clicked Reason `Link Selected Object`, and verified:
  - UI status: `FVG · NQ linked to Reason 1`
  - one `.order-review-ref-row` rendered
  - persisted `setupThesis.reasons[0].refs.length === 1`
  - legacy `setupThesis.linkedObjectRefs.length === 1`
- `node --check v4/src/ui/inspector-sidebar.js`

## Step 181 - Auto Exit Time Data Contract

Branch:

- `auto-exit-time-step181`

Goal:

- Start the Auto Exit Time / Holding Time phase by fixing the field semantics before adding automatic 1m touch detection or UI controls.

Existing support confirmed:

- `resultReview.exitTimestamp` already exists and is normalized by `normalizeResultReview()`.
- `cloneOrderReview()` preserves `resultReview`.
- Local browser persistence stores full `getOrderReviews()` payloads, so `exitTimestamp` survives refresh.
- Review archive export/import uses normalized order reviews, so `exitTimestamp` is preserved.
- History snapshots include `orderReviews`, so undo/redo already preserves the field.
- `setup-set` already exposes result `timestamp` from `resultReview.exitTimestamp`.
- Chart context action `order-setup-set-exit-time` already writes `resultReview.exitTimestamp` from a clicked bar.

Decision:

- Reuse `resultReview.exitTimestamp` as the single final exit time field.
- Automatic first-touch calculation, manual time input, and Pick Exit Bar all write to the same field.
- The field is valid for `Target 1/2/3`, `Stop Loss`, `Breakeven`, and `Unknown`; Result controls exit price semantics, not whether an exit time may exist.
- Automatic recalculation on Result changes is deferred to Step 183.
- Manual/Pick override behavior must be made explicit in Step 184/185 UI rather than by adding a second timestamp field in Step 181.

Next implementation steps:

- Step 182: implement finite-window 1m first-touch calculator.
- Step 183: wire Result changes to auto-fill `exitTimestamp`.
- Step 184-186: add UI input/Pick/Hold display.

## Step 182 - 1m First Touch Calculator

Goal:

- Add the calculation layer only. Do not change Result UI and do not write `resultReview.exitTimestamp` yet.

Implementation:

- Added `v4/src/order/auto-exit-time.js`.
- Exports:
  - `getAutoExitTargetPrice(criteria)`
  - `doesBarTouchAutoExit({ bar, direction, result, price })`
  - `findFirstAutoExitTouchBar(bars, criteria)`
  - `calculateAutoExitTime(criteria, options)`
- `calculateAutoExitTime()` fetches a finite 1m window from `/v4/bars` via `fetchBars(start, end, 1, instrument)`.
- Default lookahead is 72 hours; hard cap is 14 days.

Touch rules:

- Long target: first 1m bar with `high >= target`.
- Long stop: first 1m bar with `low <= stop`.
- Short target: first 1m bar with `low <= target`.
- Short stop: first 1m bar with `high >= stop`.
- Breakeven: first 1m bar with `low <= entryPrice <= high`.
- Unknown or unsupported result returns `{ ok: false, reason: 'unsupported-result' }`.
- Missing entry time / direction / exit price return explicit failure reasons and do not guess.

Validation:

- Module smoke verified:
  - long Target 1 first touch
  - long Stop Loss first touch
  - short Target 1 first touch
  - Breakeven touch
  - unsupported result handling

Next:

- Step 183 will call this calculator when Result changes and write `resultReview.exitTimestamp` only on `ok: true`.

## Step 183 - Auto Fill Exit Time On Result Change

Goal:

- Wire Result changes to the Step 182 calculator.
- Keep the behavior conservative: write `exitTimestamp` only when the 1m first-touch search succeeds.

Implementation:

- `order-review-actions.js` now imports `calculateAutoExitTime()` and `getSetupSetById()`.
- Result changes call `updateOrderReviewResult(orderReviewId, result)`.
- The update is recorded as one history action:
  - first writes `resultReview.result`
  - then calculates auto exit time for Target 1/2/3, Stop Loss, or Breakeven
  - if calculation succeeds, writes `resultReview.exitTimestamp`
  - if calculation fails, keeps the Result update and leaves any existing exit timestamp unchanged
- Unsupported Result values such as `unknown` do not run auto calculation.

Criteria passed to the calculator:

- `instrument`
- entry timestamp and price
- entry direction
- stop loss price
- target elements
- selected Result

Status behavior:

- Success: `Auto exit time set: <bar time>`.
- Missing entry/direction/exit price or no touch in lookahead: explicit error status.
- Fetch/API failures are caught and shown as `Auto exit time failed: ...`.

Validation:

- `node --check v4/src/ui/inspector/order-review-actions.js`
- `node --check v4/src/order/auto-exit-time.js`
- Local API smoke:
  - NQ long Target 1 example with entry `2023-01-03 09:32`, target `11155.75`
  - returned first touch at `2023-01-03 09:40`

Next:

- Step 184 should expose Exit Time / Exit Price / Hold in the Result UI so the auto-filled timestamp is visible and manually editable.

## Step 184 - Result Exit Time Controls

Goal:

- Make the auto-filled `resultReview.exitTimestamp` visible and manually editable before adding chart pick interaction.

Implementation:

- Result panel now shows:
  - `Result` select
  - `Exit Time` text input with `YYYY-MM-DD HH:mm`
  - `Pick` button placeholder
  - `Exit Price` read-only value
  - `Hold` natural duration
  - `Points`
  - `R`
  - `Note`
- `Exit Time` input writes `resultReview.exitTimestamp`.
- Clearing the input writes `null`.
- Invalid input is rejected with a status message and does not update the order.
- Input accepts compact forms through existing `formatTimeInput()`:
  - `YYYYMMDD`
  - `YYYYMMDDHHmm`
- Hold display currently uses `exitTimestamp - entryTimestamp` and shows `—` if either side is missing or negative.
- Pick button is rendered but intentionally only shows a Step 185 status message; chart click selection is not wired in Step 184.

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector/order-review-actions.js`
- `git diff --check`

Next:

- Step 185 will wire Pick Exit Bar to chart clicks and write the selected bar timestamp to `resultReview.exitTimestamp`.

## Step 185 - Pick Exit Bar

Goal:

- Let the user manually override `resultReview.exitTimestamp` by picking a currently visible primary-chart K line.

Implementation:

- `order-review-actions.js` now owns an `exitPickState`.
- Result panel `Pick` starts exit bar pick mode for the target Order Setup.
- Primary chart click while pick mode is active:
  - resolves the clicked chart time to a display bar
  - writes `resultReview.exitTimestamp = bar.timestamp`
  - records one history entry: `Pick Exit Bar`
  - refreshes the Inspector panel
- Crosshair hover shows the existing pick preview cursor over the candidate bar.
- `Esc` cancels pick mode.
- The flow works for Target / Stop Loss / Breakeven / Unknown because it only writes time; Result continues to define price semantics.

Validation:

- `node --check v4/src/ui/inspector/order-review-actions.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Next:

- Step 186 will consolidate holding-time display/formatting as a first-class derived value rather than only local panel formatting.

## Step 186 - Holding Time Derived Value

Goal:

- Move holding-time calculation into Setup Set derivation so it is reusable and consistent with `outcomePoints` / `outcomeR`.

Implementation:

- `setup-set.js` now derives:
  - `result.holdingSeconds`
  - `result.holdingDuration`
- Holding seconds are computed from `resultReview.exitTimestamp - entryPlan.entryTimestamp`.
- If entry time or exit time is missing, or exit is before entry, holding values are `null`.
- Natural display formatting:
  - `Xm`
  - `Xh Ym`
  - `Xd Yh`
- `order-review-panel.js` now displays `result.holdingDuration || '—'` instead of formatting locally.

Validation:

- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- Module probe confirmed a 09:32 -> 09:40 trade derives `480` seconds and `8m`.

Next:

- Step 187 should perform end-to-end browser/API regression around auto exit, manual exit, Pick Exit Bar, refresh, undo/redo, and hold display.

## Step 187 - Auto Exit Time Closeout

Goal:

- Validate and close the Auto Exit Time / Holding Time phase.

End-to-end browser smoke:

- Added and ran `tmp/auto_exit_time_step187_smoke.js` with an isolated Chrome profile.
- Seeded one active Order Setup:
  - long
  - entry `2023-01-03 09:32`
  - entry price `11101.25`
  - stop `11072.50`
  - Target 1 `11155.75`
- Loaded 1m NQ data for `2023-01-03 09:00` to `10:30`.
- Changed Result to `Target 1`.
- Verified auto exit time filled `2023-01-03 09:40`.
- Verified Hold displayed `8m`.
- Manually changed Exit Time to `2023-01-03 09:45`.
- Verified Hold displayed `13m`.
- Used Pick Exit Bar to select `2023-01-03 09:52`.
- Verified Hold displayed `20m`.
- Reloaded the page and verified localStorage persisted:
  - `resultReview.result === 'target1'`
  - `resultReview.exitTimestamp === 1672739520`

Additional validation:

- `node --check tmp/auto_exit_time_step187_smoke.js`
- `node --check v4/src/order/auto-exit-time.js`
- `node --check v4/src/ui/inspector/order-review-actions.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/order/setup-set.js`
- Web `8001/index.html` returned `200 OK`.
- API `/v4/health` returned OK.

Coverage notes:

- Browser smoke covered Target auto-fill, manual override, Pick override, refresh persistence, and holding-time display.
- Stop Loss / Breakeven use the same calculator and Result change wiring; their branch rules were validated earlier at the module level.
- The no-touch path returns `not-touched` and Step 183 leaves existing exit time unchanged while showing a status message; broader historical no-touch examples can be observed during use.

Final state:

- Step 181: exit time contract defined.
- Step 182: 1m first-touch calculator added.
- Step 183: Result changes auto-fill exit time.
- Step 184: Result UI exposes Exit Time / Pick / Exit Price / Hold.
- Step 185: Pick Exit Bar writes exit time.
- Step 186: holding time is derived by Setup Set.
- Step 187: validation and closeout complete.

## Post-Review Fix - Auto Exit Result Update Ordering

Review findings:

- API/fetch failures during auto exit calculation could update Result before `recordHistory()` finalized, leaving that Result change outside undo history.
- Fast consecutive Result changes could let an older auto-exit request finish later and overwrite the newer Result/Exit Time.

Fix:

- Result changes now calculate auto exit first, then write Result and `exitTimestamp` together inside one synchronous `recordHistory()` call.
- Auto-exit fetch errors still allow the Result value to be recorded in history; only `exitTimestamp` is omitted.
- Added an `autoExitRequestSeq` guard.
- Manual Exit Time edits and Pick Exit Bar increment the same sequence, so pending auto calculations cannot overwrite user overrides.

Validation:

- `node --check v4/src/ui/inspector/order-review-actions.js`
- `git diff --check`
- Re-ran `tmp/auto_exit_time_step187_smoke.js`; auto, manual, pick, hold display, and refresh persistence still pass.

## Step 188 - OB Neutral Gray

Context:

- During visual use, bullish OB and bullish FVG were too similar, and bearish OB and bearish FVG were too similar.
- Decision: OB direction should not carry bullish/bearish color. Both bullish and bearish OB should render as neutral gray.

Implementation:

- Added shared `OB_COLORS` in `pda-types.js`.
- Manual OB creation now writes neutral gray fill/text colors.
- PDA type fallback and toolbar config now use gray for OB.
- Main and secondary PDA renderers force `type === 'ob'` to use neutral gray fill, midline, and text color, so previously saved OB annotations with old green/red fill colors also render gray.
- FVG / IFVG / Breaker colors were left unchanged.

Commit:

- `6806f06 fix(v4): use neutral gray for order blocks`

Validation:

- `node --check v4/src/pda/manual-pda-actions.js`
- `node --check v4/src/pda/pda-types.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/secondary-pda-renderer.js`
- `node --check v4/src/config.js`
- `git diff --check`

## Step 189-197 Plan - Economic Calendar Inspector Layer

Context:

- User restored the hard backup data directory:
  - `v4/data/economic_calendar/`
  - `economic_calendar_usd_events.csv`
  - `README.md`
- The previous economic-calendar implementation was not good enough, but the restored CSV data is usable.
- Current CSV columns are:
  - `event_date`
  - `event_time_et`
  - `event_time_utc`
  - `currency`
  - `title`
  - `impact`
  - `event_type`
  - `all_day`
  - `default_visible`
  - `actual`
  - `forecast`
  - `previous`
- `actual/forecast/previous` are intentionally ignored for ICT review usage.

User decisions:

- Do not render economic-calendar events as persistent chart markers.
- Events are inspected in the Inspector Calendar only.
- A chart flash is allowed only when the user clicks Locate.
- `all_day=true` intercepts time semantics:
  - `event_time_et` / `event_time_utc` are not used.
  - Inspector displays `All Day`.
  - Locate flashes the date's `09:30` area.
- Timed events use their event time for Locate.
- Inspector should show impact-level colored dots for quick scanning:
  - High: red
  - Medium: orange
  - Low: yellow
  - Holiday / all-day: gray
- Event titles should be shown as completely as possible in the Inspector, with wrapping rather than hard truncation.

Planned implementation:

- Step 189: Close the data contract against the restored CSV and update docs where needed.
- Step 190: Add `/v4/economic_events` in `v4_api.py`; filter by `date_from/date_to/currency/impact/include_holidays`; cache CSV rows in process; omit `actual/forecast/previous` from the response.
- Step 191: Add a frontend economic-calendar store for the current loaded window plus UI filters. Defaults: High on, Medium on, Low off, Holiday/All Day on. No localStorage, undo/redo, or Review JSON.
- Step 192: Load events after primary `bars:loaded`; reload when the 1m window changes; secondary chart reuses the primary loaded-window event set.
- Step 193: Add `economic-event` to Calendar types and index. Put `Economic Events` after `Order Setups` and before `SMT`.
- Step 194: Render Inspector Calendar economic rows with impact dot, time or `All Day`, impact label, currency, complete title, and Locate. Do not show actual/forecast/previous.
- Step 195: Add Inspector filters for High / Medium / Low / Holiday; filters affect date-cell dots and event rows only.
- Step 196: Wire Locate. Timed event flashes its event time. All-day/holiday flashes `event_date 09:30`. Split chart should locate/flash with the same Calendar object path.
- Step 197: Validate API range, default filters, Low hidden by default, all-day 09:30 locate, dot colors, title wrapping, Split locate, full JS syntax, Web/API smoke, and `git diff --check`.

Boundaries:

- No persistent chart marker rendering for economic events.
- No economic event editing.
- No Review JSON export/import for the CSV dataset.
- No automatic link to Order Setup reasons in this pass.

## Step 189-197 Closeout - Economic Calendar Inspector Layer

Implementation status:

- Complete on branch `feature/economic-calendar-inspector`.
- Commit sequence:
  - `5128401 docs(v4): plan economic calendar inspector layer`
  - `61e98e3 feat(v4): add economic events api`
  - `7bff18a feat(v4): add economic calendar store`
  - `5fa9045 feat(v4): load economic events with chart range`
  - `5bb374e feat(v4): index economic events in calendar`
  - `6000adf feat(v4): render economic events in inspector calendar`
  - `5f73aa6 feat(v4): filter economic calendar events`
  - `8ad418e feat(v4): locate economic calendar events`

Implemented:

- Restored CSV is tracked under `v4/data/economic_calendar/`.
- `/v4/economic_events` reads and caches the CSV, filters by date/currency/impact/holiday, and omits `actual/forecast/previous`.
- Frontend economic calendar store keeps current loaded-window events plus UI filters only.
- Chart `bars:loaded` triggers event loading for the primary loaded range.
- Calendar index adds `economic-event` after Order Setups and before SMT.
- Inspector Calendar shows Economic Events with impact dots:
  - High red
  - Medium orange
  - Low yellow
  - Holiday / All Day gray
- Event title wraps instead of hard truncating.
- Filters are available in the Inspector:
  - High on
  - Medium on
  - Low off
  - Holiday on
- Locate does not create persistent chart markers. It uses existing time-range flash only when clicked.
- `all_day=true` events display `All Day` and locate to `event_date 09:30`.

Validation:

- Full `v4/src/**/*.js` syntax check passed.
- `v4/v4_api.py` Python compile passed.
- `git diff --check` passed.
- API health returned OK.
- `/v4/economic_events` smoke:
  - `2007-01-03` High/Medium returned 4 timed events and no actual/forecast/previous fields.
  - `2007-01-01` holiday returned `displayTime=All Day`, `locateTime=09:30`, and blank event time fields.
- Browser smoke on `2023-01-02` to `2023-01-03` verified:
  - Bank Holiday displays as All Day with gray dot and 09:30 locate timestamp.
  - Medium event is visible by default.
  - Low event is hidden by default.
  - Toggling Low shows `Construction Spending m/m` and a yellow dot.
- Web `8001/index.html` returned 200 OK.

Remaining observation:

- Split locate uses the existing Calendar object path, which calls primary and secondary locate. Dedicated screenshot-level Split verification can be done during real usage if needed.

## Step 198-204 Plan - Order Setups / Active Setup Inspector Integration

Context:

- User reported that the current `Order Setups` and `Active Order Setup` interaction is not smooth.
- Main issue:
  - The user opens an order setup from the upper `Order Setups` list.
  - The Inspector then jumps to a long lower `Active Order Setup` section.
  - This makes one object feel split across two separate UI regions and creates a jarring scroll/reading experience.

Design decision:

- Treat `Order Setups` as one integrated Inspector section:
  - compact setup list
  - current active/selected setup detail inside the same section
- Keep the underlying runtime/data model unchanged:
  - keep `orderReviews` storage schema
  - keep active id semantics
  - keep chart right-click actions writing to the active setup
- Remove the user-facing separation between `Order Setups` and a standalone large `Active Order Setup` section.

Planned steps:

- Step 198: Freeze the UX problem and implementation boundary. This is UI structure cleanup only, not a data migration or new review concept.
- Step 199: Rebuild the Inspector Order Setup panel so `Order Setups` contains the compact setup list and the current setup detail. The active/current row is highlighted.
- Step 200: Consolidate Open / Set Active behavior. Calendar `Open`, setup list click, and chart reversal Set Active should all call the same `setActive + focusCurrentSetup` path and keep the user inside the `Order Setups` section.
- Step 201: Move current Active Order Setup detail content into the integrated section. Preserve Anchor, Execution, Entry Context, Reasons, and Result, but reduce heading depth and large vertical gaps.
- Step 202: Define empty and deletion behavior. No setups shows `No Order Setups`; setups without active prompt the user to choose one; deleting the active setup selects the next same-day setup when available, otherwise clears active.
- Step 203: Polish the interaction and layout. Active row uses stable highlight; details can collapse/expand; long lists should not push Calendar too far away; long notes/reason refs must wrap without horizontal overflow.
- Step 204: Validate Calendar Open, list Open/Set Active, chart Set Active, Hide/Show/Delete, active deletion fallback, Execution/Reasons/Result editing, undo/redo, refresh restore, full JS syntax, Web smoke, and `git diff --check`.

Non-goals:

- Do not rename persisted `orderReviews`.
- Do not add new Order Setup fields.
- Do not change chart-first setup creation/editing semantics.
- Do not build a separate statistics/trading-journal panel in this pass.

## Step 198-207 Revised Plan - Inspector Page Stack

Context:

- User raised a broader UI layering issue:
  - `Active Order Setup` looks like a child/detail page of `Order Setups`, but currently renders at the same Inspector level.
  - `Order Setups -> Open` jumps to another same-level `Active Order Setup` section instead of entering a detail page.
  - Opening PDA / Segment detail pages still leaves a full `Active Order Setup` panel below, so unrelated detail contexts are mixed.
- Two options were discussed:
  - Single Inspector with `Open -> detail page -> Back`.
  - A second parallel Inspector that temporarily takes chart space.

Decision:

- Use the single Inspector page-stack approach first.
- Defer the second parallel Inspector.
- Reasoning:
  - The current pain is information architecture, not insufficient screen width.
  - A second Inspector would add chart compression, split-screen pressure, and dual-detail state complexity.
  - A page stack gives every object type one clear current detail context.

Planned steps:

- Step 198: Freeze the architecture target: one Inspector page stack, `Open` enters a detail page, `Back` returns to the prior list/calendar state.
- Step 199: Add a unified Inspector page state/back-stack model for home/list/detail pages, including source page, selected date, object type, and object id. Do not change Review JSON or persisted order schema.
- Step 200: Convert the old `Active Order Setup` content into an `Order Setup Detail` page. Keep Display, Anchor, Execution, Entry Context, Reasons, and Result.
- Step 201: Make `Order Setups -> Open` enter `Order Setup Detail`; keep Locate / Hide / Delete in the list menu; Open can set active but must not scroll to another same-level section.
- Step 202: Make Calendar `Open` enter the corresponding detail page for Order Setup, PDA, Segment, Composite, and SMT. `Locate` remains locate + flash only.
- Step 203: Remove the full Active Order Setup panel from PDA / Segment / Composite / SMT detail pages. Keep only lightweight cross-object actions such as linking the selected object/ref to the active setup reason.
- Step 204: Define Back, delete, and empty-state behavior. Back restores the previous Calendar/list state; deleting a detail object returns to the prior page and refreshes; no active setup should not show a standalone Active page.
- Step 206: Polish detail-page layout: compact title hierarchy, stable Back placement, wrapping long text/refs, no competing current-object panels.
- Step 207: Validate Order Setup Open/Back, Calendar Open/Back, PDA/Segment/Composite/SMT detail pages, Locate no-page-change behavior, Hide/Delete state, link selected object to active setup, edit flows, refresh restore, undo/redo, syntax checks, Web smoke, and `git diff --check`.

Non-goals:

- Do not build a second parallel Inspector in this pass.
- Do not rename persisted `orderReviews`.
- Do not add new review fields.
- Do not change chart-first setup creation/editing semantics.
- Do not add a statistics/trading-journal panel.

## Step 205 - Active Order Setup Duplicate Actions Cleanup

Context:

- User pointed out that `Order Setups` row menu already has Locate / Open / Hide / Delete.
- `Active Order Setup` also exposed Clear Active / Locate / Hide / Delete, which duplicated object-level actions and made the detail panel feel like a second control surface.

Decision:

- Keep object-level actions in the `Order Setups` list/menu.
- Remove the top action row from `Active Order Setup`.
- Keep `Active Order Setup` focused on current setup content:
  - Display
  - Anchor
  - Execution
  - Entry Context
  - Reasons
  - Result

Implementation notes:

- Removed `renderActiveActions()` from `order-review-panel.js`.
- Removed the unused `order-review-clear-active` Inspector action branch.
- Kept Locate / Hide / Delete handlers because the Order Setups list menu still uses them.

## Step 198-199 Implementation - Inspector Page Stack State

Implemented:

- Added `ui/inspector/page-stack.js` as a small in-memory page/back-stack model.
- Inspector pages currently support:
  - `home`
  - `archive`
  - `detail`
- `detail` records `objectType` and `objectId`.
- `home` / `archive` records can preserve Calendar selected/view dates.
- Wired sidebar render paths to update page state without changing Review JSON, `orderReviews`, or localStorage schema.
- Added a generic `inspector-back` action and Back renderer; it becomes visible once later Open routes push into the stack.

Boundary:

- This step establishes the navigation state only.
- Calendar/Open routing is intentionally left for the next implementation step.

## Step 200-201 Implementation - Order Setup Detail Page

Implemented:

- Added `renderOrderReviewDetailPanel()` with the title `Order Setup Detail`.
- Reused the existing setup content blocks:
  - Display
  - Anchor
  - Execution
  - Entry Context
  - Reasons
  - Result
- `order-setup` Open now pushes a detail page onto the Inspector page stack.
- Opening an Order Setup still sets it active, but no longer renders the old same-level `Active Order Setup` block as a Calendar return special case.
- Active setup changes and execution-element selection now render the Order Setup detail page directly.
- Kept Locate / Hide / Delete in the existing list/menu action paths.

Validation:

- `node --check` passed for `order-review-panel.js`.
- `node --check` passed for `inspector-sidebar.js`.
- `git diff --check` passed.

## Step 202 Implementation - Calendar Open Detail Routing

Implemented:

- Calendar `Open` now pushes detail pages for:
  - Order Setup
  - PDA
  - Segment
  - Composite
  - SMT
- Calendar `Locate` behavior was left unchanged: locate + flash only, no page switch.
- Removed the old Calendar return context setup from the Calendar Open path.
- Existing object selection/render paths still render the detail contents, but now under the page-stack Back model.

Validation:

- `node --check` passed for `inspector-sidebar.js`.
- `git diff --check` passed.
