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
