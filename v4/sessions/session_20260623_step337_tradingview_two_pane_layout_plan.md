# Step 337 - TradingView-Style Two-Pane Layout Planning

## Context

The current V4 chart workspace has a strong Main + Comparison Window split:

- Main chart is the primary workspace.
- Comparison Window is a specialized sliding left-side chart.
- Several features still name concepts as `primary`, `main`, `comparison`, or legacy `secondary`.
- Comparison has already gained native price axis, viewport controls, right-click menu parity, and independent instrument/timeframe controls.

The user wants to learn from TradingView's multi-pane layout model:

- Multiple chart regions are equal panes.
- Initial V4 scope should only support two side-by-side panes.
- The top toolbar has one Symbol/TF control set, and it reflects the currently focused pane.
- Pane focus is visible through edge highlighting.
- Each pane has its own Sync/No Sync button.
- It must be valid for both panes to be No Sync.

This step is planning only. It should define the migration path before code changes, because this touches core chart architecture and will replace the current "Comparison is special" mental model over time.

## Goal

Define the first safe path from Main + Comparison Window to an equal chart-pane model:

- `single` and `two-column` layouts only.
- Two panes are equal chart surfaces, not main/sub.
- Top Symbol/TF controls follow the active pane.
- Active pane is shown with a blue edge highlight.
- Each pane has pane-local Sync/No Sync state.
- Sync uses group broadcast among panes that have Sync On.
- No Sync panes are fully independent for the initial sync surface.

## Non-goals

- Do not implement 3/4/8 pane layouts in the first build.
- Do not redesign every chart object store in one step.
- Do not remove legacy Comparison persistence until migration is proven.
- Do not sync Symbol/TF in the first pane-sync surface unless a later step explicitly chooses it.
- Do not make all panes share drawings/overlays by default.
- Do not remove Review JSON or legacy `secondary` compatibility.

## Product Rules

### Pane Equality

- A pane is a chart workspace unit with its own descriptor and chart instance.
- A pane has `id`, `instrument`, `timeframe`, `syncEnabled`, `visibleRange`, and pane-local UI state.
- In two-column mode, both panes should be conceptually equal.
- Existing Main and Comparison can remain implementation sources during migration, but UI language should move toward Pane 1 / Pane 2 or active pane.

### Active Pane

- Exactly one pane is active when at least one pane exists.
- Clicking a pane, opening its context menu, using its viewport controls, or interacting with its chart should make it active.
- Top toolbar Symbol/TF controls show active pane values.
- Changing Symbol/TF from the top toolbar changes only the active pane.
- Active pane edge highlight should follow the TradingView reference: visible but not visually heavy, preferably blue border/edge accent.

### Sync/No Sync

Each pane owns its own sync switch:

- `Sync On`: pane joins the sync group.
- `No Sync`: pane is independent.
- All panes may be No Sync.
- A single pane may be Sync On alone; it has no peer to synchronize with, so no visible sync occurs.
- With two panes Sync On, active pane viewport/crosshair changes broadcast to the other Sync On pane.
- A No Sync pane does not send sync and does not receive sync.

This is a group broadcast model, not a main-to-comparison model.

### Initial Sync Surface

First implementation should only sync:

- visible time range
- crosshair time/price position where feasible

Defer:

- Symbol sync
- timeframe sync
- date range control sync
- drawing sync
- overlay/object sync
- replay bar sync beyond existing behavior

## Step Plan

### Step 337.1 - Current architecture audit

Audit the existing Main and Comparison code before implementation:

- DOM structure in `index.html`.
- Main chart initialization and state ownership.
- Comparison controller/view/layout/data/crosshair modules.
- Viewport controls for main and comparison.
- Context menu routing for main and comparison.
- Overlay/object renderers and source instrument policy.
- Replay History persistence.
- Workspace/localStorage persistence.
- Browser smoke coverage.

Deliverable:

- A migration table with `reuse`, `wrap`, `replace`, `defer`, and `remove later` categories.

### Step 337.2 - Pane model contract

Design a minimal pane model:

```js
{
  id: 'pane-1',
  instrument: 'NQ',
  timeframe: 60,
  active: true,
  syncEnabled: true,
  visibleRange: null,
  layoutSlot: 'left'
}
```

Decisions to make:

- How to map current Main to `pane-1`.
- How to map current Comparison Window to `pane-2`.
- Whether pane descriptors live in a new `chart-pane-store.js` or wrap existing stores first.
- How active pane changes are emitted.
- How top toolbar reads/writes active pane descriptor.

### Step 337.3 - Layout shell scope

Only plan two layouts for the first implementation:

- `single`
- `two-column`

The shell should reserve future layout preset metadata, but not implement 3+ pane grids.

Acceptance idea:

- Single mode looks like current chart.
- Two-column mode shows two equal side-by-side chart regions.
- No pane is a floating/sliding overlay in this mode.

### Step 337.4 - Active pane toolbar behavior

Top toolbar behavior:

- One Symbol select.
- One TF select.
- Values come from active pane.
- Updates apply only to active pane.
- Active pane changes update toolbar values without reloading inactive panes.

Focus behavior:

