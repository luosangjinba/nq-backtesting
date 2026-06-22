# Step 310: Pick-preview Routing Implementation Plan

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Step 309 completed locate routing through `chart/viewport-router.js`.

Step 308.3 planned the next Split-only migration: pick-preview routing. Current pick code is duplicated in:

- `ui/inspector/order-review-edit-actions.js`
- `ui/inspector/segment-actions.js`

Both files branch on primary versus `secondary-chart`, directly call chart managers, and do not support Comparison Window as a pick target.

## Goals

- Add a shared pick context router for primary, secondary, and comparison chart targets.
- Preserve current primary/secondary pick behavior.
- Let Comparison Window participate in supported pick workflows when it is enabled and loaded.
- Keep workflow state ownership inside each controller; the router only supplies chart targeting, coordinate/time lookup, bars, timeframe, and preview cursor operations.
- Do not auto-open Comparison Window for pick mode.

## Non-goals

- Do not remove old Split.
- Do not migrate existing-object hit-test link in this step.
- Do not migrate advanced PDA workflows in this step.
- Do not change replay pick behavior.

## Step 310.1: Add Pick-context Router

Status: Completed in implementation.

Commit:
- Pending in current Step 310 execution.

Implemented:
- Added `chart/pick-context-router.js` with injectable definitions and default primary/secondary pick contexts.
- Added target constants, event/currentTarget routing, bar lookup, projected chart time, preview cursor show/hide, and cursor cleanup helpers.
- Added `pick-context-router-smoke` for primary/secondary parity.

Add `chart/pick-context-router.js`.

Contract:

- `getPickContext(chartIdOrEvent)`
- `getPickContextById(chartId)`
- `getPickContextFromCrosshairSource(source)`
- `clearOtherPickPreviewCursors(activeChartId)`
- `clearAllPickPreviewCursors()`
- `findBarByChartTime(context, chartTime)`

Context shape:

```js
{
  chartId,
  chartEl,
  label,
  timeframe,
  getDisplayBars,
  coordinateToTime,
  getBarChartTime,
  showPreviewCursor,
  hidePreviewCursor,
  isEnabled
}
```

First implementation should preserve primary/secondary parity and include comparison only when the manager APIs exist.

## Step 310.2: Add Comparison Pick Preview Cursor API

Status: Completed in implementation.

Commit:
- Pending in current Step 310 execution.

Implemented:
- Added dedicated comparison pick preview cursor state and show/hide/has APIs in `comparison-chart-manager.js`.
- Pick preview hides comparison sync crosshair cursor, and sync cursor does not render while pick preview is active.
- Wired the default pick context router to comparison store/chart manager.
- Added disabled/no-chart comparison pick preview smoke.

Update `chart/comparison-chart-manager.js`.

Add:

- `showComparisonPickPreviewCursor(time)`
- `hideComparisonPickPreviewCursor()`
- `hasComparisonPickPreviewCursor()`

The pick preview cursor must be separate from:

- replay cursor;
- sync crosshair cursor.

## Step 310.3: Migrate Order Setup Exit Pick

Status: Completed in implementation.

Commit:
- Pending in current Step 310 execution.

Implemented:
- Replaced local primary/secondary pick context logic in `order-review-edit-actions.js` with `pick-context-router`.
- Exit pick cancel/completion now clears all preview cursors through the router.
- Exit pick hover clears preview cursors on other charts through the router.
- Added comparison crosshair and click binding in `inspector-sidebar.js`; comparison DOM click binding is lazy because the window shell may be created after inspector init.

Update `ui/inspector/order-review-edit-actions.js`.

Replace local `getPickChartContext(e)` with router calls.

Rules:

- cancel clears all pick preview cursors;
- hover in one chart clears other chart cursors;
- click picks the nearest loaded bar timestamp from the active context;
- comparison click is accepted only when the comparison context is enabled and loaded.

## Step 310.4: Migrate Segment Actor Pick Preview

Status: Completed in implementation.

Commit:
- Pending in current Step 310 execution.

Implemented:
- Replaced local primary/secondary pick context logic in `segment-actions.js` with `pick-context-router`.
- Actor pick cancel/completion now clears all preview cursors through the router.
- Actor pick hover clears preview cursors on other charts through the router.
- Reused the Inspector comparison crosshair/click binding for Segment actor pick.

Update `ui/inspector/segment-actions.js`.

Rules match Step 310.3:

- use router for primary/secondary/comparison;
- preserve existing actor timestamp/timeframe patch behavior;
- clear all preview cursors on cancel and completion.

## Step 310.5: Browser And Focused Verification

Run focused checks:

- router primary/secondary/comparison context smoke;
- Order Setup edit action syntax/smoke if available;
- Segment action syntax/smoke if available.

Run browser checks:

- existing `comparison-window-browser-smoke`;
- add or extend a comparison pick smoke if low-risk.

## Step 310.6: Closeout

Update:

- `v4/TODO.md`;
- this session file.

Record:

- commits;
- verification;
- remaining limitations.
