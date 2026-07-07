# V6 Chart Control Bridge Browser Regression Audit

Date: 2026-07-07

## Decision

The current workstation browser regression coverage matches the chart control
bridge owner contract.

No browser-level contract mismatch was found:

- `workstation-native-manual-wall-input-browser-smoke.js` verifies the mounted
  `manual-wall-input-bridge` converts native chart visible-range input into a
  manual viewport intent and keeps that manual intent across the next replay
  step.
- `chart-reset-view-browser-smoke.js` verifies the mounted
  `reset-view-control-bridge` converts the reset-view button into a default
  viewport reset without changing chart bar count or replay state.
- The browser coverage exercises the real workstation chart surface and the
  real `main`/`default` pane command paths instead of directly calling the
  bridge helpers.
- The coverage stays aligned with `chart-control-bridge-contract.js`: browser
  controls may dispatch viewport commands but must not fetch bars, write chart
  series directly, advance replay, load sessions, or own dashboard row actions.

## Boundary Notes

- No runtime behavior changed.
- The native manual wall browser test remains the guard for user chart
  drag/zoom input reaching viewport manual intent through the chart surface.
- The reset-view browser test remains the guard for user reset control reaching
  viewport reset through the chart surface.
- Dashboard row action visibility remains Summary, Stats, and Copy.

## Step 106 Direction

Step 106 should re-audit dashboard row-action isolation after the chart control
bridge browser regression checks.

Scope:

- verify Summary, Stats, and Copy remain the only visible dashboard row actions;
- verify disabled Order, Journal, and Calendar actions remain contract-ready but
  not visible;
- keep chart control bridge behavior unchanged unless the audit exposes a
  cross-module ownership mismatch.

Acceptance:

- chart control bridge browser regression audit smoke passes;
- recent session row action contract/boundary smokes pass;
- chart control bridge contract and integration smokes pass;
- selected workstation browser smokes still pass on pane `main`.

## Verification

- `node v6/tests/chart-control-bridge-browser-regression-audit-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
