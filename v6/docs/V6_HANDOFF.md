# V6 Handoff

Last updated: 2026-07-08

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 153 completed.
- Next planned step: Step 154 - Multi-Pane Crosshair Readout Isolation.
- Worktree expectation at handoff: clean.

The latest completed work is Crosshair OHLC Readout Boundary:

- `V6_CROSSHAIR_OHLC_READOUT_STEP153.md` records the Lightweight Charts
  crosshair event boundary and shell readout rendering rule.
- `status-readout-controller-smoke.js` proves OHLC stays hidden until a
  crosshair-selected bar arrives.
- `workstation-chart-surface-smoke.js` proves chart-surface emits pane-local
  crosshair state.
- `crosshair-ohlc-readout-browser-step153-smoke.js` proves real browser
  crosshair movement updates OHLC and avoids duplicate chart-header labels.
- Step 154 should harden multi-pane crosshair readout isolation.

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
43. `v6/sessions/session_20260707_step142_workstation_chart_slice_selection.md`
44. `v6/sessions/session_20260707_step143_chart_foundation_reprioritization.md`
45. `v6/sessions/session_20260707_step144_database_kline_import_boundary.md`
46. `v6/sessions/session_20260707_step145_replay_kline_chart_flow.md`
47. `v6/sessions/session_20260708_step146_reset_view_kxg_flow.md`
48. `v6/sessions/session_20260708_step147_multi_pane_chart_foundation.md`
49. `v6/sessions/session_20260708_step148_leftward_historical_extension.md`
50. `v6/sessions/session_20260708_step149_drag_triggered_history_extension.md`
51. `v6/sessions/session_20260708_step150_replay_speed_under_history_extension.md`
52. `v6/sessions/session_20260708_step151_continuous_leftward_history.md`
53. `v6/sessions/session_20260708_step152_auto_play_continuous_history.md`
54. `v6/sessions/session_20260708_step153_crosshair_ohlc_readout.md`
55. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
56. `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`
57. `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`
58. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`
59. `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`
60. `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`
61. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`
62. `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`
63. `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`
64. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`
65. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`
66. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`
67. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`
68. `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`
69. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`
70. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`
71. `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`
72. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`
73. `v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`
74. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`
75. `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`
76. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`
77. `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`
78. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`
79. `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`
80. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md`
81. `v6/docs/V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`
82. `v6/docs/V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`
83. `v6/docs/V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`
84. `v6/docs/V6_RESET_VIEW_KXG_FLOW_STEP146.md`
85. `v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`
86. `v6/docs/V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`
87. `v6/docs/V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`
88. `v6/docs/V6_REPLAY_SPEED_UNDER_HISTORY_EXTENSION_STEP150.md`
89. `v6/docs/V6_CONTINUOUS_LEFTWARD_HISTORY_STEP151.md`
90. `v6/docs/V6_AUTO_PLAY_CONTINUOUS_HISTORY_STEP152.md`
91. `v6/docs/V6_CROSSHAIR_OHLC_READOUT_STEP153.md`
92. `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`
93. `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`
94. `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`

## Next Step

Step 154 should focus on Multi-Pane Crosshair Readout Isolation.

Keep Step 154 bounded:

- read `V6_CROSSHAIR_OHLC_READOUT_STEP153.md`,
  `V6_AUTO_PLAY_CONTINUOUS_HISTORY_STEP152.md`,
  `V6_CONTINUOUS_LEFTWARD_HISTORY_STEP151.md`,
  `V6_REPLAY_SPEED_UNDER_HISTORY_EXTENSION_STEP150.md`,
  `V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`,
  `V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`,
  `V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`,
  `V6_RESET_VIEW_KXG_FLOW_STEP146.md`,
  `V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`,
  `V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`,
  `V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`,
  `V6_ARCHITECTURE.md`, `specs/replay-viewport-intent.md`,
  `specs/replay-visible-latency.md`, and `specs/pane-model.md`;
- keep crosshair state pane-local in chart-surface state;
- define whether the visible readout follows the active pane or hovered pane and
  gate that decision with a smoke test;
- prevent crosshair movement in one pane from overwriting another pane's stored
  selected bar;
- preserve the Step 153 rule that OHLC is hidden when no selected candle is
  available;
- preserve continuous leftward exhaustion stopping and canvas-left request caps;
- preserve duplicate/exhausted older-window suppression;
- preserve replay speed under active and recently loaded history extension and
  auto-play;
- preserve pane-local chart-data and viewport intent for multi-pane hosts;
- avoid chart overlays, simulated trading, comparison symbols, and additional
  workstation chrome behavior in this step;
- keep dashboard row-action visibility unchanged;
- do not expose Order or Calendar.

Expected implementation shape:

- multi-pane crosshair/OHLC readout isolation through existing chart-surface, chart-engine,
  chart-data, chart-entry, replay, and pane ownership boundaries;
- do not request/cache bars outside bar-data;
- do not write chart series outside chart-engine;
- do not mutate replay cursor outside replay runtime;
- do not mutate viewport intent outside chart-viewport runtime;
- run drag-triggered history extension smoke, leftward history extension smoke,
  multi-pane foundation smoke, reset view / KXG smoke, replay K-line chart flow
  smoke, database K-line import boundary smoke, chart foundation
  reprioritization smoke, chart reset view browser smoke, chart presentation
  re-audit, and boundary smoke.

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

Run these before committing Step 154 work:

- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/auto-play-continuous-history-browser-step152-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-pane-isolation-step151-smoke.js`
- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/reset-view-kxg-flow-step146-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
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

- `3417f9dc test(v6): verify replay k-line chart visibility`
- `8e3ebd86 feat(v6): gate replay k-line chart flow`
- `3be1804e test(v6): cover database k-line import boundary`
- `b74fd09e feat(v6): add database bars adapter boundary`
- `07899ef6 docs(v6): constrain history requests and replay latency`
- `91441296 docs(v6): capture leftward history extension requirement`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
146. The handoff point is intentionally after gating replay K-line chart flow
and before stabilizing reset view / KXG reset behavior.
