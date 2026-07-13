# Session - Step 410 Settings Canvas Direct Options

Date: 2026-07-13

## Completed

- closed Step 409 after the user passed its human visual matrix;
- upgraded Settings persistence to schema v2 with v1 migration;
- added validated Canvas background/grid/crosshair/scale/axis preferences;
- added a focused pure chart-options mapper;
- kept chart mutation behind Settings bridge -> Chart Surface -> Host Manager;
- exposed the fields in the transactional Canvas tab;
- proved draft isolation, atomic OK, v2 persistence, and hard reload recovery.

## Commits

- `9e6d4553 docs(v6): close settings durability acceptance`
- `107f9949 feat(v6): version canvas settings model`
- `5bf5ee5c feat(v6): apply direct canvas settings`
- final Step 410 browser/governance commit

## Verification

- `node v6/tests/settings-canvas-model-step410-smoke.js`
- `node v6/tests/canvas-settings-options-step410-smoke.js`
- `node v6/tests/settings-chart-surface-bridge-step409-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/settings-canvas-browser-step410-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/settings-persistence-browser-step409-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Run the five-item Step 410 human visual matrix. After it passes, implement
Step 411 Canvas View And Controls without bypassing Chart Viewport Intent.
