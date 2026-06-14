# Step 286 Plan - Live Record Chart Menu And Chart Interaction Parity

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Prerequisite: Step 285 completed Live Records clone-first foundation:

- independent Live Record runtime/store/active/persistence;
- `New Live Record Here` chart context action;
- Calendar `Live Records` group directly after `Order Setups`;
- Live Record Detail cloned from Order Setup Detail;
- row/detail actions and focused browser smoke.

## Goal

Make Live Records usable from the chart in the same style as Order Setups.

The user-facing target is:

- right-click chart -> create or update the active Live Record;
- right-click chart -> set live entry / stop / target / result points;
- right-click PDA / Segment / Composite / SMT / Chart Note -> link evidence to active Live Record;
- Live Record execution elements render on the chart;
- right-click a rendered Live Record element -> set active / select / hide / delete;
- Calendar and Detail update immediately.

## Non-Goals

- No standalone `Live Orders` panel.
- No broker API, order routing, fill import, PnL dashboard, or statistics dashboard.
- No major generic object abstraction before parity is proven.
- No Review JSON import/export in this step.
- No drag handles or freeform geometry editing unless already needed for click actions.
- No secondary-chart parity until primary chart behavior is stable, except preserving existing secondary menu behavior.

## Design Constraints

- Follow `Order Setups` menu/action/renderer/hit-test patterns closely.
- Keep Live Record data isolated from `orderReviews`.
- All write actions must target the active Live Record unless the user explicitly clicked a Live Record element and selected an object-specific action.
- If there is no active Live Record, setup-writing actions are disabled with a clear menu state.
- Creating a Live Record must not create or activate an Order Setup.
- Linking evidence to a Live Record must not link evidence to Order Setup unless the user uses the existing Order Setup menu.

## Existing Code To Mirror

Order Setup references:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-projection.js`
- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-selection.js`
- `v4/src/ui/inspector/order-review-edit-actions.js`
- `v4/src/ui/inspector/order-review-reason-actions.js`
- `v4/src/pda/manual-annotation.js`
- `v4/src/pda/manual-context-menu.js`

Live Record files from Step 285:

- `v4/src/live-record/live-record-types.js`
- `v4/src/live-record/live-record-store.js`
- `v4/src/live-record/live-record-active.js`
- `v4/src/live-record/live-record-set.js`
- `v4/src/live-record/live-record-chart-actions.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/src/ui/inspector/live-record-actions.js`

## Substeps

### Step 286.1 - Freeze Chart Interaction Boundary

Confirm exact Step 286 scope before code:

- primary chart right-click actions;
- active Live Record menu state;
- execution element writes;
- evidence linking;
- renderer / hit-test / selection minimum;
- smoke and browser verification.

Acceptance:

- TODO and session docs define Step 286 scope.
- No runtime behavior change.

### Step 286.2 - Audit Order Setup Chart Action / Renderer / Hit-Test Paths

Read and map the Order Setup flow:

- menu rendering;
- action map;
- anchor validation;
- target submenu;
- Set All End behavior;
- renderer projections;
- hit-test structure;
- selection event flow;
- Inspector execution row sync.

Acceptance:

- Session doc records which pieces will be copied, adapted, or postponed.
- No runtime behavior change.

### Step 286.3 - Extend Live Record Execution Shape For Chart Elements

Current Live Record execution shape is minimal. Extend normalization/projection only as needed for chart parity:

- entry timestamp/timeframe/price/end timestamp;
- market structure shift or live trigger element if useful;
- stop loss timestamp/timeframe/price/end timestamp;
- target roles mirroring Order Setup target roles where practical;
- result exit timestamp/price;
- per-element visibility;
- optional line length/end controls.

Acceptance:

- Existing Step 285 records still normalize.
- New fields preserve clone-on-read behavior.
- No renderer yet.
- Live Record smoke updated for schema compatibility.

### Step 286.4 - Expand Live Records Context Menu Shell

Update `renderLiveRecordMenuItems()` to match Order Setup menu shape:

