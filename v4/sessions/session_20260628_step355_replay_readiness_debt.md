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

Planned:

- Move remaining mutation configuration/execution helpers out of
  `order-setup-chart-actions.js`.
- Keep the facade responsible for chart menu/action routing only.

## Step 355.3 - Split Live Record mutation execution

Planned:

- Move remaining mutation/link/create execution helpers out of
  `live-record-chart-actions.js`.
- Keep the facade responsible for chart menu/action routing only.

## Step 355.4 - Replay readiness audit

Planned:

- Re-run boundary, replay, comparison, and local smoke checks.
- Update TODO/session with remaining debt and defer reasons.
