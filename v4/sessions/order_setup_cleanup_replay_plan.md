# Order Setup Cleanup Replay Plan

Purpose:

- Provide a clean replay script for rebuilding the Order Setup cleanup work from a hard backup.
- Keep this file updated for every new step from this point forward.
- Treat this as the operational checklist; use the long session file for detailed history.

Rules:

- Keep persisted compatibility schema as `OrderReview` / `orderReviews` unless a dedicated migration step is explicitly planned.
- User-facing language is `Order Setup`.
- Runtime grouping should prefer `Setup Set`.
- Reversal is the primary anchor element of one Order Setup, not a global object.
- Entry / stop / targets / reasons / result belong to the active Order Setup.
- Do not auto-assign elements by nearest reversal.
- Multiple independent Order Setups may share the same reversal bar.

## Recording Discipline

From Step 148 onward, every step must be recorded here as an operation script before it is treated as complete.

Before code changes:

- Add or update the next step section.
- Record the goal, expected files, data/schema boundary, and validation plan.
- Mark the commit as `pending`.

After implementation:

- Replace the plan notes with implemented behavior.
- Record exact validation commands and manual checks.
- Record known limitations or deferred follow-up.
- After commit, replace `pending` with the actual commit hash and subject.
- Keep `v4/TODO.md`, the current session handoff, and this replay plan synchronized.

Do not rely on chat history as the only source of truth. If a hard backup is restored, this file is the shortest clean script for replaying the branch.

## Replay Steps

### Step 136: Start Order Setup Cleanup Branch

Goal:

- Start `feature/order-setup-cleanup`.
- Converge user-visible language from `Order Review` / `Review Sets` toward `Order Setup`.
- Keep storage compatibility unchanged.

Main files:

- `v4/TODO.md`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/chart/primitives.js`

Validation:

- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `55bc770 feat(v4): simplify order setup inspector focus`

Notes:

- Reversal starts moving toward a single-bar marker instead of a price line.

### Step 139: Add Per-Setup Show / Hide

Goal:

- Allow overlapping setups to be hidden without deleting them.
- Store visibility as compatibility-safe `order.display.hidden`.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for `display.hidden` normalize/update/projection/rendering.

Commit:

- `86f947b feat(v4): toggle order setup visibility`

### Step 140A: Focus Inspector On Calendar Navigation

Goal:

- Stop default Inspector from listing full SMT / Structure Sets panels.
- Keep Calendar as the object index and Open entry.
- Keep Archive tools available but collapsed.

Main files:

- `v4/src/ui/inspector/archive-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/archive-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `8c521d3 feat(v4): focus inspector on calendar navigation`

### Step 140: Clean Up Linked Refs Display

Goal:

- Show readable linked ref labels instead of raw `role:type:id`.
- Preserve secondary chart source metadata in Inspector.
- Keep existing dedupe and remove-by-row behavior.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- Module smoke: rendered refs include readable role/type/source and no raw `context:pda:`.
- Module smoke: `normalizeOrderReview()` dedupes duplicate linked refs.
- `git diff --check`

Commit:

- `a12d310 feat(v4): clean up order setup linked refs`

### Step 141: Locate Order Setups Through Setup Sets

Goal:

- Keep renderer/locate aligned with Setup Set runtime model.
- Route Inspector `Locate` through `locateSetupSet()` instead of legacy Review Set locator.

Main files:

- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for `locateSetupSet()` expected range.
- `git diff --check`

Commit:

- `619a397 refactor(v4): locate order setups through setup sets`

### Step 142: Verify Persistence Compatibility

Goal:

- Confirm localStorage, Review JSON, and undo/redo still use `orderReviews`.
- Ensure old records default `display.hidden=false`.
- Update user-visible persistence labels to Order Setup.

Main files:

- `v4/src/review/review-archive.js`
- `v4/src/order/order-review-persistence.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/review/review-archive.js`
- `node --check v4/src/order/order-review-persistence.js`
- `node --check v4/src/history/history-manager.js`
- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke: old records default hidden false and hidden state survives snapshot/restore.
- `git diff --check`

Commit:

- `21a69b1 chore(v4): verify order setup persistence compatibility`

### Step 143: Document Order Setup Boundary

Goal:

- Document that UI is `Order Setup`, runtime is `Setup Set`, persisted storage is `orderReviews`.
- Document no schema rename until dedicated migration.
- Update Chinese and English user guides.

Main files:

- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/docs/USER_GUIDE.zh-CN.md`
- `v4/docs/USER_GUIDE.en.md`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `git diff --check`

Commit:

- `b50cf94 docs(v4): document order setup cleanup boundary`

### Step 145 / 146: Rebuild Active Setup UI And Anchor Writes

Goal:

- Replace form-style Active Order Setup UI with Header / Anchor / Execution / Reasons / Result.
- Use chart-first active setup workflow.
- Require entry/stop/target writes to hit valid bar high/low range.
- Store stop/target/final target anchor timestamp/timeframe.
- Add Calendar Order Setups Hide/Show.
- Render stop/target/final target lines from their own anchors when present.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/ui/inspector/calendar-panel.js`
- `v4/src/chart/primitives.js`
- `v4/style.css`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-chart-actions.js`
- `node --check v4/src/ui/inspector/calendar-panel.js`
- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/chart/primitives.js`
- Module smoke for stop/target timestamp projection.
- Module smoke for active setup UI sections and no old Setup Thesis / Advanced Edit leakage.
- `git diff --check`

Commit:

- `5c59370 feat(v4): rebuild active order setup panel`

### Step 147A: Reversal Marker Right-Click MVP

Goal:

- Start Order Setup element interaction layer.
- Add reversal triangle hit-test.
- Right-click reversal marker shows setup-specific menu.
- Shared reversal marker can list multiple setup ids.
- Menu supports Set Active and Close Active Setup.

Main files:

- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/pda/manual-annotation.js`
- `v4/TODO.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-hit-test.js`
- `node --check v4/src/order/order-setup-chart-actions.js`
- `node --check v4/src/pda/manual-annotation.js`
- Module smoke: reversal hit-test returns expected setup id.
- `git diff --check`

Commit:

- `da5b84c feat(v4): activate setups from reversal marker menu`

### Step 147B: Active Reversal Marker Highlight

Goal:

- Active setup reversal marker is larger and yellow.
- Non-active bullish/bearish markers remain green/red.

Main files:

- `v4/src/order/order-review-renderer.js`

Validation:

- `node --check v4/src/order/order-review-renderer.js`
- `git diff --check`

Commit:

- `18e6ffb style(v4): highlight active reversal marker`

### Step 147C: Active Setup Opens Inspector

Goal:

- Set Active automatically opens Inspector.
- Inspector refreshes to default panel and scrolls to Active Order Setup.
- Clear/Close Active refreshes but does not force open.

Main files:

- `v4/src/ui/inspector-sidebar.js`

Validation:

- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `05d9cc7 feat(v4): open inspector for active setup`

## Remaining Work

- Step 137: Clean up `order-setup-chart-actions.js` action boundary and menu exposure.
- Step 138: Reduce legacy Review Set adapter usage where runtime can consume Setup Set directly.
- Step 144: Remove `Set Reversal Here` or rename it to `Move Active Reversal Here`.
- Step 147: Add element selection state for entry / stop / targets / final target.
- Step 147: Add length controls for selected helper lines.
- Step 147: Add delete actions for selected setup elements.

### Step 147D: Entry / Stop / Target Element Editing MVP

Goal:

- Add hit-test and selection for entry, stop loss, target1, target2, target3, and final target helper lines.
- Show the selected setup element in Active Order Setup Inspector.
- Allow selected helper line length to be edited by bars.
- Allow deleting selected entry / stop / target elements.
- Keep reversal deletion out of scope because reversal is the primary setup anchor.

Implemented:

- Added `order/order-setup-selection.js` for selected order setup element state.
- Primary chart clicks can select entry, stop loss, target1, target2, target3, and final target helper lines.
- Selecting a helper line also activates that setup and opens the Active Order Setup Inspector panel.
- Renderer highlights the selected helper line in yellow dashed style.
- Helper line lengths persist in `order.display.elementLengths[role]` without changing the existing `orderReviews` compatibility schema.
- Active Order Setup Inspector shows the selected element, its time/price, a `Length bars` numeric input, and a delete button.
- Right-clicking an editable helper line shows menu actions to select or delete that element.
- Deleting entry / stop / target clears only that element's underlying entry plan fields; reversal deletion remains out of scope.

Main files:

- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-selection.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-hit-test.js`
- `node --check v4/src/order/order-setup-chart-actions.js`
- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/order/order-setup-selection.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/app.js`
- Module smoke for hit-test, length persistence, and element deletion.
- `git diff --check`

Commit:

- `cb94ed8 feat(v4): edit order setup helper lines`

Notes:

- First implementation should use numeric bars input instead of drag handles.
- Hit-test should select an element by setup id and element role, not by nearest reversal.
- Length input supports clearing the value to fall back to the default renderer length.

### Step 147E: Time-Anchored Helper Line Endpoints

Goal:

- Replace the primary length workflow for entry / stop / targets with start and end timestamps.
- Keep normal right-click actions as the start anchor setters.
- Add Shift + right-click endpoint setters for entry / stop / target1 / target2 / target3 / final target.
- Render helper lines from start timestamp to end timestamp when an end timestamp exists.
- When timeframe changes, recompute the visible line span from start/end timestamps instead of preserving a fixed bar count.
- Preserve Step 147D `Length bars` as a fallback/manual override for records without endpoint timestamps.

Implemented:

- `LiquidityPrimitive` now supports explicit `endTime`; when present it draws from anchor time to end time instead of fixed bar length.
- Added normalized end timestamp/timeframe fields for entry, stop loss, target1, target2, target3, and final target.
- Setup Set adapter projects those endpoint fields into order elements.
- Renderer passes endpoint timestamps to helper line primitives; no endpoint keeps using `Length bars` / default length.
- Hit-test uses endpoint coordinates when available, so selectable line bounds match the rendered time span.
- Primary context menu records whether Shift was held.
- Shift + right-click exposes `Set ... End Here` actions for entry, stop loss, target1, target2, target3, and final target.
- Normal right-click start setters clear that element's old endpoint to avoid stale line spans.
- Inspector selected element panel now shows Start and End timestamps.
- Deleting an element clears both its start/value fields and endpoint fields.

Main files:

- `v4/src/chart/primitives.js`
- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/pda/manual-annotation.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/order/order-setup-hit-test.js`
- `node --check v4/src/order/order-setup-chart-actions.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for end timestamp normalization/projection/hit-test.
- `git diff --check`

Commit:

- `cb94ed8 feat(v4): edit order setup helper lines`

Notes:

- Endpoint setters should not require a valid price hit because they only define horizontal line end time.
- If endpoint is earlier than start, renderer/hit-test should still handle it by drawing between the two times.
- Existing records without endpoint timestamps remain compatible.

### Step 147F: Merge Selected Element Into Execution

Goal:

- Remove the separate `Selected Element` panel.
- Render entry / stop / target rows directly inside `Execution` as selectable element rows.
- Clicking an Execution row selects the matching chart helper line.
- Clicking a chart helper line selects the matching Execution row.
- Highlight the selected Execution row clearly.
- Replace the large delete button with a compact `X`.
- Replace the full-width `Length bars` control with a compact numeric input in the row.

Implemented:

- Removed the separate `Selected Element` panel from Active Order Setup.
- Execution now renders entry / stop / target rows as selectable controls.
- Chart helper line selection still drives the selected Execution row through shared selected element state.
- Clicking an Execution row selects the corresponding chart helper line.
- Selected Execution row uses yellow emphasis to match selected chart helper line styling.
- Length editing is now a compact numeric input in the row.
- Delete is now a compact `X` button in the row.
- Input/delete clicks do not also trigger row selection.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/src/order/order-setup-selection.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/order/order-setup-selection.js`
- Module smoke for Execution row selected styling/action attributes.
- `git diff --check`