- active Live Record label;
- `New Live Record Here`;
- `Set Active Live Record Anchor Here`;
- `Set Entry Here`;
- `Set Stop Loss Here`;
- `Targets` submenu;
- `Set Result / Exit Here`;
- `Set All Ends Here`;
- disabled state when no active Live Record exists;
- clear active Live Record if useful.

Acceptance:

- Menu appears beside Order Setup menu.
- Write actions are disabled without active Live Record.
- Existing Order Setup menu remains unchanged.

### Step 286.5 - Implement Primary Chart Write Actions

Add Live Record chart action handlers:

- move anchor;
- set entry;
- set stop loss;
- set internal/swing/external targets;
- set target end timestamps;
- set result exit time/price;
- set all active execution ends here.

Rules:

- Actions write only to active Live Record.
- Price actions use mouse price with bar close fallback only where appropriate.
- Timestamp/timeframe comes from clicked bar and current timeframe.
- Use `recordHistory()`.

Acceptance:

- Detail Execution/Result updates immediately after each action.
- Calendar row summary reflects entry/anchor/result changes.
- Active Order Setup is untouched.

### Step 286.6 - Link Evidence To Active Live Record

Add chart/context evidence links parallel to Order Setup evidence links:

- PDA hit -> Link PDA To Active Live Record;
- Segment hit -> Link Segment To Active Live Record;
- Composite hit -> Link Composite To Active Live Record;
- SMT hit -> Link SMT To Active Live Record;
- Chart Note -> Link Chart Note To Active Live Record if an existing chart note is at the bar.

First persistence target:

- append to `reasons[0].refs` and/or `linkedObjectRefs` using Live Record ref types.

Acceptance:

- Linked evidence appears in Live Record Detail reasons/refs.
- Existing Order Setup linked refs do not change.
- Duplicate links are ignored or de-duped.

### Step 286.7 - Add Live Record Renderer

Add a primary chart renderer for Live Records, copying the minimal Order Setup rendering style:

- anchor marker;
- entry marker/line;
- stop line;
- target lines;
- result marker/line;
- active Live Record emphasis;
- hidden record / hidden element handling.

Acceptance:

- Renderer initializes in `app.js`.
- Live Record chart elements appear after chart actions.
- Hidden Live Records do not render.
- Existing Order Setup renderer still passes smoke.

### Step 286.8 - Add Live Record Hit-Test And Selection

Add primary chart hit-test for Live Record elements:

- detect anchor / entry / stop / target / result;
- expose hit metadata similar to Order Setup hit-test;
- right-click hit menu includes Set Active, Select Element, Hide Element, Delete Element, Delete Record;
- selected element highlights in chart and detail if practical.

Acceptance:

- Right-click on a rendered Live Record element shows Live Record element actions.
- Delete element clears only that Live Record field.
- Delete record removes only the Live Record.
- Order Setup hit-test remains unchanged.

### Step 286.9 - Inspector / Calendar Sync Polish

Make detail and Calendar reflect chart-first edits cleanly:

- Execution section displays all live elements written from chart actions.
- Result section reflects exit timestamp/price.
- Row summary prioritizes entry -> anchor -> result the same way Calendar projection expects.
- Hidden element / hidden record states are readable.

Acceptance:

- After right-click actions, detail updates without page reload.
- Calendar row summary updates.
- Undo/redo restores detail and chart state.

### Step 286.10 - Isolation And History Audit

Audit runtime boundaries:

- no accidental `orderReviews` mutation from Live Record actions;
- Live Record changes are captured in history;
- instrument switching persists/restores Live Records correctly;
- primary/secondary menu behavior does not regress;
- no standalone `Live Orders` UI appears.

Acceptance:

- `rg` isolation checks pass.
- Order Setup smoke still passes.
- Live Record smoke covers history and isolation.

### Step 286.11 - Focused Smoke Tests

Add or extend tests:

- chart action helper writes anchor/entry/stop/targets/result;
- disabled/no-active behavior;
- evidence link de-dupe;
- renderer projection primitives;
- hit-test metadata;
- delete/hide element behavior;
- Order Setup isolation.

Acceptance:

- `node v4/tests/live-record-smoke.js` passes.
- New targeted chart action/renderer smoke passes.
- `node v4/tests/order-setup-smoke.js` passes.
- `git diff --check` passes.

