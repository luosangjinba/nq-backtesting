# Session 2026-06-19 - Step 298 Entry Context Catalog Plan

## Context

Live Record Detail and Order Setup Detail both have Entry Context fields for Pattern and Session. Live Record orders also need a maintainable Lessons field.

The user clarified that old persisted data is not fixed yet because V4 is still in testing, so this plan can prefer a clean data model over complex legacy migration. Even so, catalog references should use stable IDs and soft deletion so future maintenance does not break historical records.

## Goal

Introduce one shared maintainable Entry Context catalog used by both Live Record Detail and Order Setup Detail:

- `patterns`
- `sessions`
- `lessons`

Pattern and Session must stay synchronized between Live Record and Order Setup because both panels describe the same entry context vocabulary. Lessons are initially for Live Record orders, but should live in the same catalog system to avoid a second maintenance path.

## Data Model Direction

Catalog item:

```js
{
  id: "ny-am",
  label: "NY AM",
  active: true,
  sort: 10
}
```

Live Record / Order Setup Entry Context:

```js
entryContext: {
  patternId: "breakout-failure",
  sessionId: "ny-am"
}
```

Live Record order lessons:

```js
lessonIds: ["late-entry", "moved-stop-too-early"]
```

Maintenance rules:

- Add creates a stable ID.
- Rename changes `label`, not `id`.
- Delete should be soft delete via `active: false`.
- New dropdowns show active items.
- Existing records can still resolve inactive items.
- Missing IDs should display a fallback ID or snapshot if one is added.

## Step 298.1: Current-State Audit

Tasks:

- Audit Live Record Detail Entry Context Pattern / Session fields, option sources, render code, and persistence shape.
- Audit Order Setup Detail Entry Context Pattern / Session fields, option sources, render code, and persistence shape.
- Audit Live Record order data structure and identify where order-level `lessonIds` should live.
- Record the field mapping and target normalized shape.

Acceptance:

- No behavior changes.
- TODO/session notes identify exact files and field names to migrate.

Status: complete.

Findings:

- Shared hardcoded option source today:
  - `v4/src/order/order-review-types.js`
  - `ORDER_ENTRY_PATTERN_DEFINITIONS`
  - `ORDER_ENTRY_SESSION_DEFINITIONS`
- Live Record Detail render path:
  - `v4/src/ui/inspector/live-record-panel.js`
  - Pattern renders checkbox group from `ORDER_ENTRY_PATTERN_DEFINITIONS`.
  - Session renders a select from `ORDER_ENTRY_SESSION_DEFINITIONS`.
  - Existing storage shape is `entryContext.patterns` array and `entryContext.session` string.
- Live Record action/write path:
  - `v4/src/ui/inspector/live-record-actions.js`
  - `live-record-entry-context-field` patches `entryContext.patterns` or `entryContext.session`.
  - `v4/src/live-record/live-record-store.js` normalizes `entryContext.patterns` / `entryContext.session`, with `entryPatterns` / `entrySession` accepted as aliases.
- Order Setup Detail render path:
  - `v4/src/ui/inspector/order-review-panel.js`
  - Pattern renders checkbox group from the same `ORDER_ENTRY_PATTERN_DEFINITIONS`.
  - Session renders a select from the same `ORDER_ENTRY_SESSION_DEFINITIONS`.
  - Existing storage shape is `entryPlan.entryPatterns` array and `entryPlan.entrySession` string.
- Order Setup action/write path:
  - `v4/src/ui/inspector/order-review-edit-actions.js`
  - `v4/src/ui/inspector/order-review-utils.js`
  - `order-review-edit-field` writes through `updateOrderReviewEntryField(...)`; `entryPatterns` is collected from checked inputs.
  - `v4/src/order/order-review-store.js` validates against `VALID_ORDER_ENTRY_PATTERNS` / `VALID_ORDER_ENTRY_SESSIONS`.
- Live Record order lessons target:
  - There is no order-level lessons field yet.
  - The clean target is Live Record store-level `lessonIds` on each record/order object, normalized as an array of stable catalog IDs.

Migration direction:

- Keep Pattern as multi-select and Session as single-select.
- Introduce new normalized IDs as `entryContext.patternIds` / `entryContext.sessionId` and `entryPlan.entryPatternIds` / `entryPlan.entrySessionId`, or directly move existing array/string fields to catalog IDs if implementation stays simpler.
- Since old data is not fixed, the implementation can update smoke expectations and storage shape directly, while preserving lightweight fallback aliases during the transition if cheaper than removing them.

