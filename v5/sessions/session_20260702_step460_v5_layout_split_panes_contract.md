# Step 460 - V5 Layout Split Panes Contract

Status: completed.

Date: 2026-07-02

## Goal

Define split-pane ownership, active-pane Settings scope, and sync rules before
implementing any multi-pane UI.

## Plan

1. Add a stable split-pane contract spec.
2. Update architecture and execution docs with layout runtime ownership.
3. Update chart interaction and presentation Settings specs with active-pane
   scope.
4. Update Settings backlog, docs index, specs index, roadmap, TODO, and session
   handoff.
5. Run documentation/boundary checks.

## Contract Summary

- Current single pane remains `primary`.
- First implementation should introduce layout state that can represent one or
  two panes; arbitrary grid layouts remain out of scope.
- Layout runtime owns pane list, active pane id, and sync flags.
- Chart runtime owns chart host lifecycle, chart series writes, visible ranges,
  and viewport/follow state per pane.
- Replay runtime owns the shared replay cursor, reveal state, session bounds,
  and no-future invariant.
- Bar data runtime remains the only owner of bar requests and cache windows.
- Presentation runtime owns normalized chart presentation settings.
- Settings open against the active pane and apply to that pane by default; any
  shared/global scope must be explicitly modeled.
- Viewport, crosshair, and timeframe sync default off unless explicitly enabled
  by future layout commands.

## Updated Docs

- `docs/specs/layout-split-panes-contract.md`
- `docs/MVP_ARCHITECTURE.md`
- `docs/EXECUTION_FRAMEWORK.md`
- `docs/V5_PHASE_ROADMAP.md`
- `docs/SETTINGS_BACKLOG_MATRIX.md`
- `docs/specs/chart-interaction-contracts.md`
- `docs/specs/chart-presentation-settings.md`
- `docs/specs/README.md`
- `docs/INDEX.md`
- `TODO.md`
- `sessions/README.md`

## Verification

- `node v5/tests/boundary-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 461 can either add the smallest layout state skeleton that preserves this
contract, or resume Settings only within the active-pane scope defined here.
