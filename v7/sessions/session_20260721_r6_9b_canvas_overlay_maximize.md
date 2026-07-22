# Session — R6.9b Canvas Overlay And Pane Maximize

Date: 2026-07-21
Status: awaiting human interaction and visual review

## Delivered

- moved short symbol, compact timeframe, OHLC, and close change value/percentage
  into a transparent Canvas overlay;
- removed the dedicated Pane information row and global Reset View button;
- made Reset View a hover/focus-revealed Pane-local icon;
- added hover/focus-revealed Maximize/Restore for multi-Pane layouts only;
- retained every chart host while maximized and restored exact accepted split
  geometry without persisting a transient display mode;
- changed chart surfaces to neutral black, brightened axis/readout text, and
  strengthened the active blue boundary;
- deliberately omitted market-open status pending a reliable reviewed market-
  state contract.

## Ownership

Replay Workspace UI owns the overlay DOM and transient maximized Pane id.
Lightweight Chart Adapter remains the only chart-series writer and supplies
accepted read-only crosshair observations. Viewport Runtime remains the only
owner changed by a Pane-local Reset. Pane Layout, Replay, Bar Data, Session,
and Workspace Transaction owners are unchanged.

## Evidence

- `tests/lightweight-chart-adapter-browser-harness.js` binds prior-close change
  calculations and selected/latest behavior;
- `tests/replay-layout-workspace-browser-harness.js` binds integrated Canvas
  geometry, compact timeframe labels, hover controls, Pane-local Reset,
  transient maximize/restore, mounted chart preservation, restored geometry,
  and unchanged Replay/Workspace revisions;
- `tests/fixtures/replay-workspace/negative/pane-overlay-cases.json` records the
  rejected single-Pane maximize, persistent layout mutation, and global Reset
  alternatives;
- fixed browser fixtures include the maximized Pane presentation.
- all 39 non-browser and six real-Chrome Harnesses pass; the retained
  performance gate records 100 cache-hit Next samples at p95 `83.8ms`, p99
  `96.8ms`, max `102.8ms`, and rapid-history work without an input freeze;
- `git diff --check` passes.

## Review Boundary

This correction changes interaction and visuals, so the combined
R6.9/R6.9a/R6.9b gate stops for explicit human acceptance before R6.10.
