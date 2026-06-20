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

## Step 298.3: Live Record Entry Context Catalog Integration

Tasks:

- Change Live Record Detail Pattern / Session dropdowns to read the shared catalog.
- Save `entryContext.patternId` and `entryContext.sessionId`.
- Resolve display labels through the catalog.
- Keep lightweight fallback for missing IDs.

Acceptance:

- Live Record Entry Context can select Pattern / Session from catalog.
- Existing empty or partial records do not crash.

## Step 298.4: Order Setup Entry Context Catalog Integration

Tasks:

- Change Order Setup Detail Pattern / Session dropdowns to read the same shared catalog.
- Save the same normalized ID shape.
- Confirm changes made to catalog display in both Live Record and Order Setup.

Acceptance:

- Pattern / Session vocabulary is shared and synchronized across both panels.

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

## Step 298.6: Catalog Maintenance UI

Tasks:

- Add a maintenance UI entry for Patterns, Sessions, and Lessons.
- Support add, rename, deactivate, and ordering.
- Avoid hard delete.
- Keep the UI shared, not tied only to Live Record.

Acceptance:

- User can maintain all three catalog groups from the UI.
- Inactive items disappear from new-selection dropdowns but remain resolvable for existing records.

## Step 298.7: Sync Events And Persistence

Tasks:

- Emit an event such as `entry-context-catalog:changed` after catalog edits.
- Re-render Live Record Detail and Order Setup Detail on catalog changes.
- Persist catalog using the existing local persistence pattern.

Acceptance:

- Editing the catalog updates both panels without manual refresh.
- Reload preserves catalog edits.

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
