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

Completed:

- Extended `module-boundary-closeout-smoke.py` to protect:
  - replay controls dispatcher/renderer boundaries;
  - Order Setup chart action facade vs mutation action module;
  - Live Record chart action facade vs mutation action module.
- Confirmed the next FX Replay pass no longer has the highest-risk UI routing
  and chart mutation execution mixed into the same facade files.
- Remaining intentional debt:
  - `replay-controls.js` still owns the legacy replay state machine and is 496
    lines; do not split it further until the new FX Replay behavior shape is
    clear.
  - `order-setup-mutation-actions.js` and `live-record-mutation-actions.js`
    are large, but their blast radius is now isolated behind small facades.
  - `comparison-context-menu.js` remains a future split candidate, but it is not
    required before the next replay-data-loading pass.

Checks:

- `node v4/tests/replay-controller-boundary-smoke.js`
- `node v4/tests/replay-model-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/live-record-chart-actions-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`
- `python3 v4/tests/module-boundary-closeout-smoke.py`
- `python3 v4/scripts/smoke_all.py --suite local`
- `git diff --check`
