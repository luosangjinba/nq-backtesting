# Step 322: Secondary Internals Cleanup / Migration

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Step 321 removed the user-facing Split workflow:

- toolbar Split/Sub/Sub TF/Layout controls are gone;
- secondary chart DOM panel is gone;
- app no longer initializes secondary chart controller, secondary PDA/Segment renderers, or secondary context menu;
- Replay History no longer saves or restores split state.

Several `secondary-*` modules and references remain in the source tree because they are imported by shared selection, locate, pick-preview, SMT, viewport, and legacy tests. These should be cleaned up in a focused step rather than deleted blindly.

## Goal

Remove or migrate remaining secondary internals after user-facing Split removal while preserving Comparison Window, SMT, replay, locate, and pick workflows.

## Non-goals

- Do not change Comparison Window UX unless needed to replace a secondary dependency.
- Do not remove primary/comparison shared routing.
- Do not keep dead secondary code just because tests still reference it; update tests to the supported Comparison workflow.

## Step 322.1: Import Surface Audit

Status: completed.

Classify remaining secondary references:

- selection outside-click guards;
- chart context and viewport router targets;
- pick context router targets;
- PDA manual action `secondary-locate-time`;
- inspector/sidebar secondary hover/click hooks;
- SMT renderer/manual logic using secondary store/chart;
- secondary chart controller/manager/store;
- secondary PDA/Segment renderer and context menu;
- tests that directly instantiate secondary charts.

Output:

- `remove now`;
- `replace with comparison`;
- `keep temporarily with reason`;
- `test-only update`.

Result:

- `remove now`: outside-click guards and event listeners for removed DOM IDs (`#secondary-context-menu`, `#secondary-viewport-controls`, `#secondary-chart`) in PDA/Segment/SMT/Order/Live/Chart Note selection and Inspector sidebar.
- `replace with comparison`: `secondary-locate-time`, secondary viewport target, secondary pick context target, SMT manual/render/hit-test branches that now need Comparison Window semantics.
- `remove after migration`: `ui/secondary-chart-controller.js`, `chart/secondary-chart-manager.js`, `data/secondary-chart-store.js`, `pda/secondary-context-menu.js`, `pda/secondary-pda-renderer.js`, `segment/secondary-segment-renderer.js`, `chart/secondary-viewport-controller.js`.
- `test-only update`: `viewport-router-smoke`, `pick-context-router-smoke`, and the secondary section of `primitive-render-lifecycle-smoke`.

## Step 322.2: Remove Dead DOM Guards and Unreachable Handlers

Status: pending.

Remove references to IDs that no longer exist:

- `#secondary-context-menu`;
- `#secondary-viewport-controls`;
- `#secondary-chart`;

Expected areas:

- PDA/Segment/SMT/Order/Live/Chart Note selection outside-click guards;
- inspector sidebar click/crosshair listeners;
- secondary chart click handlers in PDA/Segment/SMT selection.

## Step 322.3: Migrate Locate/Pick Routing

Status: pending.

Replace old secondary routing where the user workflow now expects Comparison:

- remove `secondary-locate-time` menu item or route it to Comparison if appropriate;
- update viewport router targets so unsupported secondary target returns a clean skipped result;
- remove secondary pick context target or replace with Comparison target where call sites still need multi-chart picking.

## Step 322.4: Remove Uninitialized Secondary Runtime Modules

Status: pending.

After references are migrated:

- delete `ui/secondary-chart-controller.js`;
- delete or quarantine `chart/secondary-chart-manager.js`;
- delete or quarantine `data/secondary-chart-store.js`;
- delete `pda/secondary-context-menu.js`;
- delete `pda/secondary-pda-renderer.js`;
- delete `segment/secondary-segment-renderer.js`;
- remove secondary CSS/test scaffolding that only exists for old Split.

If any module remains needed by SMT internals, migrate that logic to Comparison first.

## Step 322.5: Test and Documentation Update

Status: pending.

Update tests away from secondary chart assumptions:

- `pick-context-router-smoke`;
- `viewport-router-smoke`;
- `primitive-render-lifecycle-smoke`;
- SMT tests if they still refer to secondary.

Required suite:

- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/pick-context-router-smoke.js`
- `node v4/tests/viewport-router-smoke.js`
- `node v4/tests/primitive-render-lifecycle-smoke.js`
- `git diff --check`

## Step 322.6: Closeout

Status: pending.

Update:

- TODO;
- this session;
- user/developer docs if any secondary references remain.

Decision:

- If all secondary internals are removed, Step 323 can be broader cleanup/refactor.
- If some are retained for SMT or shared routing, document exactly why and create a focused migration step.
