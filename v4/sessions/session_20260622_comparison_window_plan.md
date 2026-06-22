# Step 307: Comparison Window / Sliding Window Plan

Date: 2026-06-22

## Background

The current Split Screen is a fixed secondary panel system. It works for NQ/ES comparison, secondary annotations, SMT, secondary overlays, and progressive replay, but its layout model is normal split-panel resize.

The requested TradingView-like behavior is different: a window can slide along a rail, while the chart content inside the view does not resize just because the outer window moves. This should not be bolted onto the existing Split implementation because Split already carries secondary chart lifecycle, SMT, replay, and annotation assumptions.

## Product Direction

Build a new `Comparison Window` system as a future replacement candidate for Split.

The goal is not just a visual mask over the primary chart. To replace Split, the window must become a full comparison chart view:

- independent `instrument`;
- independent `timeframe`;
- own chart context;
- own data loading and projection;
- optional annotation workflow;
- SMT compatibility;
- replay/progressive HTF parity;
- sliding/floating window shell.

Old Split remains available until real workflows prove Comparison Window covers all high-frequency cases.

## Core Principle

Dragging the comparison window frame changes the window position or crop, not the chart's internal scale. Candles, overlays, labels, and hit-test geometry should not resize merely because the user drags the outer rail/handle.

Chart resize is still allowed when the user intentionally changes the actual view size or viewport mode. It is not the default sliding interaction.

## Planned Steps

### Step 307.1: Freeze Product Boundary

- Name the feature `Comparison Window` or equivalent.
- Confirm it is a new view system, not a Split patch.
- Define supported first-version workflows and non-goals.
- Keep old Split until replacement criteria are met.

### Step 307.2: Audit Reusable Secondary Stack

Audit current modules:

- `ui/secondary-chart-controller.js`
- `chart/secondary-chart-manager.js`
- `data/secondary-chart-store.js`
- `pda/secondary-pda-renderer.js`
- `segment/secondary-segment-renderer.js`
- secondary context menu paths
- SMT guard and renderer dependencies
- secondary progressive replay and locate/flash paths

Output a reuse matrix: reuse as-is, wrap behind view context, or rewrite.

### Step 307.3: Define Comparison View Contract

Introduce a descriptor for comparison-capable views:

```js
{
  viewId,
  role,
  instrument,
  timeframe,
  range,
  layoutMode,
  sourceContext,
  syncMode,
  writable,
  visibleWindow
}
```

The important architectural change is moving code away from hard-coded `primary` / `secondary` assumptions toward a view context that can describe primary, old secondary, or new comparison windows.

### Step 307.4: Build MVP Shell

- Add a UI toggle for Comparison Window.
- Create one comparison chart view.
- Add sliding/floating window container, rail/handle, close action, and reset action.
- First version is read-only and does not replace Split.

### Step 307.1-307.4 Implementation Notes

Status: implemented on `feature/comparison-window-mvp`.

Product boundary:

- Feature name is `Comparison Window`.
- It is a new floating/sliding view system, not a patch on existing Split.
- MVP is read-only and limited to window lifecycle/positioning plus a view descriptor.
- Existing Split remains available and unchanged until later parity steps prove replacement readiness.

Reusable secondary stack audit:

| Area | Decision | Reason |
| --- | --- | --- |
| `ui/secondary-chart-controller.js` | Wrap later | Useful data loading, replay, hover-sync patterns, but currently assumes one Split secondary panel and `secondary-chart:*` events. |
| `chart/secondary-chart-manager.js` | Rewrite or generalize later | Hard-coded DOM ids and singleton chart state make it unsuitable as-is for arbitrary comparison views. |
| `data/secondary-chart-store.js` | Reference only | Captures secondary instrument/timeframe/layout shape, but state names and events are Split-specific. |
| `pda/secondary-pda-renderer.js` and `segment/secondary-segment-renderer.js` | Wrap behind view context later | Rendering logic is reusable once chart context, source instrument/timeframe, and coordinate projection are no longer hard-coded to secondary. |
| `pda/secondary-context-menu.js` | Rewrite behind view context later | Creation workflows need writable context and source metadata before they can safely run in Comparison Window. |
| SMT guard/render paths | Wrap later | Existing Main/Sub timing assumptions are valuable, but binding should become primary view / comparison view instead of Split-specific. |
| Progressive replay, locate, flash | Wrap later | Behavior should migrate, but first needs comparison data loading and chart context identity. |

Comparison view contract:

- Added `src/comparison/comparison-view-contract.js`.
- Added `src/comparison/comparison-window-store.js`.
- Current descriptor fields: `viewId`, `role`, `instrument`, `timeframe`, `range`, `layoutMode`, `sourceContext`, `syncMode`, `writable`, `visibleWindow`.