### Step 286.12 - Browser Verification And Closeout

Use browser smoke or manual browser verification to confirm:

- right-click creates Live Record;
- right-click sets entry/stop/target/result;
- rendered chart elements are visible;
- hit menu works on Live Record elements;
- Calendar and Detail update;
- no standalone `Live Orders` panel.

Acceptance:

- Browser smoke or documented manual verification passes.
- TODO and session closeout are updated.
- Step 286 is ready for the next phase.

## Suggested Execution Order

Execute Step 286.1 through Step 286.12 sequentially, committing after each substep.

If implementation risk becomes too high, stop after Step 286.6 with chart write actions and evidence linking; renderer/hit-test can be split into Step 287. The preferred path is still to finish all Step 286 substeps if they remain small.

## Step 286.1 Completion - Chart Interaction Boundary Frozen

Completed on 2026-06-14.

Frozen scope for Step 286:

- Primary chart right-click interactions for Live Records.
- Active Live Record menu state and disabled behavior.
- Chart actions that write anchor, entry, stop, target, result, and end fields to the active Live Record.
- Evidence linking from chart/context objects to the active Live Record.
- Minimal primary chart renderer for Live Record elements.
- Minimal primary chart hit-test and selection for rendered Live Record elements.
- Inspector and Calendar sync after chart-first edits.
- Targeted smoke tests and browser verification.

Frozen non-goals:

- No standalone `Live Orders` panel.
- No broker API, order routing, fill import, PnL/statistics dashboard, or large Journal workspace.
- No Review JSON import/export in Step 286.
- No secondary-chart Live Record parity unless needed to avoid regression.
- No broad generic abstraction of Order Setup and Live Record internals.

Implementation rule:

- Copy/adapt the proven Order Setup chart workflow first.
- Extract shared helpers only when a small helper avoids obvious duplication without changing Order Setup behavior.
- Every substep remains independently committed.

Next step: Step 286.2 audits the exact Order Setup chart action, renderer, hit-test, and selection paths before code changes.

## Step 286.2 Completion - Order Setup Chart Paths Audited

Completed on 2026-06-14.

Audited files:

- `v4/src/order/order-setup-chart-actions.js`
- `v4/src/order/order-setup-projection.js`
- `v4/src/order/order-review-renderer.js`
- `v4/src/order/order-setup-hit-test.js`
- `v4/src/order/order-setup-selection.js`
- `v4/src/pda/manual-annotation.js`
- `v4/src/chart/chart-context.js`

Order Setup menu/action flow to copy:

- `renderOrderSetupMenuItems()` builds a chart submenu with hit-specific actions first, then create / active setup actions.
- Active setup actions are disabled when there is no active setup.
- Target actions are grouped under a `Targets` submenu.
- Shift-right-click changes the menu from write actions to end-time actions.
- `handleOrderSetupChartAction()` dispatches through a concrete action map and records history before mutations.
- Write actions patch only the active setup unless a hit-specific action explicitly targets the clicked setup element.

Renderer/projection pieces to adapt:

- `order-setup-projection.js` maps timestamps to visible bars and computes display indexes/end coordinates.
- `order-review-renderer.js` renders markers, horizontal lines, target lines, risk/reward boxes, active emphasis, and selected element emphasis through chart primitives.
- Live Record should get its own projection and renderer modules first, with copied minimal helpers, instead of extracting a shared abstraction during Step 286.

Hit-test/selection pieces to adapt:

- `order-setup-hit-test.js` builds hit metadata around projected horizontal lines and reversal marker proximity.
- `order-setup-selection.js` keeps selected element state isolated, emits bus events, and lets the renderer consume selected metadata.
- Live Record should get separate hit-test and selection modules to avoid accidental Order Setup coupling.

Data-shape decisions for Step 286.3:

- Add execution fields for `entry`, `marketStructureShift`, `stopLoss`, and `targets`.
- Each chart element should support timestamp, timeframe, price, end timestamp, end timeframe, optional line length, visibility, and completion where useful.
- Target roles should mirror Order Setup roles closely enough for menu parity: internal targets, swing point target, external targets, and final target.
- Result should keep `exitTimestamp`, `exitTimeframe`, and `exitPrice`.

