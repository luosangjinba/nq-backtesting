# Step 462 - V5 Layout Modes And Sync Toggles Contract

Status: completed.

Date: 2026-07-02

## Goal

Update layout state to match the intended lightweight multi-pane design:
`single`, `twice`, `triple`, plus five root-level sync toggles.

## Plan

1. Replace the internal `two-pane` mode with `twice` and add `triple`.
2. Add root layout sync toggles for Symbol, Interval, Crosshair, Time, and Date
   range.
3. Validate pane counts for each supported mode.
4. Update layout runtime smoke coverage.
5. Update layout docs, TODO, and session handoff.

## Implementation

- Updated `src/contracts/layout-contracts.js` with `single`, `twice`, and
  `triple` modes.
- Added root layout sync defaults:
  `symbol`, `interval`, `crosshair`, `time`, and `dateRange`.
- Updated `src/runtime/layout-runtime.js` validation so mode and pane count
  match exactly.
- Updated `tests/layout-runtime-smoke.js` to cover sync defaults, `twice`, and
  `triple`.
- Updated the split-pane contract documentation.

## Boundary Notes

- No Layout popover UI is added.
- Chart route still renders one pane and keeps Layout disabled/deferred.
- Sync toggles are modeled as layout state only.
- `symbol` sync remains a future disabled UI control while replay sessions are
  single-instrument.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 463 can add the Layout popover UI for Single / Twice / Triple and the five
sync switches, dispatching only layout commands and keeping chart rendering
single-pane until chart host mounting is planned.
