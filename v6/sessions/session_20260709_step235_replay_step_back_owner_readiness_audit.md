# V6 Session - 2026-07-09 - Step 235 Replay Step Back Owner Readiness Audit

## Scope

Step 235 documented the owner contract for backward replay before enabling the
reserved Previous replay bar transport button.

## Changes

- Added `v6/docs/V6_REPLAY_STEP_BACK_OWNER_READINESS_AUDIT_STEP235.md`.
- Added `v6/tests/replay-step-back-owner-readiness-step235-smoke.js`.
- Updated `v6/TODO.md` to mark Step 235 complete and select Step 236.

## Decision

Backward replay should not remove the latest visible bar directly. The future
implementation should first add a pure replay-domain/runtime previous command,
then let chart-entry orchestrate pane-local chart-data replacement from the new
cursor through existing owner boundaries.

## Verification

- `node v6/tests/replay-step-back-owner-readiness-step235-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Non-Goals

- Did not implement previous replay behavior.
- Did not enable the Previous button.
- Did not add replay, chart-entry, chart-data, viewport, bar-data, pane,
  indicator, trading, or journal runtime behavior.
