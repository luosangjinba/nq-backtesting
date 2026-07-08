# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 134 completed.
- Next planned step: Step 135 - Screenshot/Export Owner Contract.
- Worktree expectation at handoff: clean.

The latest completed work is Workstation Chart Slice Selection:

- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md` selects
  Screenshot/Export Owner Contract as the next bounded slice.
- `workstation-chart-slice-selection-step134-smoke.js` locks the selected
  owner boundary, capture/download/storage exclusions, top-toolbar Screenshot
  disabled state, and dashboard row-action visibility.
- Step 135 should define screenshot/export contract/default/validation helpers
  while keeping the top-toolbar Screenshot button disabled and inert.

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
36. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
37. `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`
38. `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`
39. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`
40. `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`
41. `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`
42. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`
43. `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`
44. `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`
45. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`
46. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`
47. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`
48. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`
49. `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`
50. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`
51. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`
52. `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`
53. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`
54. `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`
55. `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`
56. `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`

## Next Step

Step 135 should implement the Screenshot/Export Owner Contract.

Keep Step 135 bounded:

- read `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`,
  `V6_SESSION_SETTINGS_OWNER_CONTRACT.md`,
  `V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`, and
  `V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`;
- create a focused screenshot/export contract/domain module;
- define explicit export request fields for source surface, format, filename,
  dimensions, background, and metadata;
- keep the top-toolbar Screenshot button disabled and inert;
- avoid screenshot capture, canvas reads, downloads, file writes, browser
  storage, persistence, and runtime command wiring in this step;
- keep dashboard row-action visibility unchanged;
- do not expose Order or Calendar.

Expected implementation shape:

- contract/domain module plus focused tests;
- do not dispatch chart/replay/bar-data/default-wall/display-timeframe,
  viewport, session-settings, screenshot/export, orders, or calendar commands
  from the toolbar;
- run the new screenshot/export contract smoke, Step 134 selection smoke,
  session-settings contract smoke, diagnostics visibility cleanup browser
  smoke, Session settings panel regression audit, bottom chrome regression
  audit, chart presentation re-audit, and boundary smoke.

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

Run these before committing Step 135 work:

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

- `85b02e26 docs(v6): select screenshot export contract slice`
- `3509a8cc feat(v6): add session settings owner contract`
- `54ee5f10 docs(v6): select session settings contract slice`
- `a6db00d5 feat(v6): clean up readiness diagnostics visibility`
- `ff8323f7 docs(v6): select diagnostics visibility cleanup slice`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
135. The handoff point is intentionally after selecting the Screenshot/Export
Owner Contract slice.
