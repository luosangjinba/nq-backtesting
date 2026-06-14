# Journal Zero Restart Plan - Clone Order Setups First

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Reset point: `340f3ac docs(v4): close es daily regime parity`

Backup branches:

- `backup/journal-redesign-before-zero-reset-20260614`: preserves the previous Journal Phase A-C implementation before the full zero reset.
- `backup/live-ui-reset-20260614`: preserves the earlier rejected standalone Live Orders UI attempt.

## Why This Restart Exists

The previous Journal direction drifted away from the desired UI model. It introduced live order runtime pieces first, then started toward a separate Live Orders panel. The required product behavior is different:

- Live Records should look and behave almost exactly like Order Setups.
- The Calendar / Day Details surface should show a `Live Records` group alongside `Order Setups`, not a separate lower panel.
- Empty state should mirror Order Setups: group header, count badge, and `None`.
- Populated rows should mirror Order Setups: time, type pill, status dot, summary line, and `...` menu.
- Detail view should mirror Order Setup Detail structure and density.

Therefore the restart intentionally discards the previous live-order runtime modules from the active branch and starts by cloning the proven Order Setups interaction model.

## Product Boundary

The first product target is not a full journal workspace. It is a second object family, `Live Records`, that is visually and behaviorally parallel to `Order Setups`.

Required first-version behavior:

- Calendar / Day Details includes a `Live Records` group directly near `Order Setups`.
- `Live Records` uses the same object group shell, badge, row density, row actions, open behavior, and detail navigation conventions as `Order Setups`.
- A new live record can be created from a chart context action using the clicked bar as the record anchor.
- A live record can remain standalone; it must not require an Order Setup.
- A live record can optionally link to an Order Setup later.
- The detail page uses Order Setup Detail as the template, then renames or adapts fields only where live execution semantics require it.

Explicit non-goals for this restart:

- No standalone `Live Orders` panel below Calendar.
- No broker API, auto fill import, PnL dashboard, or statistics dashboard.
- No large journal workspace.
- No Review JSON import/export until the object works locally.
- No renderer / hit-test changes until the Calendar and Inspector parity is stable.
- No migration of existing `orderReviews` storage schema.

## Existing Order Setups Surfaces To Clone

The implementation should start by auditing and reusing these existing patterns:

- Runtime schema/store: `v4/src/order/order-review-types.js`, `v4/src/order/order-review-store.js`, `v4/src/order/setup-set.js`
- Active state: `v4/src/order/order-review-active.js`
- Persistence: `v4/src/order/order-review-persistence.js`
- Chart actions: `v4/src/order/order-setup-chart-actions.js`
- Calendar index and object grouping: `v4/src/calendar/calendar-review-index.js`, `v4/src/calendar/calendar-types.js`
- Calendar UI/actions: `v4/src/ui/inspector/calendar-panel.js`, `v4/src/ui/inspector/calendar-actions.js`
- Inspector detail: `v4/src/ui/inspector/order-review-panel.js`
- Inspector action controller: `v4/src/ui/inspector/order-review-actions.js`, `v4/src/ui/inspector/order-review-edit-actions.js`, `v4/src/ui/inspector/order-review-lifecycle-actions.js`, `v4/src/ui/inspector/order-review-reason-actions.js`
- Sidebar routing/page stack: `v4/src/ui/inspector-sidebar.js`, `v4/src/ui/inspector/page-stack.js`
- Smoke baseline: `v4/tests/order-setup-smoke.js`

The first implementation should prefer adapter-style cloning over inventing a new UI shell. If a helper can be generalized without broad churn, do that only after the Live Records clone is visibly correct.

## Step 285 Breakdown

### Step 285.1 - Freeze Zero-Restart Boundary

Record the reset, backup branches, product target, non-goals, and acceptance criteria. Do not write runtime code in this substep.

Acceptance:

- TODO and session plan agree that previous Phase A-C live-order work is not active on this branch.
- The next implementation path starts from Order Setups parity, not standalone Live Orders.

