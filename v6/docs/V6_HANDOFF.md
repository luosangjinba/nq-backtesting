# V6 Handoff

Last updated: 2026-07-11

## 2026-07-11 Restart Handoff Snapshot

Read this block first after restarting the server or assistant context.

### Repository State

- Branch: `v6/fx-replay-workstation`
- Worktree at handoff: clean after Step 342 closeout
- Latest completed step: Step 342 - Target Materialization Replay Diagnostics
  Runtime State Surface
- Recent relevant commits:
  - Step 342 added the smallest read-only diagnostics runtime state surface,
    `getSnapshot` command, `snapshotReady` event, and app registration without
    visible UI or replay/target-loading behavior changes.
  - Step 341 defined the read-only diagnostics/readout owner contract,
    diagnostic fields, shell consumption rules, and forbidden actions before
    runtime state wiring.
  - Step 340 selected
    `target-materialization-replay-coordination-diagnostics-readout` as the
    next bounded slice before any narrow runtime handoff.
  - Step 339 added optional target-history pack member `replay-coordination`
    for the Step 337 replay coordination browser smoke while preserving the
    default eight-member pack.
  - Step 338 selected
    `target-history-pack-replay-coordination-member` as the next bounded
    target-timeframe materialization slice before broader runtime changes.
  - Step 337 verified manual next, autoplay, no-bar gap skipping, fallback,
    and source cursor append filtering while `8h` target materialization is
    active.
  - Step 336 verified browser-visible `8h`, `1D`, and `1W` target
    materialization, source preservation when returning to `1m`,
    target-data-missing fallback, responsiveness, and shell/runtime boundary
    ownership.
  - Step 335 wired Display-Timeframe Runtime target materialization through
    source cursor read, source-bar preservation, bar-data target plan/load,
    source-cursor target-bar reveal filtering, and chart-data replacement with
    `preserveSource: true`.
  - Step 334 defined the read-only display-timeframe target materialization
    wiring plan: owner, command/data sequence, fallback gates, rollback
    criteria, and forbidden actions before runtime handoff wiring.
  - Step 333 verified the existing display-timeframe, bar-data, chart-data,
    replay cursor, and target-bar reveal policy surfaces required by the pure
    handoff plan and selected wiring plan next.
  - Step 332 selected
    `display-timeframe-target-materialization-readiness-audit` as the next
    bounded slice before runtime materialization behavior wiring.
  - Step 331 mapped display materialization intent to existing bar-data and
    chart-data owner surfaces and recorded the first future wiring point
    preconditions without runtime wiring.
  - Step 330 selected
    `replay-coordination-materialization-pure-handoff-plan` as the next
    bounded slice before runtime materialization wiring.
  - Step 329 defined the replay coordination materialization owner contract,
    participant read/write boundaries, and source-cursor target-bar no-future
    reveal policy.
  - Step 328 selected
    `replay-coordination-materialization-owner-contract` as the next bounded
    slice.
  - Step 327 re-measured `8h`, `1D`, and `1W` target-history responsiveness
    after the fast path and reached `materialization-ready`.
  - Step 326 added the programmatic target-history leftward request fast path.

### Current Product / Engineering Direction

- V6 is now the active foundation for an open-source-oriented personal
  backtesting/journal workstation for SMC/ICT discretionary traders, especially
  prop firm traders.
- Current foundation priority remains chart basics: chart loading, TF switching,
  leftward history extension, date range entry, replay, multi-pane, pane-local
  reset, and visible K-line latency.
- Indicators, main/sub-pane indicator areas, simulated trading/order tickets,
  prop-firm workflow, and journal workflows remain later work unless a bounded
  owner contract says otherwise.
- Keep the modularity rule strict: feature work must land through its owner
  boundary and public command/event contract.

### Latest Fixes To Preserve

- Target-history materialization transition boundary:
  high-timeframe target-history responsiveness is within budget after the
  fast path. Step 329 defines the owner contract, and Step 330 selects a pure
  handoff plan as the next bounded slice. Step 331 defines that pure handoff
  plan. Step 332 selects a read-only readiness audit as the next bounded slice.
  Step 333 completes that audit and selects a wiring plan next. Step 334
  defines that wiring plan and selects runtime handoff wiring next. Step 335
  implements the first runtime handoff slice inside Display-Timeframe Runtime.
  Step 336 verifies that handoff in browser-visible `8h`, `1D`, and `1W`
  materialization flows, including source preservation and fallback. Replay
  remains source `1m` driven. Step 337 verifies manual next/autoplay replay
  coordination while target materialization is active and fixes HTF append
  filtering to use the replay source cursor instead of the projected bucket
  timestamp. Step 338 selects target-history pack replay coordination member
  integration as the next bounded slice, keeping runtime behavior unchanged.
  Step 339 implements that pack member as optional `replay-coordination` so the
  default eight-member target-history pack stays unchanged. Step 340 selects
  diagnostics/readout ownership as the next slice before any runtime handoff.
  Step 341 defines that read-only contract and keeps runtime behavior
  unchanged. Step 342 adds the read-only diagnostics runtime snapshot surface
  and still keeps visible UI, replay cursor movement, target loading,
  chart-data writes, viewport behavior, and request sizing unchanged.
