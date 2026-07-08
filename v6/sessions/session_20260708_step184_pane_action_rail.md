# V6 Session - Step 184 Pane Action Rail

Date: 2026-07-08

## Completed

Step 184 moved pane reset controls into a pane-local action rail.

Commit:

- `7cdfaffa feat(v6): move pane reset into action rail`

## Changes

- Added `chart-pane-action-rail` inside every chart host.
- Moved each pane's reset view button into its local action rail.
- Offset the action rail away from the right price-axis region.
- Added `pane-action-rail-browser-step184-smoke.js`.
- Added the new smoke to `chart-browser-regression-pack.js`.

## Verification

- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 185 should add maximize/restore pane state. The state model should preserve
the previous layout and pane geometry while a single pane is maximized, then
restore the original layout without resetting chart data, viewport, or replay.
