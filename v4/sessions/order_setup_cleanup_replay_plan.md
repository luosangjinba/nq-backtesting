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

- `pending`

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

- `pending`

Notes:

- Endpoint setters should not require a valid price hit because they only define horizontal line end time.
- If endpoint is earlier than start, renderer/hit-test should still handle it by drawing between the two times.
- Existing records without endpoint timestamps remain compatible.

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
