# V5 Session Handoff - Step 417 Grid And Crosshair Style Settings

Date: 2026-07-01

## Status

Step 417 is complete.

## Goal

Make Chart Settings control real grid and crosshair presentation options while
preserving V5 runtime ownership boundaries.

## Changes

- Added `gridStyle` defaults to chart presentation contracts with
  vertical/horizontal visibility and colors.
- Added `crosshairStyle` defaults with vertical/horizontal visibility, line
  colors, and label background color.
- Extended chart presentation runtime normalization so grid/crosshair colors are
  validated as `#rrggbb` values and merged with existing settings state.
- Added Settings controls:
  - `Canvas`: vertical/horizontal grid visibility and colors;
  - `Scales and lines`: vertical/horizontal crosshair visibility, line colors,
    and label background color.
- Kept Settings draft semantics: style inputs update route-local draft state
  until `Ok`; cancel/close still discards edits.
- Carried grid/crosshair style through chart runtime display context.
- Applied grid/crosshair style in the chart-engine adapter:
  - Lightweight chart options receive grid/crosshair options on mount and
    presentation updates;
  - DOM fallback records style metadata for smoke coverage and fallback
    inspection.
- Updated runtime, adapter, browser, and display-context smokes.

## Invariants

- UI dispatches presentation/display-context commands and does not call chart
  engine APIs directly.
- Chart runtime remains the only writer of chart series and chart presentation.
- Presentation changes do not mutate replay cursor, reveal state, display bars,
  bar-data cache, or loaded windows.
- Bar data runtime remains the only requester/cache owner for bars.
- Replay runtime remains the only owner of replay cursor and reveal state.
- The chart route still exposes one active pane: `primary`.

## Verification

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Candidates

- Continue setup route visual cleanup before layout split panes.
- Tighten chart header/chrome alignment against FXReplay references.
- Keep split-pane layout deferred until single-pane chart infrastructure is
  stable and visually acceptable.
