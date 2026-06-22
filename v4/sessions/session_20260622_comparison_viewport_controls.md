# Session: Comparison Viewport Controls

Date: 2026-06-22

## Issue

When Comparison Window was open:

- Main chart zoom/reset/scroll controls stayed centered in the full primary chart area, not the visible Main area to the right of the sliding Comparison overlay.
- Comparison Window did not expose its own zoom/reset/scroll controls.

## Root Cause

- `#viewport-controls` used a fixed `left: 50%`, so it ignored the sliding Comparison boundary.
- `comparison-viewport-controller.js` already had viewport operations, but no DOM controls were rendered for the Comparison chart.
- The Comparison chart canvas is full-width under a clipped shell, so its controls need a visible-window center separate from the canvas center.

## Changes

- Added `#comparison-viewport-controls` inside the Comparison chart canvas.
- Extended `ui/viewport-controls.js`:
  - renders primary controls as before;
  - renders Comparison controls with `comparison-viewport-controller` actions;
  - dynamically binds Comparison controls because Comparison DOM is initialized after primary viewport controls.
- Added layout variables from `comparison-window-controller.js`:
  - `--primary-viewport-center-left` centers Main controls in the visible Main area;
  - `--comparison-viewport-center-left` centers Comparison controls in the visible Comparison window.
- Updated click-ignore guards to include `#comparison-viewport-controls`.

## Verification

Ran:

```bash
node --check v4/src/ui/viewport-controls.js
node --check v4/src/ui/comparison-window-controller.js
node --check v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result:

- Browser smoke passed.
- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.