- Session setup datetime fix:
  `datetime-local` values are parsed as chart/data-axis literal UTC. A user
  input like `2026-05-04T09:30` stores `2026-05-04T09:30:00.000Z`, not the
  browser-local shifted time.
- Session switch price-scale fix:
  opening a different price regime or pressing reset view should autoscale the
  pane instead of inheriting the prior session price axis.
- Wheel zoom leftward prepend stability:
  wheel-initiated leftward history prepend has a short stabilization recheck so
  visible K-lines do not jump after Lightweight Charts settles.
- Manual-next session gap fix:
  replay now skips no-bar session breaks to the next available source K-line.
  The browser smoke covers 1m, 5m, and 15m display paths. HTF chart timestamps
  may still show bucket starts such as `17:59`; verify the projected bucket's
  source bar reached `18:00`, not that the HTF bucket timestamp equals `18:00`.

### Runtime / Server At Handoff

- API process was listening at `127.0.0.1:8766`:
  `/home/leo/miniconda3/bin/python3 /home/leo/myworkspace/trading/backtesting/v4/v4_api.py`
- Static web process was listening at `127.0.0.1:8002`:
  `python3 -m http.server 8002 --bind 127.0.0.1`
- Browser URL:
  `http://127.0.0.1:8002/v6/index.html`
- Health URL:
  `http://127.0.0.1:8766/v4/health`
- Windows one-click entry remains:
  `v6/start_windows.bat`
- Windows PowerShell entry:
  `powershell -NoProfile -ExecutionPolicy Bypass -File v6/start_windows.ps1 start`

### Restart Checklist

1. Confirm branch and cleanliness:
   - `git branch --show-current`
   - `git status --short`
2. Start or verify services:
   - API: `http://127.0.0.1:8766/v4/health`
   - Web: `http://127.0.0.1:8002/v6/index.html`
3. Open `v6/TODO.md` and this handoff file before selecting the next step.
4. If continuing planned work, start with Step 343:
   target materialization replay diagnostics runtime wiring plan.
5. If continuing the replay gap bug, manually spot-check:
   - create a session crossing `2026-06-01 17:00`;
   - replay through the break on 1m, 5m, and 15m display TF;
   - confirm replay cursor skips to `18:00` instead of sticking at `16:59`.

### Last Verified Commands

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

One browser latency smoke had a transient timing failure during verification,
then the individual test and the full pack both passed. Treat future single
latency threshold failures the same way: rerun the failing case once, then
rerun the pack before changing code.

### Next Work Recommendation

- Do not start indicators or trading simulation yet.
- Recommended next action is to select and document Step 258 as the next bounded
  chart-foundation slice, unless a fresh manual test after restart exposes a
  regression in the current replay/date-range/leftward-history foundation.
- Good candidate area: another small chart-foundation UX/stability debt item
  around replay/date-range/TF behavior, with smoke coverage before broader
  feature work.

## Current State

- Branch: `v6/fx-replay-workstation`
- Current V6 step state: Step 211 completed.
- Next planned step: Step 212 - Top-Toolbar Active-Pane Symbol Presentation Sync.
- Worktree expectation at handoff: clean.

The latest completed work is Next Chart Slice Selection:

- `V6_NEXT_CHART_SLICE_SELECTION_STEP211.md` selects Top-Toolbar
  Active-Pane Symbol Presentation Sync as the next bounded chart-facing slice.
- Step 206-208 active-pane display-timeframe work and Step 210 pane-local
  header isolation are acknowledged as the immediate foundation.
- Step 212 should update `data-v6-top-symbol` from active pane state as
  read-only shell presentation.
- Custom intervals, interval sync, symbol picker UI, indicators, Pine Script,
  and trading/order behavior remain out of scope.

