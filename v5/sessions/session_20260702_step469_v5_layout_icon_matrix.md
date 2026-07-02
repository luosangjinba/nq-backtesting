# Step 469 - V5 Layout Icon Matrix

Date: 2026-07-02

Status: completed.

## Goal

Replace the Layout popover's large text mode buttons with an FXReplay-style
icon matrix while preserving the existing layout runtime command boundary.

## Summary

- Replaced `Single`, `Twice`, and `Triple` text segment buttons with compact
  pane-layout icons.
- Grouped mode controls in rows labeled `1`, `2`, and `3`.
- Kept the existing `data-layout-mode-option` command surface so clicks still
  dispatch `layout.setMode`.
- Added browser smoke assertions for row labels and icon count.

## Boundaries

- No layout runtime state shape changes.
- No chart runtime, replay runtime, or bar-data runtime behavior changes.
- Orientation-specific icons currently map to the bounded `single`, `twice`, or
  `triple` modes until a future step models layout variants explicitly.

## Checks

- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Candidate

Step 470 should decide whether to make secondary/tertiary panes real chart
hosts or return to Settings polish.