## Step 298.2: Shared Catalog Store

Tasks:

- Add a shared catalog store, tentatively `entry-context-catalog-store.js`.
- Manage:
  - `patterns`
  - `sessions`
  - `lessons`
- Provide APIs for list active/all, add, rename, deactivate, reorder, resolve label, and persistence.
- Seed initial Pattern / Session defaults from existing hardcoded options.

Acceptance:

- Store can be unit-smoked without UI.
- Catalog persistence survives reload.

Status: complete.

Implementation:

- Added `v4/src/entry-context/entry-context-catalog-store.js`.
- Catalog groups:
  - `patterns`
  - `sessions`
  - `lessons`
- Pattern and Session defaults are seeded from the existing `ORDER_ENTRY_PATTERN_DEFINITIONS` and `ORDER_ENTRY_SESSION_DEFINITIONS`.
- Lessons start empty.
- Store APIs include:
  - `getEntryContextCatalog()`
  - `getCatalogItems(group, { includeInactive })`
  - `getActiveCatalogItems(group)`
  - `resolveCatalogLabel(group, id, fallback)`
  - `addCatalogItem(group, label, options)`
  - `renameCatalogItem(group, id, label)`
  - `deactivateCatalogItem(group, id)`
  - `setCatalogItemSort(group, id, sort)`
  - `loadEntryContextCatalog(input)`
  - `resetEntryContextCatalog()`
  - `initEntryContextCatalogStore()`
- Store persists to localStorage key `v4:entry-context-catalog`.
- `app.js` initializes the catalog store on startup.
- Added `v4/tests/entry-context-catalog-smoke.js`.

Verification:

- `node --check v4/src/app.js`
- `node --check v4/src/entry-context/entry-context-catalog-store.js`
- `node --check v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `git diff --check`

## Step 298.3: Live Record Entry Context Catalog Integration

Tasks:

- Change Live Record Detail Pattern / Session dropdowns to read the shared catalog.
- Save `entryContext.patternId` and `entryContext.sessionId`.
- Resolve display labels through the catalog.
- Keep lightweight fallback for missing IDs.

Acceptance:

- Live Record Entry Context can select Pattern / Session from catalog.
- Existing empty or partial records do not crash.

Status: complete.

Implementation:

- `live-record-panel.js` now renders Entry Context Pattern / Session from the shared entry context catalog.
- Pattern remains a multi-select checkbox group.
- Session remains a single select.
- Live Record storage now normalizes to:
  - `entryContext.patternIds`
  - `entryContext.sessionId`
- `normalizeEntryContext(...)` still accepts old `patterns` / `session` / `entryPatterns` / `entrySession` inputs as a lightweight fallback.
- `live-record-actions.js` writes `patternIds` and `sessionId`.
- `live-record-smoke.js` expectations were updated to the new field names.

Verification:

- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/src/ui/inspector/live-record-actions.js`
- `node --check v4/src/live-record/live-record-store.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `git diff --check`

## Step 298.4: Order Setup Entry Context Catalog Integration

Tasks:

- Change Order Setup Detail Pattern / Session dropdowns to read the same shared catalog.
- Save the same normalized ID shape.
- Confirm changes made to catalog display in both Live Record and Order Setup.

Acceptance:

- Pattern / Session vocabulary is shared and synchronized across both panels.

Status: complete.

Implementation:

- `order-review-panel.js` now renders Entry Context Pattern / Session from the shared entry context catalog.
- Pattern remains a multi-select checkbox group.
- Session remains a single select.
- Order Setup storage now normalizes to:
  - `entryPlan.entryPatternIds`
  - `entryPlan.entrySessionId`
- `normalizeEntryPlan(...)` still accepts old `entryPatterns` / `entrySession` inputs as a lightweight fallback.
- Dynamic Pattern / Session IDs are no longer validated against the old fixed enum sets, so user-maintained catalog items are preserved.
- `order-review-utils.js` now collects checked Pattern IDs from `entryPatternIds`.
- Existing Live Record and Order Setup smoke tests now assert that a custom catalog Pattern renders in both detail panels.

Verification:

- `node --check v4/src/order/order-review-store.js`
- `node --check v4/src/ui/inspector/order-review-panel.js`
- `node --check v4/src/ui/inspector/order-review-utils.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `git diff --check`

## Step 298.5: Live Record Order Lessons

