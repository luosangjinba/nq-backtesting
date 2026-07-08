# V6 Session - Step 164 Layout Variant Geometry

Date: 2026-07-08

## Completed

Step 164 made Page layout variants meaningful for chart pane geometry.

Commits:

- `846344d4 feat(v6): persist layout variants`
- `104c5cd3 feat(v6): apply layout variant geometry`

## Changes

- Added normalized layout variants to layout model/store/runtime state.
- Updated the Page layout menu to dispatch `{ mode, variant }` and reflect the
  selected variant.
- Added chart-surface variant normalization and per-pane `grid-area` assignment.
- Added CSS grid templates for two-pane vertical/horizontal, three columns,
  three rows, right stack, and left stack.
- Added browser coverage for all accepted layout variants.

## Verification

- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/layout-menu-control-smoke.js`
- `node v6/tests/layout-surface-bridge-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-variant-geometry-browser-step164-smoke.js`
- `node v6/tests/layout-menu-owner-binding-browser-step160-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `git diff --check`

## Notes

- Browser smoke verifies computed grid templates and per-host grid areas because
  the current default test entry can mount the chart surface at zero rect size
  before a full replay session is active.
- Draggable pane resizing remains intentionally out of Step 164.

## Next

Step 165 should add pane resize dragging through chart-surface-owned behavior
while preserving layout variant ownership and pane-local data/reset behavior.
