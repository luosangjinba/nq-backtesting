# Step 358 - V5 App Shell Skeleton

## Goal

Create the V5 frontend shell without business features.

Step 358 intentionally does not implement chart, bars, sessions, replay cursor,
or FX Replay loading behavior.

## Completed

### Step 358.1 - Static Entry

- Added `v5/index.html`.
- Added `v5/src/app.js`.
- Added `v5/src/styles/app.css`.
- The page boots with a V5 root and shell styling only.

Commit: `b6d8cb2 Add V5 static app entry`

### Step 358.2 - Command And Event Buses

- Added `v5/src/runtime/commands.js`.
- Added `v5/src/runtime/events.js`.
- Command bus supports register/dispatch/list/unregister.
- Event bus supports subscribe/emit/unsubscribe.

Commit: `3c0882e Add V5 command and event buses`

### Step 358.3 - Module Registry

- Added `v5/src/runtime/module-registry.js`.
- Modules register before startup.
- Startup runs in registration order.
- Shutdown runs in reverse order.
- Registering after startup is forbidden.

Commit: `f1de294 Add V5 module registry lifecycle`

### Step 358.4 - Route Shell

- Added `v5/src/runtime/router.js`.
- Added setup route shell:
  - `v5/src/features/session-setup/session-setup-route.js`
- Added chart route shell:
  - `v5/src/features/chart-replay/chart-replay-route.js`
- Added top route tabs and route outlet.
- Setup/chart routes are placeholders only.

Commit: `210bd75 Add V5 setup and chart route shell`

### Step 358.5 - Smoke And Boundary Harness

- Added runtime smoke:
  - `v5/tests/runtime-smoke.js`
- Added architecture boundary smoke:
  - `v5/tests/boundary-smoke.js`
- Added browser shell smoke:
  - `v5/tests/app-shell-browser-smoke.js`
- Added smoke runner:
  - `v5/scripts/smoke_all.js`

## Checks

- `node v5/tests/runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- V5 opens as a standalone shell at `v5/index.html`.
- Setup and Chart routes switch in the browser.
- No chart runtime exists yet.
- No bars runtime exists yet.
- No replay runtime exists yet.
- Boundary smoke exists before business feature implementation.

## Next Step

Step 359 should add the default-user multi-user baseline and replay session
model.

Do not add chart, bars, or replay behavior in Step 359 unless it is required for
session persistence tests.

