# Step 395 - V5 Chart Settings Surface

Date: 2026-06-30

## Goal

Move low-frequency chart display preferences out of the top-level workstation
toolbar and into a dedicated chart settings surface.

## Scope

This step advances Historical Replay Review by reducing toolbar noise after
Step 394 compacted replay transport controls.

In scope:

- top-level Settings entry;
- settings dialog with Time, Status line, and Canvas sections;
- moving display timezone and chart presentation controls into the dialog;
- preserving existing display timezone and chart presentation command wiring;
- browser smoke coverage for the new settings entry and existing preference
  effects.

Out of scope:

- replay runtime ownership changes;
- bar-data loading changes;
- chart-engine interaction changes;
- Layout split panes;
- drawing tools;
- order or journal workflows;
- final Setup route visual polish.

## Plan

- [x] Remove low-frequency display preference rows from the top workstation
  toolbar.
- [x] Add `data-chart-settings-open` and `data-chart-settings-popover`.
- [x] Group existing controls under Time, Status line, and Canvas.
- [x] Keep existing selectors and commands for timezone and presentation
  settings.
- [x] Update browser smokes to open settings before toggling preferences.
- [x] Run targeted settings/layout smokes, full V5 smoke, and `git diff
  --check`.

## Implementation Notes

- `v5/src/features/chart-replay/chart-replay-route.js` now renders
  low-frequency display controls inside a settings dialog rather than the
  top-level toolbar.
- The existing `data-display-timezone`, `data-presentation-time-format`,
  `data-presentation-toggle`, `data-presentation-margin`, and
  `data-presentation-right-offset` selectors are preserved so command wiring
  remains unchanged.
- `v5/src/styles/app.css` adds a compact modal layout and responsive fallback
  for narrow viewports.
- Browser smokes now verify that the top toolbar no longer contains display
  preference controls and that settings changes do not request bars or mutate
  replay state.

## Manual Acceptance

- The chart route top toolbar is materially quieter.
- Settings opens a chart settings dialog with Time, Status line, and Canvas
  sections.
- Timezone, time format, status rows, compact margins, right offset, and
  crosshair readout toggles still work.
- Display preference changes do not advance replay, request bars, or bypass
  runtime ownership.

## Checks

- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
