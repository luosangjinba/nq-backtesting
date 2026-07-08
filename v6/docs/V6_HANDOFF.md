# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 141 completed.
- Next planned step: Step 142 - Workstation Chart Slice Selection.
- Worktree expectation at handoff: clean.

The latest completed work is the Account/Trading Owner Contract:

- `V6_ACCOUNT_TRADING_OWNER_CONTRACT.md` documents the accepted account/trading
  owner surface.
- `account-trading-contract-smoke.js` locks the owner identity, account readout
  fields, trade draft fields, read-only intent, disabled bottom chrome, and
  dashboard row-action visibility.
- `boundary-smoke.js` now covers the `account-trading` source root.

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
17. `v6/sessions/session_20260707_step116_journal_row_action_visibility_wiring.md`
18. `v6/sessions/session_20260707_step117_dashboard_journal_row_action_regression_pack_audit.md`
19. `v6/sessions/session_20260707_step118_workstation_chart_presentation_reaudit.md`
20. `v6/sessions/session_20260707_step119_workstation_chart_slice_selection.md`
21. `v6/sessions/session_20260707_step120_left_drawing_rail_reservation.md`
22. `v6/sessions/session_20260707_step121_workstation_rail_regression_audit.md`
23. `v6/sessions/session_20260707_step122_workstation_chart_slice_selection.md`
24. `v6/sessions/session_20260707_step123_bottom_account_chrome_reservation.md`
25. `v6/sessions/session_20260707_step124_bottom_chrome_regression_audit.md`
26. `v6/sessions/session_20260707_step125_workstation_chart_slice_selection.md`
27. `v6/sessions/session_20260707_step126_right_rail_session_settings_panel_reservation.md`
28. `v6/sessions/session_20260707_step127_right_rail_session_settings_panel_regression_audit.md`
29. `v6/sessions/session_20260707_step128_workstation_chart_slice_selection.md`
30. `v6/sessions/session_20260707_step129_workstation_ui_parity_gap_reaudit.md`
31. `v6/sessions/session_20260707_step130_workstation_chart_slice_selection.md`
32. `v6/sessions/session_20260707_step131_diagnostics_visibility_cleanup.md`
33. `v6/sessions/session_20260707_step132_workstation_chart_slice_selection.md`
34. `v6/sessions/session_20260707_step133_session_settings_owner_contract.md`
35. `v6/sessions/session_20260707_step134_workstation_chart_slice_selection.md`
36. `v6/sessions/session_20260707_step135_screenshot_export_owner_contract.md`
37. `v6/sessions/session_20260707_step136_workstation_chart_slice_selection.md`
38. `v6/sessions/session_20260707_step137_indicators_owner_contract.md`
39. `v6/sessions/session_20260707_step138_workstation_chart_slice_selection.md`
40. `v6/sessions/session_20260707_step139_drawing_action_history_owner_contract.md`
41. `v6/sessions/session_20260707_step140_workstation_chart_slice_selection.md`
42. `v6/sessions/session_20260707_step141_account_trading_owner_contract.md`
43. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
44. `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`
45. `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`
46. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`
47. `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`
48. `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`
49. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`
50. `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`
51. `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`
52. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`
53. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`
54. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`
55. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`
56. `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`
57. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`
58. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`
59. `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`
60. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`
61. `v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`
62. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`
63. `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`
64. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`
65. `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`
66. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`
67. `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`
68. `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`
69. `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`
70. `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`

## Next Step

Step 142 should select the next bounded workstation/chart slice.

Keep Step 142 bounded:

- read `V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`,
  `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`,
  `V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`, and
  `V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`;
- choose one small next slice from the remaining workstation/chart gaps;
- prefer docs/test selection only unless the selected slice is sharply bounded
  by existing owner contracts;
- keep bottom trading controls, order placement, position mutation, account
  mutation, analytics calculation, drawing tools, chart overlays, pane
  mutation, undo/redo execution, indicator calculation, screenshot capture,
  session settings editing, and runtime command wiring disabled unless that
  exact slice is selected;
- keep dashboard row-action visibility unchanged;
- do not expose Order or Calendar.

Expected implementation shape:

- selection doc plus focused smoke;
- do not dispatch chart/replay/bar-data/default-wall/display-timeframe,
  viewport, session-settings, screenshot/export, indicators,
  drawing/action-history, account/trading, orders, or calendar commands from
  bottom chrome, toolbar, or rail;
- run the new Step 142 slice selection smoke, account/trading contract smoke,
  Step 140 slice selection smoke, drawing/action-history contract smoke,
  indicators contract smoke, diagnostics visibility cleanup browser smoke,
  bottom chrome regression audit, bottom account chrome browser smoke, chart
  presentation re-audit, and boundary smoke.

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
- Journal: enabled, journal-owned surface, owner `journal-runtime`.
- Order: disabled/contract-ready, owner `orders-runtime`.
- Calendar: disabled/contract-ready, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 142 selection work:

- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step128-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step125-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step122-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
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
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/dashboard-journal-row-action-regression-pack-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-smoke.js`

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

- `28e78e55 feat(v6): add account trading owner contract`
- `8f958eba docs(v6): select account trading contract slice`
- `d4c5b0b2 docs(v6): close drawing action history owner contract`
- `68e8ec7d docs(v6): select drawing action history contract slice`
- `4c2c992d feat(v6): add drawing action history owner contract`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
142. The handoff point is intentionally after establishing the Account/Trading
Owner Contract and before choosing the next bounded workstation/chart slice.
