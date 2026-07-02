# Step 471 - V5 Variant Pane Shell Layout

Date: 2026-07-02

Status: completed.

## Goal

Make the pane shell visually render supported layout variants while keeping
secondary and tertiary panes as placeholders.

## Summary

- Added `data-layout-variant` to the pane shell.
- Added CSS grid layouts for supported variants.
- Kept stable pane ids and active-pane selection.
- Verified `twice.horizontal` stacked geometry.
- Verified `triple.left` large-left geometry.
- Kept chart host count at one.

## Boundaries

- No secondary/tertiary real chart hosts yet.
- Placeholder panes remain selectable but contain no `data-chart-host`.
- Route UI does not create chart adapters, write chart series, or request bars.
- Chart runtime, replay runtime, and bar-data runtime ownership is unchanged.

## Checks

- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Candidate

Step 472 should mount real secondary/tertiary chart hosts through chart runtime
and preserve replay/bar-data ownership boundaries.