Commit:

- `a7d614e fix(v4): simplify setup line length controls`

Notes:

- Keep chart-line selection behavior from Step 147D.
- Keep endpoint timestamp behavior from Step 147E.

### Step 147G: Order Setup OHLC Magnet Anchor

Goal:

- Reduce failed entry / stop / target start-anchor placement when the user intends to click a candle high/low.
- Preserve exact mouse price when it is inside the candle high/low range.
- If mouse price is outside high/low but visually close to high or low, snap to the nearest high/low.
- Reject only when the mouse is outside range and not close enough to high/low.
- Emit status text that shows when snapping happened and which OHLC point was used.

Implemented:

- `getValidBarAnchor()` now keeps exact mouse price when it is inside candle high/low.
- If the mouse price is outside high/low, it checks pixel distance to the candle high and low.
- If the nearest high/low is within 10 px, the anchor snaps to that high/low price.
- If the mouse is outside range and outside magnet tolerance, the action still rejects.
- Manual chart context now passes `priceToCoordinate` into Order Setup actions so tolerance is visual/pixel based.
- Status text reports snapped high/low and price.

Main files:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-chart-actions.js`
- Module smoke for in-range price, high snap, low snap, and rejected out-of-range anchor.
- `git diff --check`

Commit:

- `e88cbc2 feat(v4): refine order setup execution editing`

Notes:

- First pass snaps only to high/low for out-of-range prices.
- Full OHLC magnet can be added later behind Alt/global magnet behavior.

### Step 147H: Sync Calendar Date On Active Setup

Goal:

- When a setup is activated from chart/right-click/Execution row, keep Inspector Calendar focused on the setup's date.
- Calendar `selectedDate` and `viewDate` should move to the setup date.
- The day object list above Active Order Setup should refresh to that date.
- Active Order Setup auto-scroll behavior should remain unchanged.

Implemented:

- Added setup calendar date extraction in Inspector using priority `entryTimestamp -> primaryEventTimestamp -> exitTimestamp`.
- When Active Order Setup panel opens, Inspector Calendar `selectedDate` and `viewDate` sync to the active setup date.
- Explicit Inspector `Set Active` also syncs Calendar before refresh.
- Chart helper line selection continues to activate the owning setup, so it also syncs Calendar through the active setup panel path.
- Calendar day event list now refreshes to the setup date when setup activation opens the Active Order Setup panel.

Main files:

- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for setup date extraction priority.
- `git diff --check`

Commit:

- `e88cbc2 feat(v4): refine order setup execution editing`

Notes:

- Use the same date priority as Calendar Review Index: entry -> reversal -> result -> active primary timestamp.

### Step 147I: Target Free-Price Anchor

Goal:

- Allow target1 / target2 / target3 / final target to use a free price outside the clicked candle high/low range.
- Keep magnet behavior for targets when the mouse is close to high/low.
- Continue to require strict valid candle anchoring for entry and stop loss.
- Keep the clicked candle timestamp as the target helper line start timestamp.

Implemented:

- `getValidBarAnchor()` now accepts an `allowFreePrice` option.
- Entry and stop loss continue using strict anchoring.
- Target1 / target2 / target3 / final target use free-price anchoring.
- Target anchors still magnet to high/low when the mouse is close enough.
- Target free-price anchors keep the clicked bar timestamp/timeframe as the helper line start.

Main files:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-chart-actions.js`
- Module smoke for strict entry reject, strict stop reject, target free price, and target high/low magnet.
- `git diff --check`