### Step 285.2 - Audit Order Setups Clone Points

Read the Order Setup store, setup-set adapter, Calendar index/group rendering, Inspector detail, action controller, persistence, and smoke tests.

Acceptance:

- The plan records which files will be cloned, which files will be shared, and which files should not be touched yet.
- No behavior change.

### Step 285.3 - Clone Live Record Runtime Skeleton From Order Setup Patterns

Create a minimal `live-record` runtime folder that follows Order Setup store conventions:

- `live-record-types.js`
- `live-record-store.js`
- `live-record-active.js`
- optional `live-record-set.js` adapter if the UI needs a setup-set-like projection

Keep the first schema close to Order Setup:

- id, instrument, createdAt, updatedAt
- direction
- anchor timestamp/timeframe/price
- summary
- display hidden/visible fields
- execution elements shaped like Order Setup execution rows
- reasons/linked refs shaped like Order Setup reasons where practical
- result/review field shaped like Order Setup result where practical

Acceptance:

- A live record can be added, updated, deleted, loaded, and queried in memory.
- Active live record state is independent from active Order Setup.
- No Calendar/Inspector UI yet.

### Step 285.4 - Add Instrument-Scoped Persistence

Clone the Order Review persistence style but use a new key family:

- `v4:live-records:<instrument>`

Acceptance:

- NQ and ES live records do not mix.
- Restore does not overwrite during restore.
- Existing `orderReviews` data is not read, written, migrated, or deleted.

### Step 285.5 - Add Chart Context Creation Without Separate Panel

Add a chart context action such as `New Live Record Here`.

The action creates a live record from the clicked bar anchor and sets it active. It should not create an Order Setup and should not show a separate Live Orders panel.

Acceptance:

- Right-click creation creates a persisted live record.
- The clicked timestamp/timeframe/price appear as the live record anchor.
- The active Order Setup is not changed.

### Step 285.6 - Add Calendar / Day Details Live Records Group

Extend the Calendar review index and Day Details rendering to add a `Live Records` group directly next to `Order Setups`.

The group must visually match Order Setups:

- same group card shell
- same expand/collapse behavior
- same count badge
- empty state shows `None`
- rows use the same density and row anatomy

Acceptance:

- With zero records, the UI shows `Live Records` count 0 and `None`.
- With one record, it shows one row under `Live Records`, not under a separate panel.
- Order Setups group remains unchanged.

### Step 285.7 - Clone Order Setup Detail Into Live Record Detail

Add a Live Record detail route/page that mirrors `Order Setup Detail`:

- header
- Display
- Summary
- Anchor
- Execution
- Reasons or Notes
- Result / Review

Only rename labels where necessary. Do not redesign density or layout.

Acceptance:

- Opening a Calendar Live Record row navigates to a detail panel that feels like Order Setup Detail.
- Basic summary/display/result fields can be edited and persist.
- Detail actions do not mutate Order Setup data.

### Step 285.8 - Clone Row Menu And Detail Actions

Implement the same action style as Order Setups:

- Open
- Locate
- Set Active
- Hide/Show
- Delete
- Link To Active Order Setup if an active setup exists
- Unlink Setup if already linked

Acceptance:

- Actions appear in the same `...` affordance style as Order Setups.
- Delete affects only Live Records.
- Link/unlink updates only the live record.

### Step 285.9 - Add Focused Smoke Tests

Add smoke coverage based on `order-setup-smoke.js` style:

- live record store normalize/CRUD
- persistence by instrument
- chart context creation
- Calendar group empty/populated rendering
- detail open/edit/delete
- Order Setup isolation

Acceptance:

- Targeted smoke tests pass.
- `node --check` passes for new/changed JS files.
- `git diff --check` passes.

### Step 285.10 - Browser Visual Verification

Run the local app and verify the exact visual target:

