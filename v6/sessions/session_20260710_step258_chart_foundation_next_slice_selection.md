# V6 Session - Step 258 Chart Foundation Next Slice Selection

Date: 2026-07-10

## Context

This session resumed from the restart handoff after the manual-next session gap
fix. The worktree was clean, the branch was `v6/fx-replay-workstation`, and the
API health endpoint was available. The static web server on port 8002 was not
running during the initial handoff check.

## Decision

Step 258 selected Step 259 as **Manual Next Session Gap Regression Pack**.

The selected slice stays inside chart-foundation behavior and preserves the
latest fix where manual replay `Next` skips no-bar session breaks to the next
available source K-line. The next step should collect the existing direct and
browser gap gates into a compact regression pack and document the owner
boundaries.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and bounded cursor-time mutation.
- Chart-entry manual-next runtime owns the command orchestration and bounded
  next-source-bar search.
- Bar-data runtime owns source-window loading and cache behavior.
- Chart-data runtime owns pane-local append and display-timeframe projection
  records.
- Chart viewport owns visible-range intent after data changes.
- Chart surface owns rendered host state and browser-visible validation.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Notes

No runtime behavior, data loading, replay semantics, chart-data projection,
viewport logic, indicators, trading simulation, order tickets, prop firm rule
engines, or journal workflows changed in this selection step.
