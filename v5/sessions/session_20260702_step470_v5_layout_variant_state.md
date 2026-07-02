# Step 470 - V5 Layout Variant State

Date: 2026-07-02

Status: completed.

## Goal

Model explicit layout variants so each Layout icon has stable runtime state.

## Summary

- Added `LAYOUT_VARIANTS`.
- Added `variant` to layout state.
- Kept `mode` as the pane-count category.
- Made `layout.setMode` accept explicit variants and derive mode/pane count.
- Added `data-layout-variant-option` to Layout icon buttons.
- Exposed selected variant through route and Layout button metadata.
- Added runtime/browser smoke coverage for variant selection and invalid
  variants.

## Boundaries

- No secondary/tertiary real chart hosts yet.
- Route UI still dispatches layout commands only.
- Layout runtime owns mode, variant, pane list, active pane, and sync flags.
- Chart runtime, replay runtime, and bar-data runtime behavior is unchanged.

## Checks

- `node --check v5/src/contracts/layout-contracts.js`
- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-layout.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Candidate

Step 471 should make the pane shell visually render each variant with CSS/DOM
layout while keeping secondary/tertiary panes as placeholders.