- no live records: `Live Records` group mirrors the screenshot style of empty `Order Setups`
- one live record: row mirrors the screenshot style of populated `Order Setups`
- detail page mirrors the screenshot style of `Order Setup Detail`

Acceptance:

- The UI change is visible in Calendar / Inspector.
- There is no standalone Live Orders panel.
- Screenshots or browser smoke notes are attached to the session closeout.

## Design Guardrails

- Prefer copy/adapt from Order Setups before introducing abstractions.
- Do not generalize Order Setup internals until the cloned Live Records UI is correct.
- Keep storage separate: `orderReviews` remains Order Setup, `liveRecords` remains Live Record.
- Keep live records standalone by default; linking to Order Setup is optional.
- Keep every substep small enough to commit independently.

## Next Immediate Action

Execute Step 285.1, then commit. After that, proceed through Step 285.2 to Step 285.10 in order, committing after each substep.

## Step 285.1 Completion - Zero-Restart Boundary Frozen

Completed on 2026-06-14.

Confirmed current branch state:

- Active branch: `feature/journal-order-recording-redesign`.
- Current branch starts from `340f3ac docs(v4): close es daily regime parity`.
- The only active Journal restart commit before Step 285 execution is `1af0def docs(v4): plan journal zero restart`.
- Relative to `main`, the active branch contained only TODO/session planning docs before Step 285.1.
- No `v4/src` or `v4/tests` live-order/live-record runtime files from the previous Phase A-C implementation are active on this branch.

Frozen execution boundary:

- Implement `Live Records` by cloning the `Order Setups` UI and interaction model first.
- Do not revive the previous standalone `Live Orders` panel design.
- Do not reuse previous Phase A-C live-order runtime modules directly from backup; use them only as historical reference if needed.
- Keep all live record storage separate from existing `orderReviews`.
- Keep every Step 285 substep independently committed.

Step 285.2 should audit the existing Order Setups code paths before writing runtime code.

## Step 285.2 Completion - Order Setups Clone Points Audit

Completed on 2026-06-14.

Audited the active Order Setups implementation and confirmed the clone-first route.

### Runtime / Store

Order Setups persist through `orderReviews` but are displayed through a richer Setup Set adapter:

- `v4/src/order/order-review-types.js`: enum definitions and allowed values.
- `v4/src/order/order-review-store.js`: normalize helpers, CRUD, clone-on-read, and `order-review:changed` event.
- `v4/src/order/setup-set.js`: runtime/view-model projection consumed by Calendar, renderer, hit-test, and Inspector.
- `v4/src/order/order-review-active.js`: active setup id and chart-first creation helpers.

Live Records should clone the same layering:

- `live-record-types.js`
- `live-record-store.js`
- `live-record-active.js`
- `live-record-set.js` only if the Calendar/detail projection needs setup-set-like derived fields.

Do not write Live Records into `orderReviews`; use a separate store and event name.

### Persistence

Order Setups use:

- `v4/src/order/order-review-persistence.js`
- `v4:order-reviews:<instrument>` through `getInstrumentStorageKey()`
- restore guard with `restoring`
- `primary-instrument:changed` save previous / restore next behavior

Live Records should clone this pattern with:

- `v4:live-records:<instrument>`
- `live-record:changed`
- no migration from `orderReviews`

### Calendar Index

Order Setups enter Calendar through:

- `v4/src/calendar/calendar-types.js`
- `v4/src/calendar/calendar-review-index.js`
- `getSetupSets() -> createSetupSetItem() -> createCalendarItem()`
- `CALENDAR_OBJECT_TYPES.ORDER_SETUP`
- group label `Order Setups`

Live Records should add:

- `CALENDAR_OBJECT_TYPES.LIVE_RECORD = 'live-record'`
- group label `Live Records`
- group order directly after `ORDER_SETUP`
- `getLiveRecords() -> createLiveRecordItem()`

The item should reuse the same Calendar item shape: `id`, `type`, `dateKey`, `timestamp`, `label`, `range`, `ref`, `source`.

