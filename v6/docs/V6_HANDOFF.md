# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 115 completed.
- Next planned step: Step 116 - Journal Row Action Visibility Wiring.
- Worktree expectation at handoff: clean.

The latest completed work is Journal Row Action Exposure Gate Audit:

- `V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md` documents that Journal is ready
  for a deliberate exposure implementation step, but remains hidden in the
  audit.
- `journal-row-action-exposure-gate-audit-smoke.js` guards owner readiness,
  hidden row-action boundaries, and the absence of dashboard Journal click
  wiring.
- Summary, Stats, and Copy browser regressions still pass.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step103_chart_control_bridge_owner_contract.md`
5. `v6/sessions/session_20260707_step104_chart_control_bridge_integration_audit.md`
6. `v6/sessions/session_20260707_step105_chart_control_bridge_browser_regression_audit.md`
7. `v6/sessions/session_20260707_step106_dashboard_row_action_isolation_reaudit.md`
8. `v6/sessions/session_20260707_step107_dashboard_visible_row_action_browser_coverage_audit.md`
9. `v6/sessions/session_20260707_step108_dashboard_session_browser_regression_pack_audit.md`
10. `v6/sessions/session_20260707_step109_next_dashboard_row_action_exposure_readiness_audit.md`
11. `v6/sessions/session_20260707_step110_journal_row_action_owner_surface_readiness_audit.md`
12. `v6/sessions/session_20260707_step111_journal_row_action_session_context_contract.md`
13. `v6/sessions/session_20260707_step112_hidden_journal_row_action_harness.md`
14. `v6/sessions/session_20260707_step113_hidden_journal_row_action_browser_harness.md`
15. `v6/sessions/session_20260707_step114_journal_surface_ready_flag_audit.md`
16. `v6/sessions/session_20260707_step115_journal_row_action_exposure_gate_audit.md`
17. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
18. `v6/docs/V6_NEXT_DASHBOARD_ROW_ACTION_EXPOSURE_READINESS_AUDIT.md`
19. `v6/docs/V6_JOURNAL_ROW_ACTION_OWNER_SURFACE_READINESS_AUDIT.md`
20. `v6/docs/V6_JOURNAL_ROW_ACTION_SESSION_CONTEXT_CONTRACT.md`
21. `v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_HARNESS.md`
22. `v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_BROWSER_HARNESS.md`
23. `v6/docs/V6_JOURNAL_SURFACE_READY_FLAG_AUDIT.md`
24. `v6/docs/V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md`

## Next Step

Step 116 should wire the Journal dashboard row action visibly.

Keep Step 116 bounded:

- update `journal-contract.js` and `session-row-action-boundaries.js` together;
- add visible browser coverage for `data-v6-row-action="journal"` in the same
  step;
- prove Summary, Stats, and Copy remain unchanged;
- preserve the Journal command/persistence-only dispatch boundary;
- keep Journal isolated from chart, bars, replay, viewport, orders, calendar,
  and session-dashboard runtime control paths;
- do not modify runtime behavior unless the audit exposes a mismatch;
- keep dashboard row action visibility unchanged.

Expected implementation shape:

- add or update focused Journal visible row-action wiring documentation/smoke if
  needed;
- keep `journal-contract.js`, row-action boundaries, and browser smokes as the
  source of truth;
- run selected Journal contract and row-action boundary smokes.

## Critical Boundaries

V6 exists because V5 replay viewport/manual-anchor behavior became structurally
unreliable. Do not patch V5 replay behavior as a substitute for V6 work.

Preserve these V6 rules:

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay cursor and reveal state.
- Creating a replay session must not load a full date range into chart state.
- Dashboard/session metadata work must not become a hidden cross-module control
  path into chart, bars, replay, viewport, orders, journal, or calendar.

For the current Recent Sessions row actions:

- Summary: enabled, read-only metadata-only, owner `session-summary`.
- Stats: enabled, read-only metadata/unavailable metrics, owner
  `session-analytics`.
- Copy: enabled, metadata-only, owner `session-repository`.
- Order: disabled/contract-ready, owner `orders-runtime`.
- Journal: disabled/contract-ready, owner `journal-runtime`.
- Calendar: disabled/contract-ready, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 116 work:

- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/chart-control-bridge-browser-regression-audit-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`

For Summary/Stats/Copy regression:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`

For broader dashboard/session regression:

- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

For workstation replay/chart re-entry, select from:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`

Browser tests should be run sequentially because they share browser/debug-server
resources. If a browser smoke fails with `listen EPERM: 127.0.0.1`, rerun the
same command with approved escalation.

## Recent Commits

- `a56a711c docs(v6): audit journal row action exposure gate`
- `8520c294 feat(v6): mark journal owner surface ready`
- `16c05bcc test(v6): add hidden journal row action browser harness`
- `65d8b027 feat(v6): add hidden journal row action harness`
- `ff634845 feat(v6): add journal row action session context contract`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
116. The handoff point is intentionally before Journal is visible in Recent
Sessions.