Commit:

- `a7d614e fix(v4): simplify setup line length controls`

Notes:

- This is not a global relaxation. Only targets can be free-price anchors.

### Step 147J: Remove Execution Length Input

Goal:

- Remove the misleading `Length bars` numeric control from Execution rows.
- Keep helper line length controlled by right-click start and Shift + right-click endpoint.
- Keep compact `X` delete and row selection behavior.
- Leave existing persisted `display.elementLengths` compatibility in storage/renderer as fallback for old records, but stop exposing it in Inspector.

Implemented:

- Removed the row-level length input from Execution rows.
- Removed the Inspector `order-setup-element-length` handler.
- Execution rows now contain only the element summary and compact `X` delete.
- Existing persisted `display.elementLengths` remains supported by store/renderer for compatibility but has no Inspector edit UI.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke verifies Execution rows no longer render `order-setup-element-length`.
- `git diff --check`

Commit:

- `a7d614e fix(v4): simplify setup line length controls`

Notes:

- Endpoint-based length remains the primary workflow.

### Step 147K: Reason 1 MVP

Goal:

- Reframe Reasons around setup reasoning instead of object types.
- Replace separate `Add PDA` / `Add Segment` / `Add Composite` / `Add SMT` buttons with one `Link Selected Object` action.
- Support a free-text `Reason 1` note.
- Allow `Reason 1` to have refs, note, or both.
- Keep existing storage compatibility by mapping `Reason 1` note to `setupThesis.narrative` and refs to `setupThesis.linkedObjectRefs`.

Implemented:

- Active Order Setup Reasons now renders `Reason 1` instead of object-type add buttons.
- `Reason 1` note edits `setupThesis.narrative`.
- `Link Selected Object` automatically links the currently selected PDA, Segment, Composite, or SMT.
- Existing refs still render in the Reason 1 ref list and can be removed individually.
- Removed `Add PDA` / `Add Segment` / `Add Composite` / `Add SMT` buttons from the active Reasons UI.
- Added minimal Reason 1 styling.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke verifies Reason 1 note, generic Link Selected Object, and no per-type add buttons.
- `git diff --check`

Commit:

- `accaab5 feat(v4): simplify order setup reasons and execution rows`

Notes:

- This is a UI/data-adapter MVP, not a full reason schema migration.

### Step 147L: Execution Column Alignment

Goal:

- Align Execution row fields into stable columns.
- Show Type / Price / Time Range / Kind consistently for entry, stop loss, and targets.
- Keep row selection, selected highlight, and compact `X` delete unchanged.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- Module smoke verifies Execution rows render the new column classes.
- `git diff --check`

Commit:

- `accaab5 feat(v4): simplify order setup reasons and execution rows`

Notes:

- This is a presentation-only change; it does not change helper line anchors, endpoints, selection, or deletion behavior.
- Implemented with four explicit cells: Type, Price, Time Range, and Kind.
- Long time ranges wrap inside their own column instead of breaking column alignment.

### Step 147M: Execution Two-Line Compact Layout

Goal:

- Fix the overly wide single-line Execution layout from Step 147L.
- Keep Type / Price / Kind aligned on the first row.
- Move the full Time Range to a second row so the Inspector does not require horizontal scrolling.
- Preserve row selection, selected highlight, and compact `X` delete unchanged.

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- Module smoke verifies Execution rows render the new two-line classes.
- `git diff --check`

Commit:

- `accaab5 feat(v4): simplify order setup reasons and execution rows`

Notes:

- This keeps Inspector width stable instead of widening the sidebar.
- Implemented with a row grid containing `summary`, `time`, and `delete` areas.
- `summary` aligns Type / Price / Kind; `time` spans the content width below it.

### Step 147N: Multi-Reason MVP

Goal:

- Add multiple setup reasons under Active Order Setup.
- Store reasons in `setupThesis.reasons[]`.
- Each reason has independent note text and linked refs.
- `Link Selected Object` links to the specific reason block that owns the button.
- Preserve old records by mapping `setupThesis.narrative + linkedObjectRefs` to Reason 1.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for add reason, per-reason note, per-reason link, ref removal, and legacy fallback.
- `git diff --check`