- Click chart body.
- Click pane header.
- Open context menu.
- Use viewport controls.

Visual behavior:

- Active pane gets edge highlight.
- Inactive pane keeps normal border.
- Highlight should not hide price axis, controls, or legends.

### Step 337.5 - Pane-level Sync/No Sync semantics

Add a pane-level sync button to each pane header:

- Icon or concise label: Sync / No Sync.
- The button toggles only that pane.
- No global sync mode is required for the first version.

Broadcast rule:

1. Pane emits viewport/crosshair event.
2. If source pane `syncEnabled=false`, stop.
3. Send to every other pane where `syncEnabled=true`.
4. Ignore echo loops using a source token or guarded update flag.

Allowed states for two panes:

| Pane 1 | Pane 2 | Result |
| --- | --- | --- |
| Sync | Sync | visible range/crosshair sync both ways |
| Sync | No Sync | Pane 1 has no active peer; Pane 2 independent |
| No Sync | Sync | Pane 2 has no active peer; Pane 1 independent |
| No Sync | No Sync | both independent |

### Step 337.6 - Initial sync surface

Implement later only after planning is accepted:

- visible logical/time range sync
- crosshair sync

Do not include:

- Symbol/TF sync
- drawing sync
- overlay sync
- date range sync
- Replay mode sync changes

Reason:

- The pane shell and active toolbar behavior are already large changes.
- Symbol/TF and drawing sync require more product decisions and migration work.

### Step 337.7 - Migration and compatibility plan

Potential migration points:

- Existing Comparison Window open state becomes `layout='two-column'` with `pane-2` visible.
- Existing Comparison descriptor becomes pane-2 descriptor.
- Existing Drawing Sync / No Sync concept should be mapped carefully; it is not the same as pane-level viewport/crosshair Sync.
- Existing comparison overlay sync mode can remain internal until a later overlay sync decision.
- Replay History comparison persistence should be read and converted, not discarded.
- Legacy `secondary` metadata remains compatibility-only.

Compatibility rule:

- Read old workspace/localStorage states.
- Save new pane layout only after successful migration.
- Avoid removing old compatibility until a separate cleanup step.

### Step 337.8 - Verification plan

Browser smoke should cover:

- Single layout loads and behaves like current main chart.
- Two-column layout renders two nonblank charts.
- Clicking left/right panes changes active pane.
- Active pane edge highlight moves correctly.
- Top Symbol/TF controls reflect active pane.
- Changing Symbol/TF changes only active pane.
- Pane Sync/No Sync toggles are pane-local.
- Sync/Sync panes share visible range and crosshair.
- Sync/No Sync and No Sync/No Sync combinations stay independent.
- Existing comparison workspace migrates into two-column pane-2.
- Existing right-click menus still open on the intended pane.
- Viewport controls operate on the intended pane.

## Recommended Implementation Sequence After This Plan

1. Add pane store and active pane state without changing current UI.
2. Add active-pane toolbar adapter for current Main only.
3. Add two-column layout shell using existing Comparison chart internals.
4. Add pane focus highlight.
5. Move Symbol/TF controls to active pane behavior.
6. Add pane-level Sync/No Sync controls.
7. Implement visible-range sync.
8. Implement crosshair sync.
9. Migrate old Comparison persistence.
10. Expand smoke tests and update user docs.

## Open Questions

- Should pane labels be hidden like TradingView, or show compact `NQ 1H` / `ES 1H` labels inside each pane?
- Should pane-level Sync button control only viewport/crosshair, or should it later become a menu for Time / Crosshair / Symbol / Interval?
- Should Replay mode operate on active pane only, or continue to treat one pane as replay authority in the first build?
- Should two panes share the same date range loader cache, or should each pane load independently from API with shared caching underneath?

## Initial Status

Planned only. No runtime code changed.

## Execution Log

### Step 337.1 / 337.2 - Architecture audit and pane model

Initial audit findings:

- `index.html` has one static primary chart panel. The Comparison Window is injected at runtime by `initComparisonWindowController()`.
- Primary chart state is owned by `chart-manager.js`, `bar-store.js`, and `primary-instrument-store.js`.
- Comparison chart state is split across `comparison-window-store.js`, `comparison-chart-manager.js`, and the comparison controller/view/layout/data modules.
- Toolbar currently hard-codes `Main` / `Main TF` and writes only the primary instrument/timeframe.
- Comparison already has independent instrument/timeframe controls, native right price axis, viewport controls, right-click menu parity, and overlay/crosshair sync plumbing.
- Full pane equality should therefore start as a wrapper model around existing Main/Comparison, not as a one-shot rewrite of every renderer.

Implemented:

- Added `v4/src/chart-panes/chart-pane-store.js`.
- Added pane IDs `pane-1` and `pane-2`.
- Added layouts `single` and `two-column`.
- Added pane-local state fields: `instrument`, `timeframe`, `active`, `syncEnabled`, `visibleRange`, and `layoutSlot`.
- Added active pane setters/getters.
- Added pane descriptor update.
- Added pane-level Sync/No Sync toggles.
- Added `getSyncPeerPanes(sourcePaneId)` to encode the group broadcast rule.

