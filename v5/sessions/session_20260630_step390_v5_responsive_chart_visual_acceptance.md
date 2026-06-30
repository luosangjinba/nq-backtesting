# Step 390 - V5 Responsive Chart Visual Acceptance

## Goal

Add screenshot-level responsive acceptance for the V5 replay workstation chart
across desktop, laptop, low-height, narrow, and high-DPI viewport conditions.

This step advances Historical Replay Review. It is a browser harness and layout
verification step, not a replay cursor, bar-loading, order, journal, or new
chart-feature step.

## Planned Steps

### Step 390.1 - Plan And Docs

- Add Step 390 to `v5/TODO.md`.
- Create this session handoff.
- Keep Phase 3 scope explicit.

Completed:

- Added Step 390 to `v5/TODO.md`.
- Created this session handoff.
- Kept Phase 3 scope explicit.

Status: complete.

### Step 390.2 - Responsive Visual Harness

- Add a browser smoke that loads the real Lightweight chart across multiple
  viewport and device-scale scenarios.
- Capture a browser screenshot for each scenario as a screenshot-level smoke
  signal.
- Assert chart dimensions, horizontal overflow, toolbar containment, price-axis
  clearance, footer/status placement, and visible rendered bars.

Completed:

- Added `chart-responsive-visual-browser-smoke.js`.
- Covered desktop, laptop, low-height, narrow, and high-DPI/device-scale
  scenarios.
- Captured a non-empty browser screenshot for each scenario.
- Asserted no horizontal document overflow, non-collapsed chart/canvas/engine
  dimensions, visible chart area, real rendered bars, toolbar containment,
  price-axis clearance, footer placement, and status visibility.

Status: complete.

### Step 390.3 - Smoke Integration

- Add the new smoke to `v5/scripts/smoke_all.js`.
- Run targeted chart/layout smokes.
- Run full V5 smoke and `git diff --check`.

Completed:

- Added the new smoke to `v5/scripts/smoke_all.js`.
- Ran targeted chart/layout smokes.
- Ran full V5 smoke and `git diff --check`.

Status: complete.

## Manual Acceptance

- The chart remains the dominant visible replay surface across common desktop
  and laptop viewport sizes.
- Low-height and narrow viewport scenarios do not collapse the chart or create
  horizontal document overflow.
- Chart zoom/pan/reset overlay remains inside the chart viewport and clear of
  the right price-axis area.
- Footer/status information remains below the chart instead of overlaying it.
- The harness captures a non-empty browser screenshot for each scenario and
  confirms the chart rendered real bars through the chart runtime.
- Replay cursor, reveal state, native Lightweight interactions, and bar-data
  ownership remain unchanged.

## Checks

- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 390 is complete.
- No runtime ownership or chart interaction semantics changed.
- Recommended next step: continue Phase 3 by either addressing any remaining
  manual chart readability issue found during use, or prepare a Phase 3 closeout
  checklist if chart navigation feels stable enough.
