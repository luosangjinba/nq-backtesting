# Step 425 - V5 Chart Replay Route Boundary Split

Date: 2026-07-02

Status: completed.

## Trigger

User wanted a slightly larger modularization pass so future V5 features do not
continue mixing template markup, UI-only interaction, and runtime orchestration
inside one route file.

## Plan

- Step 425.1: Keep this as a no-behavior-change split.
- Step 425.2: Move static chart route markup into a template module.
- Step 425.3: Move floating replay transport markup and drag behavior into a
  dedicated route-local controller.
- Step 425.4: Keep replay/chart command dispatch, runtime event subscriptions,
  status refresh, and display-context synchronization in the route shell.
- Step 425.5: Verify the DOM selectors used by existing browser smokes remain
  stable.

## Implementation

- Added `v5/src/features/chart-replay/chart-replay-template.js`.
- Added `v5/src/features/chart-replay/replay-floating-controls.js`.
- `chart-replay-template.js` composes the route shell markup with the existing
  Settings template and the new floating replay controls template.
- `replay-floating-controls.js` owns only DOM-local floating transport drag and
  viewport clamping.
- `chart-replay-route.js` now renders the template, initializes the settings
  controller and floating-controls controller, and keeps runtime command/event
  orchestration.
- Reduced `chart-replay-route.js` from 1082 lines after Step 424 to 860 lines.

## Guardrails

- Template modules do not own replay/chart state.
- Floating replay controls do not dispatch replay commands.
- The route remains the command/event boundary for replay, chart,
  presentation, and timezone runtimes.
- Existing `data-*` selectors remain stable for browser smoke tests.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node --check v5/src/features/chart-replay/replay-floating-controls.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
