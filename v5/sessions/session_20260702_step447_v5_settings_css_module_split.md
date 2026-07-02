# Step 447 - V5 Settings CSS Module Split

Status: completed.

Date: 2026-07-02

## Goal

Begin CSS modularization by moving a complete feature surface out of the large
`app.css` file while keeping a stable stylesheet entrypoint.

## Plan

1. Audit `src/styles/app.css` and identify section boundaries.
2. Move the Settings modal surface into a focused CSS module.
3. Keep `src/styles/app.css` as the single stylesheet entrypoint loaded by
   `index.html`.
4. Update TODO/session handoff documentation.
5. Run Settings-focused browser smokes, responsive smoke, full smoke suite, and
   `git diff --check`.

## Implementation

- Added `src/styles/chart-settings.css`.
- Moved Settings popover, modal panel, tabs, rows, controls, footer, and mobile
  layout rules from `src/styles/app.css` into the new file.
- Added a top-level `@import "./chart-settings.css";` to `src/styles/app.css`.
- Kept `index.html` loading only `src/styles/app.css`.
- Reduced `app.css` from 1132 lines to 885 lines.

## Boundary Notes

- `app.css` remains the CSS entrypoint.
- Feature CSS modules should map to complete route/feature surfaces.
- Future CSS splits should avoid moving scattered selectors without a clear
  surface owner.
- This step changes stylesheet organization only; Settings JavaScript behavior
  and runtime ownership are unchanged.

## Verification

- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 448 can continue CSS modularization with another complete route surface
such as replay transport or chart navigation, or pause CSS splitting if a
stronger product/runtime boundary becomes more urgent.
