# Step 392 - V5 Minimal Chart Reset Overlay

## Goal

Simplify the upper-right chart overlay so it only provides reset/follow
behavior and no longer duplicates Lightweight Charts native wheel zoom and drag
pan interactions.

This step advances Historical Replay Review. It is a UI polish step, not a
replay runtime, bar-loading, chart-engine interaction, Layout, drawing, order,
or journal step.

## User Reference

The user identified the existing five-button upper-right overlay as too heavy
and visually amateur. Since Lightweight Charts already owns native wheel zoom,
pressed-mouse pan, and price-axis scaling, V5 should not show duplicate overlay
controls for zoom and scroll.

## Planned Steps

### Step 392.1 - Plan And Docs

- Add Step 392 to `v5/TODO.md`.
- Create this session handoff.
- Record that Layout split-pane planning is deferred.

Completed:

- Added Step 392 to `v5/TODO.md`.
- Created this session handoff.
- Recorded that Layout split-pane planning is deferred.

Status: complete.

### Step 392.2 - Route Simplification

- Remove overlay zoom out, zoom in, pan left, and pan right buttons.
- Keep only `data-chart-reset-view`.
- Preserve reset/follow wiring through `CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW`.

Completed:

- Removed overlay zoom out, zoom in, pan left, and pan right buttons.
- Kept only `data-chart-reset-view`.
- Preserved reset/follow wiring through `CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW`.

Status: complete.

### Step 392.3 - Visual Simplification

- Restyle the chart overlay as a light icon action.
- Remove the heavy visible toolbar box treatment.
- Keep the control inside the chart viewport with price-axis clearance.

Completed:

- Restyled the chart overlay as a single light circular icon action.
- Removed the heavy visible toolbar box treatment.
- Kept the control inside the chart viewport with price-axis clearance.

Status: complete.

### Step 392.4 - Verification

- Update browser smoke coverage for the one-button reset overlay.
- Keep overlay visibility, native interaction, responsive visual, and full V5
  smoke passing.

Completed:

- Updated `chart-navigation-toolbar-browser-smoke.js` for the one-button reset
  overlay.
- Kept overlay visibility, native interaction, responsive visual, workstation
  layout, and full V5 smoke passing.

Status: complete.

## Manual Acceptance

- The upper-right chart overlay no longer contains zoom or pan buttons.
- Reset/follow remains available through `data-chart-reset-view`.
- The reset control is visually light and does not sit inside a heavy visible
  box.
- Native Lightweight wheel zoom, drag pan, and price-axis scaling remain the
  interaction path for chart navigation.
- Reset still resumes viewport follow without mutating replay cursor, reveal
  state, or bar-data cache.

## Checks

- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 392 is complete.
- Layout split-pane planning should remain deferred to a dedicated step because
  it needs explicit multi-chart runtime ownership and sync rules.