Model decisions:

- Current Main maps to `pane-1`.
- Current Comparison maps to `pane-2`.
- The first model layer is intentionally independent from runtime UI so later steps can migrate one surface at a time.
- It is valid for all panes to be No Sync.
- A lone Sync On pane has no peers and therefore produces no visible synchronization.

Verification:

```bash
node v4/tests/chart-pane-store-smoke.js
git diff --check
```

Result:

- `chart pane store smoke passed`.
- `git diff --check` passed.
- Node emitted the existing typeless-package warning for ES module tests.

### Step 337.3 - Two-column layout shell

Implemented:

- `#chart-stack` gains `chart-stack-two-pane` when Compare is enabled.
- Primary chart panel and Comparison root become equal flex children.
- Comparison Window root gains `comparison-pane-root`.
- Comparison Window itself gains `comparison-window-pane`, fills its pane, and no longer overlays the primary chart.
- Primary OHLC legend offset is reset to `0px` because the primary pane is no longer covered by an overlay.
- Primary and comparison viewport controls center inside their own panes.

Deferred:

- 3/4/8 pane layout presets.
- Resizable pane splitters.
- Replacing the old Compare toggle with a full TradingView-style layout menu.

### Step 337.4 - Active pane toolbar and focus highlight

Implemented:

- Added `v4/src/chart-panes/chart-pane-dom.js`.
- Clicking, context-menuing, or focusing primary/comparison pane sets active pane.
- Active pane receives blue edge highlight with `chart-pane-active`.
- Toolbar Symbol/TF controls now read `getActivePane()`.
- Toolbar Symbol/TF updates primary pane through existing primary store/load path.
- Toolbar Symbol/TF updates comparison pane through existing comparison descriptor path.
- Existing comparison header controls still work and sync back into the pane model.

### Step 337.5 - Pane-level Sync/No Sync

Implemented:

- Each pane renders `.chart-pane-sync-toggle`.
- Toggling a button only changes that pane's `syncEnabled`.
- Both panes can be `No Sync` at the same time.
- The existing Drawings sync select remains a separate comparison overlay/drawing control.

### Step 337.6 - Initial sync surface

Implemented:

- Added `v4/src/chart-panes/chart-pane-range-sync.js`.
- Visible logical range changes broadcast only from a Sync On source pane to Sync On peer panes.
- Existing comparison crosshair sync now checks pane sync peers before showing sync cursor on the other pane.
- No Sync panes do not send or receive visible range/crosshair sync.

Deferred:

- Symbol/TF sync.
- Date range sync.
- Drawing/overlay sync unification.
- Replay authority redesign.

### Step 337.7 - Migration and compatibility

Implemented compatibility strategy:

- Existing Comparison Window enabled state still comes from `comparison-window-store`.
- Existing comparison descriptor maps to Pane 2.
- Existing Replay History comparison restore continues using the old comparison state and now renders as two-column pane.
- Existing comparison overlay sync mode remains available as `Drawings` and is not merged into pane-level Sync.
- Existing `secondary` compatibility remains untouched.

### Step 337.8 - Verification

Updated `v4/tests/comparison-window-browser-smoke.js`:

- Asserts Compare switches chart stack into two-pane layout.
- Asserts primary and comparison panes are equal width.
- Asserts primary legend no longer needs overlay offset.
- Asserts primary/comparison viewport controls center in their own panes.
- Asserts each pane has a Sync button.
- Asserts both panes can be No Sync at once and toggle back independently.
- Asserts clicking comparison/primary changes active pane and toolbar values follow.
- Keeps coverage for native comparison price axis, Inspector resize, close hit target, context menu, comparison data loading, Replay History comparison restore, and old Split DOM absence.

Verification commands:

```bash
node --check v4/src/chart-panes/chart-pane-dom.js
node --check v4/src/chart-panes/chart-pane-range-sync.js
node --check v4/src/ui/toolbar.js
node --check v4/src/ui/comparison/comparison-crosshair-sync.js
node v4/tests/chart-pane-store-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Results:

- All checks passed.
- Node emitted the existing typeless-package warning for ES module tests.

### Follow-up - Remove visible legacy Comparison Window chrome

User validation showed the right pane still exposed the old Comparison Window chrome:

- `Comparison Window` title.
- Separate Inst/TF controls.
- Reset/Close window actions.
- Pane-level Sync button duplicated with old comparison-specific controls.

Follow-up changes:

- Hid the full legacy Comparison Window header in pane mode.
- Hid legacy per-window Inst/TF controls in pane mode while keeping the hidden controls in DOM for existing controller/state compatibility.
- Hid legacy Reset/Close actions in pane mode.
- Marked Drawings Sync/No Sync as legacy chrome in pane mode; the hidden control still keeps existing overlay/drawing state compatibility.
- Kept pane-level Sync/No Sync button as the main pane sync switch.
- Removed the old smoke assertions that expected `Pane 2` title/subtitle or visible `Drawings`; the regression now asserts the legacy header and controls are hidden.

Verification:

```bash
node --check v4/src/ui/comparison/comparison-window-view.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result:

- Passed.