MVP shell:

- Added `src/ui/comparison-window-controller.js`.
- Added toolbar `Compare` toggle.
- Added floating window with drag handle, double-click reset, explicit reset, and close.
- The window is deliberately a non-data placeholder until Step 307.6 introduces sync and loading.

### Step 307.5: Sliding Interaction Semantics

- Dragging the outer window uses pointer capture.
- Dragging changes window position/crop.
- Dragging must not call chart resize as the primary effect.
- Internal chart zoom/scroll remains a chart interaction.
- Pointer coordinate mapping must be verified after window movement.

### Step 307.6: Time Sync And Data Loading

- Support same instrument / same timeframe.
- Support cross instrument, especially `NQ` vs `ES`.
- Support cross timeframe, especially primary `1M` vs comparison `1H` / `4H`.
- Sync by absolute time range.
- Respond to primary range load, Calendar locate, and Replay History restore.

### Step 307.7: Overlay Parity

- Render existing PDA, Segment, FVG, Chart Notes, Order Setup, Live Record, and Time Overlay objects where applicable.
- Filter or time-only-project cross-instrument objects so ES prices are not drawn on NQ price scale or vice versa.
- Start read-only before enabling creation.

### Step 307.8: Annotation Workflow Parity

- Enable comparison-view BSL/SSL creation.
- Enable comparison-view Segment creation.
- Enable comparison-view FVG creation.
- Preserve source metadata:
  - `sourceChartId`
  - `sourceInstrument`
  - `sourceTimeframe`
  - `sourceContext`
- Keep Review JSON and localStorage schema compatible.

### Step 307.9: SMT Migration

- Replace Split-bound SMT assumptions with primary view / comparison view assumptions.
- Keep current first supported pair: `Main=NQ`, comparison `ES`, same timeframe.
- Preserve unsupported-combination warnings.
- Support locate time, marker rendering, selection, Inspector detail, and link to active setup.

### Step 307.10: Replay And HTF Progressive Parity

- Sync replay cursor.
- Sync hover cursor.
- Preserve progressive higher-timeframe candle aggregation so future complete HTF candles are not displayed early.
- Preserve locate/flash behavior in comparison view.

### Step 307.11: Persistence And Workspace Restore

Persist UI workspace state:

- enabled/disabled;
- window position/size;
- comparison instrument/timeframe;
- sync mode;
- last loaded view range where needed.

Do not write transient window geometry into Review JSON. Replay History may store workspace state needed to restore the review view.

### Step 307.12: Browser Verification

Browser smoke must cover:

- comparison canvas nonblank;
- drag window without unintended chart resize;
- same-instrument and cross-instrument loading;
- cross-timeframe loading;
- overlay projection sanity;
- right-click creation for PDA/Segment/FVG after parity work;
- SMT locate and selection after SMT migration;
- replay progressive HTF behavior.

### Step 307.13: Split Replacement Review

After real use, compare:

- Split capabilities still not covered;
- Comparison Window capabilities that match or improve Split;
- migration risk;
- user workflow differences;
- smoke/manual verification status.

Only then should a later task remove old Split code.

### Step 307.14: Documentation And Closeout

Update:

- `v4/TODO.md`;
- session handoff;
- user guide;
- design docs if needed.

Document current limitations and the conditions for retiring Split.

## Non-Goals For First Implementation

- Do not remove old Split.
- Do not migrate SMT before the comparison view contract is stable.
- Do not add arbitrary multi-window management in the MVP.
- Do not change Review JSON schema just to save UI geometry.
- Do not mix ES price-space overlays into NQ price axes.

## Main Risks

- Lightweight Charts pointer coordinate mapping after sliding/cropping.
- Price axis and time axis behavior when a view is cropped.
- Duplicate primary/secondary assumptions scattered across renderers and actions.
- Replay progressive HTF logic currently tied to the secondary chart path.
- SMT guard and UI copy currently framed around Main/Sub rather than primary/comparison views.

## Acceptance Criteria For Full Replacement Candidate

- NQ primary + ES comparison works.
- 1M primary + 1H/4H comparison works.
- Comparison view can create PDA / Segment / FVG with correct source metadata.
- SMT works from primary/comparison context.
- Replay progressive HTF behavior matches current Split behavior.
- Calendar/object locate can flash both primary and comparison views.
- Browser smoke verifies nonblank canvas, sliding behavior, overlay sanity, and replay sanity.
- Real-use review confirms old Split has no remaining high-frequency exclusive workflow.
