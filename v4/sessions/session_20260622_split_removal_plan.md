# Step 321: Split Removal Planning

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

## Context

Step 320 focused real-use audit passed. Comparison Window is now allowed to enter Split removal planning.

The old Split implementation should be removed cautiously because it is intertwined with toolbar state, secondary chart stores, replay routing, SMT, locate actions, and persistence.

## Goal

Create a staged removal path for the legacy Split feature while preserving Comparison Window workflows:

- remove the user-facing Split entry points;
- keep any still-needed secondary data services until replaced or proven unused;
- remove dead split-only code after tests prove no workflow depends on it;
- update docs and tests so Comparison Window is the supported comparison workflow.

## Non-goals

- Do not delete all secondary modules in one commit.
- Do not remove shared utilities used by Comparison Window, SMT, or replay.
- Do not change Comparison Window product behavior unless needed to replace Split references.

## Step 321.1: Split Dependency Audit

Status: completed.

Inventory:

- toolbar Split toggle and layout controls;
- secondary chart/store/rendering modules;
- split-specific CSS;
- replay and locate references to secondary chart;
- SMT references that still use secondary context;
- docs/tests that still present Split as active workflow.

Output:

- A removal map with `remove`, `keep temporarily`, and `migrate first` buckets.

Result:

- Remove now: toolbar Split/Sub/Sub TF/Layout controls, secondary chart DOM panel, split layout CSS, replay history split state persistence/display, app initialization for secondary controller/renderers/context menu.
- Keep temporarily: secondary modules referenced by selection guards, chart contexts, viewport/pick routers, SMT internals, and locate helpers.
- Migrate first before deletion: secondary chart manager/store, secondary PDA/Segment renderers, secondary context menu, secondary viewport controller, and secondary references in pick/locate/SMT code.

## Step 321.2: Disable User-facing Split Entry Points

Status: completed.

Remove or hide:

- Split checkbox/toggle;
- Stack/Side split layout selector where it only affects old Split;
- stale status copy that tells users to use Split.

Keep:

- Comparison Window controls;
- any secondary internals still required by SMT or replay until Step 321.3 proves they are dead.

Verification:

- App loads without Split UI.
- Comparison Window still opens and restores.

Result:

- Removed Split checkbox, Sub instrument, Sub TF, and Stack/Side layout controls from the toolbar.
- Removed the secondary chart panel from `index.html`.
- Comparison Window toggle remains available.
- Browser smoke asserts Split UI is absent and Comparison Window is still usable.

## Step 321.3: Migrate or Remove Split-only Runtime Paths

Status: completed for user-facing runtime; deeper secondary cleanup deferred.

For each audited dependency:

- migrate to Comparison Window;
- delete if dead;
- or keep with a clear TODO if still shared.

High-risk areas:

- secondary chart manager;
- secondary replay sync;
- SMT time alignment;
- locate router;
- persistence/history restore.

Result:

- Removed app initialization for the old secondary chart controller, secondary PDA/Segment renderers, and secondary context menu.
- Removed Replay History split checkpoint storage, restore application, and history-row Split label.
- Kept deeper secondary modules in place because they are still imported by shared selection, pick, locate, SMT, and viewport code.
- Step 322 should focus on migrating or deleting those remaining secondary internals safely.

## Step 321.4: Update Tests

Status: completed.

Expected test work:

- remove assertions for old Split UI;
- add assertions that Comparison Window remains available without Split;
- keep SMT/replay/locate tests green;
- add a smoke that Split UI is absent or disabled if appropriate.

Required suite:

- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/viewport-router-smoke.js`
- `git diff --check`

Result:

- Updated `comparison-window-browser-smoke` to assert old Split UI and secondary panel are absent while Compare remains available.
- Updated `replay-history-comparison-smoke` to assert normalized history no longer contains `split`.
- Required suite passed.

## Step 321.5: Documentation Closeout

Status: completed.

Update:

- user guide comparison workflow;
- audit doc decision;
- TODO/session;
- any README references that still recommend Split.

Decision:

- If removal is clean, Step 322 can delete remaining dead secondary code.
- If shared secondary paths remain, Step 322 should be a focused migration, not deletion.

Result:

- Updated user guides, operation manual, docs README, TODO, and this session file.
- Decision: user-facing Split removal is complete.
- Next recommended step: Step 322 focused secondary internals cleanup/migration.

Verification:

- `git diff --check`
- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/viewport-router-smoke.js`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-render-policy-smoke.js`