Tasks:

- Add order-level `lessonIds`.
- Add Lessons dropdown / multi-select UI in Live Record Detail for each live order.
- Read choices from shared catalog `lessons`.
- Allow removing selected lessons from an order.
- Display inactive lessons for historical records.

Acceptance:

- Lessons save and restore per live order.
- Multiple lessons can be attached to one order.

Status: complete.

Implementation:

- `live-record-store.js` normalizes `execution.orders[].lessonIds` as a deduped array of stable catalog IDs.
- `cloneLiveRecord(...)` deep-copies `lessonIds`.
- `live-record-panel.js` adds an Orders panel when `execution.orders[]` exists.
- Each order renders Lessons as a multi-select checkbox group from the shared `lessons` catalog.
- Selected inactive or unknown lesson IDs remain visible through the same catalog fallback helper.
- `live-record-actions.js` handles `live-record-order-lesson-field` and patches only the selected order's `lessonIds`.

Verification:

- `node --check v4/src/live-record/live-record-store.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node --check v4/src/ui/inspector/live-record-actions.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `git diff --check`

## Step 298.6: Catalog Maintenance UI

Tasks:

- Add a maintenance UI entry for Patterns, Sessions, and Lessons.
- Support add, rename, deactivate, and ordering.
- Avoid hard delete.
- Keep the UI shared, not tied only to Live Record.

Acceptance:

- User can maintain all three catalog groups from the UI.
- Inactive items disappear from new-selection dropdowns but remain resolvable for existing records.

Completed:

- Added `entry-context-catalog-panel.js` with a shared Inspector maintenance panel for `patterns`, `sessions`, and `lessons`.
- Added `entry-context-catalog-actions.js` for add, rename, soft deactivate, reactivate, and sort actions.
- Added `activateCatalogItem(...)` so soft-deleted items can be restored from the maintenance UI.
- Added a home/archive Inspector entry point and page-stack route for `entry-context-catalog`.
- Added compact CSS for catalog rows, inactive state, add controls, label edit, and sort input.
- Extended `entry-context-catalog-smoke.js` to cover reactivate and maintenance-control rendering.

Verification:

- `node --check v4/src/entry-context/entry-context-catalog-store.js`
- `node --check v4/src/ui/inspector/entry-context-catalog-panel.js`
- `node --check v4/src/ui/inspector/entry-context-catalog-actions.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `git diff --check`

## Step 298.7: Sync Events And Persistence

Tasks:

- Emit an event such as `entry-context-catalog:changed` after catalog edits.
- Re-render Live Record Detail and Order Setup Detail on catalog changes.
- Persist catalog using the existing local persistence pattern.

Acceptance:

- Editing the catalog updates both panels without manual refresh.
- Reload preserves catalog edits.

Completed:

- `entry-context-catalog-store.js` continues to persist catalog state through `createLocalPersistence` on every mutation.
- Catalog mutation events now include smoke coverage for `entry-context-catalog:changed`, including mutation reason and edited group.
- `inspector-sidebar.js` subscribes to `ENTRY_CONTEXT_CATALOG_CHANGED`.
- The Inspector refreshes the Catalog maintenance panel, Live Record Detail, and Order Setup Detail when catalog labels/options change.

Verification:

- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/entry-context-catalog-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `git diff --check`

## Step 298.8: Tests And Smoke

Tasks:

- Add focused smoke coverage:
  - Add Pattern, appears in Live Record and Order Setup.
  - Rename Pattern, both panels resolve the new label.
  - Deactivate Pattern, new dropdown hides it and existing record still resolves it.
  - Add Lesson, attach to Live Record order, reload/restore.
  - Rename Lesson, Live Record order display updates.
- Run existing Live Record and Order Setup smokes.

Acceptance:

- New focused tests pass.
- Existing `order-setup-smoke`, `live-record-smoke`, `live-record-chart-actions-smoke`, and `git diff --check` pass.

## Step 298.9: Closeout

Tasks:

- Update `v4/TODO.md`.
- Record final data structures and verification results here.
- Note any deferred old-data migration decisions.

Acceptance:

- Worktree is clean after commit.
- Step 298 scope is limited to shared Entry Context catalogs and Live Record order lessons.

## Risk Notes

- Avoid duplicate Pattern / Session vocabularies between Order Setup and Live Record.
- Avoid hard-deleting catalog items referenced by existing records.
- Avoid a large migration framework unless implementation discovers a concrete need.