Browser tests should be run sequentially because the current smoke harnesses
share browser/CDP resources.

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
55. `v6/sessions/session_20260708_step154_multi_pane_crosshair_readout.md`
56. `v6/sessions/session_20260708_step155_multi_pane_leftward_history.md`
57. `v6/sessions/session_20260708_step156_multi_pane_replay_append.md`
58. `v6/sessions/session_20260708_step157_multi_pane_replay_viewport_projection.md`
59. `v6/sessions/session_20260708_step158_chart_foundation_integration_reaudit.md`
60. `v6/sessions/session_20260708_step159_chart_foundation_next_slice_selection.md`
61. `v6/sessions/session_20260708_step160_layout_menu_owner_binding.md`
62. `v6/sessions/session_20260708_step161_layout_pane_surface_reflow.md`
63. `v6/sessions/session_20260708_step162_layout_pane_data_bootstrap.md`
64. `v6/sessions/session_20260708_step163_pane_local_reset_view_controls.md`
65. `v6/sessions/session_20260708_step164_layout_variant_geometry.md`
66. `v6/sessions/session_20260708_step165_pane_resize_drag.md`
67. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
68. `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`
69. `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`
70. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`
71. `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`
72. `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`
73. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`
74. `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`
75. `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`
76. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`
77. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`
78. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`
79. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`
80. `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`
81. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`
82. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`
83. `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`
84. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`
85. `v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`
86. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`
87. `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`
88. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`
89. `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`
90. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`
91. `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`
92. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md`
93. `v6/docs/V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`
94. `v6/docs/V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`
95. `v6/docs/V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`
96. `v6/docs/V6_RESET_VIEW_KXG_FLOW_STEP146.md`
97. `v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`
98. `v6/docs/V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`
99. `v6/docs/V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`
100. `v6/docs/V6_REPLAY_SPEED_UNDER_HISTORY_EXTENSION_STEP150.md`
101. `v6/docs/V6_CONTINUOUS_LEFTWARD_HISTORY_STEP151.md`
102. `v6/docs/V6_AUTO_PLAY_CONTINUOUS_HISTORY_STEP152.md`
103. `v6/docs/V6_CROSSHAIR_OHLC_READOUT_STEP153.md`
104. `v6/docs/V6_MULTI_PANE_CROSSHAIR_READOUT_STEP154.md`
105. `v6/docs/V6_MULTI_PANE_LEFTWARD_HISTORY_STEP155.md`
106. `v6/docs/V6_MULTI_PANE_REPLAY_APPEND_STEP156.md`
107. `v6/docs/V6_MULTI_PANE_REPLAY_VIEWPORT_PROJECTION_STEP157.md`
108. `v6/docs/V6_CHART_FOUNDATION_INTEGRATION_REAUDIT_STEP158.md`
109. `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP159.md`
110. `v6/docs/V6_LAYOUT_MENU_OWNER_BINDING_STEP160.md`
111. `v6/docs/V6_LAYOUT_PANE_SURFACE_REFLOW_STEP161.md`
112. `v6/docs/V6_LAYOUT_PANE_DATA_BOOTSTRAP_STEP162.md`
113. `v6/docs/V6_PANE_LOCAL_RESET_VIEW_CONTROLS_STEP163.md`
114. `v6/docs/V6_LAYOUT_VARIANT_GEOMETRY_STEP164.md`
115. `v6/docs/V6_PANE_RESIZE_DRAG_STEP165.md`
116. `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`
117. `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`
118. `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`
119. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP205.md`
120. `v6/docs/V6_PANE_LOCAL_DISPLAY_TIMEFRAME_UI_READINESS_STEP206.md`
121. `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_SOURCE_INTEGRATION_STEP207.md`
122. `v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md`
123. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP209.md`
124. `v6/docs/V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md`
125. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP211.md`
126. `v6/sessions/session_20260708_step205_next_chart_slice_selection.md`
127. `v6/sessions/session_20260708_step206_pane_local_display_timeframe_ui_readiness.md`
128. `v6/sessions/session_20260708_step207_display_timeframe_target_source_integration.md`
129. `v6/sessions/session_20260708_step208_display_timeframe_active_pane_ui_state_sync.md`
130. `v6/sessions/session_20260708_step209_next_chart_slice_selection.md`
131. `v6/sessions/session_20260708_step210_pane_local_header_state_sync.md`
132. `v6/sessions/session_20260708_step211_next_chart_slice_selection.md`

## Next Step

Step 212 should focus on Top-Toolbar Active-Pane Symbol Presentation Sync.

Keep Step 212 bounded:

- read `V6_NEXT_CHART_SLICE_SELECTION_STEP211.md`,
  `V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md`, and
  `session_20260708_step211_next_chart_slice_selection.md`;
- update `data-v6-top-symbol` from active pane instrument as read-only
  shell-owned presentation;
- initialize from `PANE_COMMANDS.GET_ACTIVE` and subscribe to active-pane /
  active symbol changes;
- do not add symbol picker UI, comparison symbols, custom intervals, interval
  sync, indicators, Pine Script, or trading/order behavior.

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

Run these before committing Step 159 work:

- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-history-step157-smoke.js`
- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
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
