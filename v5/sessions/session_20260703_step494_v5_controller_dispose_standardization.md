# Step 494 - V5 Controller Dispose Standardization

Date: 2026-07-03

Status: completed

## Goal

Standardize chart route controller cleanup after Step 493 by giving remaining
route controllers a `dispose()` shape and routing teardown through one disposer
stack.

## Plan

- [x] Update TODO/session handoff with the Step 494 plan.
- [x] Add tracked listener cleanup and `dispose()` to remaining chart route
      controllers.
- [x] Add `dispose()` to Settings bindings and Settings panel.
- [x] Drain chart route controller disposers from route teardown.
- [x] Update lifecycle audit/static smoke for the standardized shape.
- [x] Run targeted lifecycle/chart route checks and commit.

## Non-Goals

- No pane-local chart state release in this step.
- No bar-data cache retention change in this step.
- No broad UI behavior changes.

## Checks

- Passed: `node v5/tests/lifecycle-cleanup-static-smoke.js`
- Passed: `node v5/tests/replay-workstation-layout-browser-smoke.js`
- Passed: `node v5/tests/replay-controls-browser-smoke.js`
- Passed: `node v5/tests/chart-presentation-browser-smoke.js`
- Passed: `git diff --check`

Note: Node emitted the existing package `MODULE_TYPELESS_PACKAGE_JSON` warning
for ESM-style tests; the checks passed.