Commit:

- `117b3b4 feat(v4): support multi-reason setup notes`

Notes:

- This is still an MVP; reason ordering is append-only for now.
- Implemented `setupThesis.reasons[]` normalization and clone support.
- `Reason 1` remains compatible with old `narrative + linkedObjectRefs`.
- Active Order Setup now renders one card per reason, each with its own note, refs, and `Link Selected Object`.
- Extra empty reasons can be removed with a compact `X`; non-empty reasons must be cleared first.

### Step 147O: Default Hidden Setups And Helper Line Colors

Goal:

- New Order Setups should default to hidden so multiple setups do not clutter the chart immediately.
- Keep old imported/stored records compatible by not changing the global `display.hidden` fallback.
- Make Order Setup helper lines thinner.
- Use distinct semantic colors: Long Entry dark green, Short Entry red, Stop Loss blue, Target purple.

Main files:

- `v4/src/order/order-review-active.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/src/order/order-review-renderer.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-active.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/order/order-review-renderer.js`
- Module smoke for new setup hidden defaults and renderer color constants.
- `git diff --check`

Commit:

- `117b3b4 feat(v4): support multi-reason setup notes`

Notes:

- Active setup selection remains separate from visibility; user can Show from Inspector/Calendar when they want it drawn.
- Implemented `display.hidden=true` in chart, blank, segment, and composite setup creation paths.
- Kept `normalizeOrderDisplay()` fallback as `hidden=false` so existing records/imports do not disappear unexpectedly.
- Helper line widths now use `1 / 1.25 / 1.75` for normal / active / selected.
- Entry color is direction-aware: long `#00695c`, short `#ef5350`; stop loss `#42a5f5`; targets `#ab47bc`.

### Step 147P: Reversal Hide Setup

Goal:

- Add `Hide Setup` to the chart right-click menu when right-clicking a reversal marker.
- Keep setup visibility simple: no exclusive/coexist Inspector switch.
- Preserve existing per-setup Show/Hide behavior.

Main files:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-chart-actions.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- Module smoke for reversal Hide Setup menu/action and absence of the discarded display mode switch.
- `git diff --check`

Commit:

- `2474357 feat(v4): hide setup from reversal menu`

Notes:

- Reversal marker right-click now offers `Hide Setup`.
- The exclusive/coexist mode was intentionally removed after review because it can make setup visibility harder to reason about.

### Step 147Q: Calendar Setup Row Overflow Menu

Goal:

- Reduce width pressure in the Calendar `Order Setups` list.
- Move Locate / Open / Hide(Show) row actions into a compact three-dot menu.
- Reuse existing action handlers and keep behavior unchanged.

Main files:

- `v4/src/ui/inspector/calendar-panel.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/calendar-panel.js`
- Module smoke verifies setup rows render a three-dot menu with Locate / Open / Hide.
- `git diff --check`

Commit:

- `4e22714 feat(v4): compact calendar setup actions`

Notes:

- Implement with native `details/summary` to avoid adding sidebar popover state.
- Implemented only for Calendar `Order Setup` rows; non-setup row actions remain unchanged.
- The menu reuses existing `calendar-object-locate`, `calendar-object-open`, and `order-review-toggle-hidden` handlers.

### Step 147R: Delete Setup From Calendar And Reversal Menus

Goal:

- Add Delete to the Calendar Order Setup three-dot menu.
- Add Delete Setup to the chart reversal right-click menu.
- Delete the whole Order Setup, not only the reversal element.
- Reuse existing history and active cleanup behavior.

Main files:

- `v4/src/ui/inspector/calendar-panel.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/calendar-panel.js`
- `node --check v4/src/order/order-setup-chart-actions.js`
- Module smoke verifies Calendar setup menu and reversal menu include Delete actions.
- `git diff --check`

Commit:

- `4e22714 feat(v4): compact calendar setup actions`

Notes:

- Reversal element delete remains separate for non-reversal helper line elements.
- Calendar setup menu now contains Locate / Open / Hide(Show) / Delete.
- Reversal marker right-click now contains Set Active / Hide Setup / Delete Setup.
- `Delete Setup` deletes the whole order review and clears selected setup element state.

### Step 147S: Default New Order Setups To Visible

Goal:

- Revert the new-setup default from hidden to visible.
- Keep manual Hide/Show behavior available from Inspector, Calendar, and chart reversal menus.
- Preserve old-record compatibility: missing `display.hidden` still normalizes to visible.

Main files:

