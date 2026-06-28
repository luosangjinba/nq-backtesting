# Step 355 - FX Replay Readiness Debt

Goal: clear only the module debt that directly raises risk for the next FX
Replay implementation pass.

## Scope

- Split `src/ui/replay-controls.js` enough that UI rendering and control
  routing are not embedded in the replay state machine.
- Split remaining mutation execution orchestration from Order Setup and Live
  Record chart action facades.
- Close with a readiness audit before returning to FX Replay behavior.

## Step 355.1 - Split replay controls

Completed:

- Added `src/features/replay/replay-toolbar-renderer.js` for toolbar view
  composition and input binding.
- Added `src/features/replay/replay-control-dispatcher.js` for click action
  dispatch and replay history routing.
- Reduced `src/ui/replay-controls.js` from 545 to 496 lines and removed direct
  dependencies on replay history controller, toolbar sync, and replay view.
- Updated `replay-controller-boundary-smoke.js` to guard the new dispatcher and
  renderer seams.

Checks:

- `node v4/tests/replay-controller-boundary-smoke.js`
- `node v4/tests/replay-model-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 355.2 - Split Order Setup mutation execution

Completed:

- Added `src/order/order-setup-mutation-actions.js` for creation, patch, link,
  and manual event mutation execution.
- Reduced `src/order/order-setup-chart-actions.js` from 567 to 11 lines.
- The facade now only composes hit-action routing and mutation-action routing.

Checks:

- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/context-menu-position-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 355.3 - Split Live Record mutation execution

Completed:

- Added `src/live-record/live-record-mutation-actions.js` for status, target,
  link, patch, and create mutation execution.
- Reduced `src/live-record/live-record-chart-actions.js` from 504 to 16 lines.
- The facade now only composes hit-action routing and mutation-action routing
  while re-exporting `LIVE_RECORD_CHART_ACTIONS`.

Checks:

- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`

## Step 355.4 - Replay readiness audit

Planned:

- Re-run boundary, replay, comparison, and local smoke checks.
- Update TODO/session with remaining debt and defer reasons.
