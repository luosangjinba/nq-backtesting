# Step 493 - V5 Controller Cleanup Dispose

Date: 2026-07-03

Status: completed

## Goal

Fix the first high-priority lifecycle cleanup backlog from Step 492 by adding
explicit controller disposal for pane shell and replay controls.

## Plan

- [x] Update TODO/session handoff with the Step 493 plan.
- [x] Add `dispose()` to `createChartReplayPaneShellController`.
- [x] Add `dispose()` to `createChartReplayControlsController`.
- [x] Call controller disposers from chart route teardown.
- [x] Update lifecycle audit and static smoke to reflect fixed cleanup paths.
- [x] Run targeted lifecycle/replay checks and commit.

## Non-Goals

- No broad controller cleanup standardization in this step.
- No pane-local chart state release yet.
- No bar-data cache retention changes.

## Checks

- Passed: `node v5/tests/lifecycle-cleanup-static-smoke.js`
- Passed: `node v5/tests/replay-workstation-layout-browser-smoke.js`
- Passed: `node v5/tests/replay-controls-browser-smoke.js`
- Passed: `git diff --check`

Note: Node emitted the existing package `MODULE_TYPELESS_PACKAGE_JSON` warning
for ESM-style tests; the checks passed.