Postponed from the audit:

- No shared Order Setup / Live Record abstraction until parity proves the shape.
- No drag editing.
- No secondary chart Live Record renderer unless needed for regression safety.
- No broker/order-routing fields.

Next step: Step 286.3 extends the Live Record execution data shape while preserving old Step 285 records.

## Step 286.3 Completion - Live Record Execution Shape Extended

Completed on 2026-06-14.

Runtime changes:

- Added Live Record target role/type constants mirroring the Order Setup target vocabulary.
- Extended normalized execution elements with id, role, label, timestamp, timeframe, price, end timestamp, end timeframe, line length, visibility, completion, and note fields.
- Added `execution.marketStructureShift`.
- Extended target normalization with setup-like labels and role-derived target types.
- Extended result normalization with `exitTimeframe`.
- Fixed Live Record partial execution patch merging so element-level updates preserve existing element fields.

Projection/detail changes:

- `createLiveRecordSet()` now preserves execution end fields, element visibility, target role/type, MSS, and result exit timeframe.
- Live Record Detail now displays MSS rows, target type metadata, element end times, hidden element state, and result exit timeframe.

Verification:

- `node --check v4/src/live-record/live-record-store.js`
- `node --check v4/src/live-record/live-record-set.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.4 expands the Live Record chart context menu shell without wiring all write handlers yet.

## Step 286.4 Completion - Live Record Context Menu Shell Expanded

Completed on 2026-06-14.

Runtime changes:

- Expanded `LIVE_RECORD_CHART_ACTIONS` with anchor, entry, MSS, stop, target, result, end, all-end, and clear-active action IDs.
- `renderLiveRecordMenuItems()` now shows the active Live Record label, `New Live Record Here`, write actions, setup-like target submenu, Shift end actions, `Set All Ends Here`, and `Close Active Live Record`.
- Write actions are disabled when no active Live Record exists or no chart bar is selected.
- `manual-annotation.js` now passes the Shift context into the Live Record menu renderer.
- `Clear Active Live Record` is handled immediately; other new write actions are claimed with a Step 286.5 placeholder status so they do not fall through to unrelated handlers.

Verification:

- `node --check v4/src/live-record/live-record-chart-actions.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.5 wires the menu actions to active Live Record chart writes.

## Step 286.5 Completion - Primary Chart Write Actions Implemented

Completed on 2026-06-14.

Runtime changes:

- Added active Live Record chart write handlers for anchor, entry, MSS, stop loss, targets, result/exit, individual ends, target ends, and all active execution ends.
- Chart writes use clicked bar timestamp/current timeframe and mouse price with bar close fallback.
- Target writes upsert by Live Record target role.
- `Set All Ends Here` updates existing execution elements and targets without creating new ones.
- All write actions are wrapped in `recordHistory()`.
- No-active and no-bar states emit status errors and do not mutate data.

Isolation:

- Live Record chart writes go through `patchActiveLiveRecord()`.
- Smoke verifies active Order Setup thesis is not changed by Live Record chart writes.

Verification:

- `node --check v4/src/live-record/live-record-chart-actions.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.6 links PDA/Segment/Composite/SMT/Chart Note evidence to the active Live Record.

## Step 286.6 Completion - Evidence Linking Added

Completed on 2026-06-14.

Runtime changes:

- Added Live Record chart actions for linking PDA, Segment, Composite, latest SMT, and Chart Note evidence.
- Live Record menu now renders evidence link rows with active/hit-based disabled state.
- `manual-annotation.js` passes PDA, Segment, Composite, and Chart Note context into the Live Record menu and action handler.
- Evidence refs are written to both `reasons[0].refs` and `linkedObjectRefs`.
- Ref writes are de-duped by `type/id/role`.

Isolation:

- Evidence linking uses `patchActiveLiveRecord()` only.
- Smoke verifies linked Live Record refs do not mutate Order Setup reason refs.

Verification:

- `node --check v4/src/live-record/live-record-chart-actions.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.7 adds the Live Record chart renderer.

