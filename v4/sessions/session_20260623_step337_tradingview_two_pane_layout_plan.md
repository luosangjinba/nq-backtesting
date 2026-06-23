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