- `v4/src/order/order-review-active.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-active.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `feat(v4): default order setups to visible`

Notes:

- Chart right-click creation now writes `display.hidden=false`.
- Blank, Segment-created, and Composite-created Order Setups now write `display.hidden=false`.
- This supersedes the hidden-default portion of Step 147O; helper line color/width changes from 147O remain unchanged.

### Step 147T: Inline Calendar Setup Visibility State

Goal:

- Make Calendar `Order Setups` rows show visible/hidden state without opening the three-dot menu.
- Keep the row compact and avoid reintroducing wide Locate / Open / Hide buttons.
- Let the state indicator also toggle Show/Hide directly.

Main files:

- `v4/src/ui/inspector/calendar-panel.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/calendar-panel.js`
- `git diff --check`

Commit:

- `feat(v4): show calendar setup visibility state`

Notes:

- Visible setup rows render a green status dot.
- Hidden setup rows render a gray status dot with a slash.
- Clicking the status dot reuses `order-review-toggle-hidden`; the three-dot menu still contains Locate / Open / Show(Hide) / Delete.

### Step 147U: Entry Context Structured Fields

Goal:

- Add structured entry-shape and entry-session descriptions to Active Order Setup.
- Keep these fields separate from free-form `Reasons` because they describe the entry execution context.
- Store them in `entryPlan` for later review/statistics.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/style.css`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `feat(v4): add order setup entry context`

Notes:

- `entryPlan.entryPatterns[]` is a multi-select list: Purge + OB, OTE, Stop Market, Key Level.
- `entryPlan.entrySession` is a single-select field: 930 Judas Swing, 950 Macro, Silver Bullet.
- UI placement: Active Order Setup -> Execution -> Entry Context -> Reasons.

### Step 147V: Review Result Options

Goal:

- Make `Result` match historical review rather than future trading-journal behavior.
- Physically remove old journal/execution-reaction values from the result dropdown.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `git diff --check`

Commit:

- `feat(v4): simplify order setup result outcomes`

Notes:

- Removed selectable `win`, `loss`, `missed`, `skipped`, `invalidated`, and `managed-out`.
- Result values are now Target 1, Target 2, Target 3, Stop Loss, Breakeven, Unknown.
- Journal-oriented execution responses can be reintroduced later as a separate journal field, not as setup review result.

### Step 147W: Risk Reward Box

Goal:

- Render a true risk/reward box derived from existing entry, stop, target, and result data.
- Keep the box derived, not a separately drawn/stored setup element.
- Add per-setup visibility control.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

Commit:

- `feat(v4): render order setup risk reward box`

Notes:

- `display.showRiskRewardBox` defaults to true and can be toggled from Active Order Setup -> Display.
- Risk box is always Entry -> Stop Loss when entry/stop exist.
- Reward box uses Result Target 1/2/3 to select target1/target2/target3.
- Stop Loss, Breakeven, and Unknown results do not render a reward box.

### Step 147X: Derived Result Summary

Goal:

- Fill Result panel Exit price, Points, and R from existing setup elements.
- Keep this as a derived summary, not stored manual data.
- Do not derive first-touch exit time yet.

Main files:

- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- module smoke for Target 1, Stop Loss, Breakeven, and Unknown derived result summaries
- `git diff --check`

Commit:

- `feat(v4): derive order setup result summary`

Notes:

- Target 1/2/3 derive exit price from target1/target2/target3.
- Stop Loss derives exit price from stop loss.
- Breakeven derives exit price from entry.
- Points and R derive from direction, entry, stop, and derived exit price.
- Exit time remains explicit-only; no bar scan is performed.

### Step 148: Freeze New Order Setup Features

Goal:

- Start the cleanup/audit phase after the large Order Setup rebuild.
- Freeze new Order Setup feature expansion until the cleanup pass is complete.
- Keep later steps limited to bug fixes, residual-code cleanup, duplicate-logic consolidation, and regression validation.

Main files:

- `v4/TODO.md`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `git diff --check`

Commit:

- `docs(v4): freeze order setup cleanup scope`

Notes:

- Do not add new review concepts, storage fields, or large UI sections during Phase 12B.
- Small UI changes are allowed only when they remove confusion, fix a bug, or support the cleanup audit.
- Existing feature requests should be converted into cleanup/audit items unless they are required for regression repair.

### Step 149: Order Setup Residual Code Audit

Goal:

- Inspect Order Setup code for residual old UI paths, duplicate adapters, duplicate derived calculations, and stale journal fields.
- Produce a cleanup list that can be executed in small commits without changing behavior during the audit step.