## Step 286.7 Completion - Live Record Renderer Added

Completed on 2026-06-14.

Runtime changes:

- Added `live-record-projection.js` for Live Record timestamp mapping, display bar lookup, and line length handling.
- Added `live-record-renderer.js` for primary chart rendering.
- Renderer draws anchor marker, entry line, MSS line, stop line, target lines, and result exit helper.
- Renderer respects hidden Live Records, per-element hidden state, and active Live Record emphasis.
- `createLiveRecordSet()` now exposes display settings for renderer use.
- `app.js` initializes the Live Record renderer with the rest of Live Record runtime.

Verification:

- `node --check v4/src/live-record/live-record-projection.js`
- `node --check v4/src/live-record/live-record-renderer.js`
- `node --check v4/src/live-record/live-record-set.js`
- `node --check v4/src/app.js`
- `node v4/tests/live-record-smoke.js`

Note: Visual/browser verification is kept for Step 286.12. Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.8 adds Live Record hit-test and selection.

## Step 286.8 Completion - Live Record Hit-Test And Selection Added

Completed on 2026-06-14.

Runtime changes:

- Added `live-record-hit-test.js` with anchor, entry, MSS, stop, target, and result hit metadata.
- Added `live-record-selection.js` with isolated Live Record element selection state and bus events.
- `manual-annotation.js` now runs Live Record hit-test on primary chart right-click and passes hit metadata into the Live Record menu.
- Live Record menu now includes a `Live Record Element` submenu for Set Active, Select Element, Hide Element, Delete Element, and Delete Record.
- Hit actions mutate only Live Records and are wrapped in history where they change data.
- Renderer now highlights selected Live Record elements with selected line style.
- Fixed Live Record line-length projection so `lineLengthBars: null` falls back to the default length instead of becoming zero.

Verification:

- `node --check v4/src/live-record/live-record-hit-test.js`
- `node --check v4/src/live-record/live-record-selection.js`
- `node --check v4/src/live-record/live-record-chart-actions.js`
- `node --check v4/src/live-record/live-record-renderer.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/app.js`
- `node --check v4/src/live-record/live-record-projection.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `git diff --check`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.9 polishes Inspector and Calendar sync after chart-first edits.

## Step 286.9 Completion - Inspector And Calendar Sync Polished

Completed on 2026-06-14.

Runtime changes:

- Live Record Detail execution rows now read `display.elementVisibility` as well as element `visible`.
- Detail execution rows now show `Hidden` and `Selected` states when chart actions hide/select elements.
- Calendar Live Record summaries now include exit information when result exit time/price exists.

Verification:

- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/src/calendar/calendar-review-index.js`
- `node --check v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.10 audits isolation, history, instrument switching, and no-standalone-UI boundaries.

## Step 286.10 Completion - Isolation And History Audited

Completed on 2026-06-14.

Audit results:

- `rg` found no Order Review write API usage inside `v4/src/live-record` or `live-record-actions.js`.
- `history-manager.js` includes `liveRecords` in snapshots and restores through `loadLiveRecords()`.
- Live Record smoke covers instrument-scoped persistence/restore and undo/redo for Live Record mutations.
- `rg` found no standalone `Live Orders` UI strings in `v4/src`, `v4/index.html`, or `v4/style.css`.
- Existing Order Setup smoke still passes after Live Record chart interaction changes.

Verification:

- `rg -n "orderReview|orderReviews|updateOrderReview|addOrderReview|deleteOrderReview|updateActiveReviewSet|linkRefToActiveReviewSet|createChartReviewSet" v4/src/live-record v4/src/ui/inspector/live-record-actions.js`
- `rg -n "liveRecords|getLiveRecords|loadLiveRecords|live-record" v4/src/history/history-manager.js v4/src/live-record v4/src/pda/manual-annotation.js`
- `rg -n "Live Orders|live orders|live-orders|liveOrders" v4/src v4/index.html v4/style.css`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/order-setup-smoke.js`

Note: Node still reports the existing typeless package warning for ES module tests.

Next step: Step 286.11 adds focused smoke tests for chart actions, renderer projection, hit-test, hide/delete, and isolation.