### Calendar UI

Order Setup row behavior lives in `v4/src/ui/inspector/calendar-panel.js`:

- `getObjectTypeLabel()` returns `Setup`.
- `renderObjectGroup()` opens the Order Setups group by default.
- `renderObjectRow()` applies `calendar-object-row-setup`.
- `renderSetupVisibilityToggle()` draws the setup visibility dot.
- `renderObjectActionButtons()` enables Open / Locate / Hide / Delete for setup rows.

Live Records should initially reuse the same row shell and density:

- add `Live` type label
- use the same status dot/visibility button style with a live-record-specific action
- open the Live Records group by default like Order Setups
- do not add a separate panel under Calendar

### Inspector Detail / Routing

Order Setup detail route lives in `v4/src/ui/inspector-sidebar.js`:

- `openCalendarObject('order-setup', id)`
- `renderOrderSetupDetail(orderReviewId)`
- `renderPageFromState()` branch for `objectType === 'order-setup'`
- `order-review:changed` refreshes the active/detail view

Order Setup detail panel lives in:

- `v4/src/ui/inspector/order-review-panel.js`

It renders:

- Header
- Display
- Summary
- Anchor
- Execution
- Entry Context
- Reasons
- Result

Live Record detail should add a parallel route:

- `objectType === 'live-record'`
- `renderLiveRecordDetail(liveRecordId)`
- `renderLiveRecordDetailPanel(record, options)`
- `live-record:changed` refresh listener

The first detail panel should copy the Order Setup density and section order before field semantics are refined.

### Actions

Order Setup Inspector actions are split across:

- `v4/src/ui/inspector/order-review-actions.js`
- `order-review-edit-actions.js`
- `order-review-lifecycle-actions.js`
- `order-review-reason-actions.js`

For Live Records, create a separate action facade instead of mixing handlers into Order Setup actions:

- `v4/src/ui/inspector/live-record-actions.js`

First action scope:

- summary edit
- display hidden/show
- set active
- delete
- optional link/unlink active Order Setup after runtime link field exists

### Chart Context Creation

Order Setup chart creation and context menu entries are in:

- `v4/src/order/order-setup-chart-actions.js`
- primary context menu code that calls `handleOrderSetupChartAction()`

Live Records should not clone the full Order Setup chart action set first. Step 285.5 should add only one chart action:

- `New Live Record Here`

It should create a standalone record from the clicked bar anchor, set it active, and leave active Order Setup untouched.

### Tests

Order Setup baseline:

- `v4/tests/order-setup-smoke.js`

Live Records should add focused smoke rather than broad browser coverage first:

- store normalize/CRUD
- instrument persistence
- chart context creation helper
- Calendar group item projection
- detail edit/delete
- Order Setup isolation

### Files To Add Later

Expected new files:

- `v4/src/live-record/live-record-types.js`
- `v4/src/live-record/live-record-store.js`
- `v4/src/live-record/live-record-active.js`
- `v4/src/live-record/live-record-persistence.js`
- `v4/src/live-record/live-record-chart-actions.js`
- `v4/src/ui/inspector/live-record-panel.js`
- `v4/src/ui/inspector/live-record-actions.js`
- `v4/tests/live-record-smoke.js`

Expected existing files to edit:

- `v4/src/app.js`
- `v4/src/calendar/calendar-types.js`
- `v4/src/calendar/calendar-review-index.js`
- `v4/src/ui/inspector/calendar-panel.js`
- `v4/src/ui/inspector/calendar-actions.js` only if open/locate behavior needs special handling
- `v4/src/ui/inspector-sidebar.js`
- the primary chart context menu module where Order Setup actions are rendered
- `v4/TODO.md`
- this session document

### Guardrail Confirmed

The first code step should not abstract Order Setup into a shared generic object system. The safer path is to copy the proven structure into a separate Live Record path, keep names explicit, and only extract shared helpers after the UI matches Order Setups.