Main files inspected:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/src/order/order-review-store.js`
- `v4/src/order/order-review-set.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/ui/inspector/calendar-panel.js`

Findings:

- `order-review-panel.js` still contains old full-row UI functions: `renderOrderRow`, `renderOrderActions`, `renderOrderEditor`, `renderSetupThesis`, `renderEntryPlan`, and `renderResultReview`. Current `renderOrderReviewPanel()` only renders the active setup, so this path is dead or archive-only and should be removed in Step 151 if no hidden caller is found.
- `inspector-sidebar.js` still has generic Advanced Edit handlers for setup/entry/result fields and time/price pickers. Some handlers are still used by the new Active Order Setup UI (`display`, `result`, `reason`, `refs`, `element select/delete`), so Step 151 must remove only the old full-form handlers after checking data attributes.
- `order-review-set.js` and `setup-set.js` duplicate runtime adapter responsibilities. Renderer, hit-test, and Active Inspector already consume Setup Set; active state still exposes Review Set. Step 150 should define Setup Set as the chart/Inspector view-model authority and keep Review Set only as a small compatibility bridge or merge it away.
- Result derived values are duplicated: `order-review-store.js` derives points/R from explicit exit price while `setup-set.js` derives static Target/Stop/BE result summaries from setup elements. Step 152 should move display/result summary derivation to the Setup Set/view-model layer and keep the store focused on normalized persisted input.
- Helper line projection is duplicated between `order-review-renderer.js` and `order-setup-hit-test.js` (`lineLengthBars`, `endTimestamp`, fallback length, timestamp projection). Step 152 should extract shared projection helpers so visual line length and hit-test length cannot diverge.
- `ORDER_EXIT_REASON_DEFINITIONS` still includes trading-journal style values (`model-invalidated`, `missed-entry`, `skipped`) even though the current review Result UI no longer exposes exit reason. Step 154 should remove or defer this field as journal-only.

Validation:

- Static grep audit over Order Setup related modules.
- `git diff --check`

Commit:

- `docs(v4): audit order setup residual code`

Notes:

- No business logic should change in Step 149.
- The cleanup should be executed as Step 150-156 in small commits.
- Avoid deleting persisted `orderReviews` schema/localStorage names until a dedicated migration exists.

### Step 150: Authority Source Audit

Goal:

- Define the authoritative source for each Order Setup layer before deleting old code.
- Prevent cleanup work from moving duplicate calculations to another accidental location.

Authority decisions:

- `orderReviews` remains the persisted compatibility schema and owns localStorage, Review JSON, undo/redo snapshots, explicit user input, normalization, identity, and import/export compatibility.
- `Setup Set` is the runtime/view-model authority for chart and Inspector behavior. Renderer, hit-test, Calendar object locate/open, Active Order Setup panels, result summary, execution rows, and risk/reward box should consume Setup Set or Setup Set derived helpers.
- `order-review-set.js` is a legacy active/compatibility bridge only. New work should not add Review Set fields or use Review Set summary as the display authority.
- Inspector owns user edits to persisted fields only: active id actions, display flags, endpoint fields, reasons/refs, entry context, result status, and notes.
- Derived values such as result exit/points/R, risk/reward box bounds, execution row summaries, and helper line projection should not be written back into store merely for display.
- Renderer and hit-test must share one projection semantic: explicit `endTimestamp` first, old `lineLengthBars` fallback second, final default length last.

Cleanup implications:

- Step 151 can remove dead full-form Inspector rendering once data-action dependencies are checked.
- Step 152 should extract shared result/projection helpers rather than duplicating store/renderer/hit-test math.
- Step 153 should route chart actions through a small action map but keep store writes explicit.
- Step 154 can remove journal-only result/exit fields that are no longer part of the review UI, while keeping `orderReviews` key/schema name.

Main files:

- `v4/TODO.md`
- `v4/docs/ORDER_REVIEW_DESIGN.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `git diff --check`

Commit:

- `docs(v4): define order setup authority sources`

Notes:

- This step is an architecture decision record, not a refactor.
- The immediate next implementation step is Step 151: remove old UI/entry dead paths using the authority matrix above.

### Step 151: Remove Old Order Setup UI Paths

Goal:

- Remove dead old Inspector UI paths that no longer match the chart-first Active Order Setup workflow.
- Keep the current Active Order Setup, Calendar, and Archive paths intact.

Implemented:

- Removed old `order-review-panel.js` full-row/list render path:
  - `renderOrderRow`
  - `renderOrderActions`
  - `renderOrderEditor`
  - old Setup Thesis / Entry Plan / Result Review renderers
  - old Advanced Edit / Quick Review helpers
  - old timestamp/price/text input helpers that existed only for the removed form
- Removed old `inspector-sidebar.js` Order Setup pick state and handlers:
  - `orderReviewTimePickState`
  - `orderReviewPricePickState`
  - old setup/entry/result full-form field validation and pick flow
  - old `order-review-pick-time` / `order-review-pick-price` actions
- Preserved current Active Order Setup dependencies:
  - entry context `entryPatterns` / `entrySession`
  - reasons and linked refs
  - result status and note
  - display flags
  - execution element select/delete
  - active/locate/hide/delete actions

Main files:

- `v4/src/ui/inspector/order-review-panel.js`
- `v4/src/ui/inspector-sidebar.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- full `node --check` over `v4/src/**/*.js`
- residual grep for old UI labels/actions/functions
- `git diff --check`

Commit:

- `refactor(v4): remove legacy order setup inspector paths`

Notes:

- This removes Inspector-led full-form editing for setup/entry/result fields.
- Chart-first entry/stop/target/reversal editing remains in `order-setup-chart-actions.js`.
- Result status and note are still editable from Active Order Setup.

### Step 152: Consolidate Order Setup Derived Helpers

Goal:

- Reduce duplicated Order Setup derived calculations after old UI cleanup.
- Keep store normalization separate from Setup Set/view-model display derivation.
- Make renderer and hit-test use the same helper-line projection semantics.

Implemented:

- Added `v4/src/order/order-setup-projection.js`.
- Moved shared projection helpers into the new module:
  - timestamp to current chart time mapping
  - display bar lookup/index by timestamp
  - `lineLengthBars` fallback handling
  - projected zone end time
  - chart bar spacing
  - line end coordinate
- Updated `order-review-renderer.js` to consume the shared projection helper.
- Updated `order-setup-hit-test.js` to consume the same projection helper.
- Changed `order-review-store.js` so `normalizeResultReview()` no longer derives `outcomePoints/outcomeR`; it only normalizes explicit input.
- Kept Setup Set as the displayed result summary authority for Target/Stop/Breakeven Exit, Points, and R.

Main files:

- `v4/src/order/order-setup-projection.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-review-store.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-projection.js`
- `node --check v4/src/order/order-review-renderer.js`
- `node --check v4/src/order/order-setup-hit-test.js`
- `node --check v4/src/order/order-review-store.js`
- full `node --check` over `v4/src/**/*.js`
- module smoke: store no longer derives result points/R, Setup Set still derives target result summary
- `git diff --check`

Commit:

- `refactor(v4): consolidate order setup derived helpers`

Notes:

- This step intentionally leaves `orderReviews` schema names unchanged.
- Old explicit imported `outcomePoints/outcomeR` still normalize if present, but current display should prefer Setup Set derivation.

### Step 153: Clean Order Setup Chart Actions

Goal:

- Route Order Setup chart actions through explicit action maps.
- Preserve current behavior while removing long action if/else branches and duplicate status handling.
- Keep the right-click action surface constrained to registered actions.

Implemented:

- Added `ORDER_SETUP_PATCH_ACTIONS` for active setup reversal/event/entry/stop/target/final-target updates.
- Added `ORDER_SETUP_LINK_ACTIONS` for PDA, Segment, Composite, and latest SMT references.
- Replaced the old long `patchActiveSetupFromContext()` branch with map-driven patch generation.
- Replaced the old long `linkContextObjectToActiveSetup()` branch with map-driven link generation.
- Tightened `handleOrderSetupChartAction()` so unknown `order-setup-set-*` or `order-setup-link-*` actions are not swallowed by prefix checks.

Main files:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-setup-chart-actions.js`
- full `node --check` over `v4/src/**/*.js`
- residual grep for old `order-setup-set-*` / `order-setup-link-*` action branches
- `git diff --check`

Commit:

- `refactor(v4): clean order setup chart actions`

Notes:

- This is a refactor-only cleanup. It does not change menu labels, stored data, or chart drawing semantics.

### Step 154: Remove Legacy Result Compatibility Fields

Goal:

- Physically remove result fields that belong to the old Order Review / future journal model.
- Keep the current review model focused on result status plus derived Setup Set display values.
- Preserve the `orderReviews` storage key/schema boundary until a separate migration is planned.

Implemented:

- Removed `ORDER_TARGET_REACHED_DEFINITIONS` and `ORDER_EXIT_REASON_DEFINITIONS` from `order-review-store.js`.
- Removed related exported value sets, valid sets, and alias maps.
- Simplified `normalizeResultReview()` to current persisted fields:
  - `exitTimestamp`
  - `exitPrice`
  - `result`
  - `note`
- Removed legacy `expectedTargetReached`, `finalTargetReached`, and `exitReason` from Setup Set and Review Set runtime adapters.
- Removed store fallback for persisted `outcomePoints/outcomeR`; displayed Points/R are derived by Setup Set/view-model from entry, stop, and result target/exit.

Main files:

- `v4/src/order/order-review-store.js`
- `v4/src/order/setup-set.js`
- `v4/src/order/order-review-set.js`
- `v4/TODO.md`
- `v4/sessions/order_setup_cleanup_replay_plan.md`
- `v4/sessions/session_20260528_time_overlays_calendar.md`

Validation:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/order/setup-set.js`
- `node --check v4/src/order/order-review-set.js`
- full `node --check` over `v4/src/**/*.js`
- residual grep for removed result/exit reason symbols
- `git diff --check`

Commit:

- `refactor(v4): remove legacy order result fields`

Notes:

- Result selectable values remain Target 1 / Target 2 / Target 3 / Stop Loss / Breakeven / Unknown.
- Trading-journal reaction concepts such as missed/skipped/invalidated remain out of the current review result model.

## Next Step Template

### Step N: Title

Goal:

- Pending.

Main files:

- Pending.

Validation:

- Pending.

Commit:

- `pending`

Notes:

- Pending.
