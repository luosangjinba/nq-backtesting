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
