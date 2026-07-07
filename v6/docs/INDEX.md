# V6 Documentation Index

Read this index before working on V6.

## Required First Reads

- `v6/README.md`: V6 purpose, hard rules, and V5 usage boundary.
- `v6/docs/V6_ARCHITECTURE.md`: runtime boundaries and non-porting rules.
- `v6/docs/V6_EXECUTION_ROADMAP.md`: detailed execution order based on the
  useful V5 formation sequence, with V6 gates inserted earlier.
- `v6/docs/V6_PRODUCT_TOP_CHROME.md`: top chrome product-surface rules,
  diagnostics visibility limits, and UI reference handling.
- `v6/docs/V6_WORKFLOW_SHELL_AUDIT.md`: audit of workflow shell chrome,
  panels, active state, close behavior, mutual exclusivity, and ownership.
- `v6/docs/V6_REPLAY_CHART_READINESS_AUDIT.md`: replay/chart gate results after
  workflow shell work and the next chart-facing direction.
- `v6/docs/V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md`: replay/chart
  re-entry audit after dashboard closeout and the next chart-surface owner
  contract direction.
- `v6/docs/V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`: chart surface
  owner contract integration audit and next boundary-smoke expansion direction.
- `v6/docs/V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md`: chart control bridge
  owner contract wiring audit and next boundary-smoke expansion direction.
- `v6/docs/V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md`: chart control
  bridge browser regression audit for native manual wall and reset-view paths.
- `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`: real chart host/engine
  presentation status, static placeholder risk, and next chart-surface target.
- `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`: FXReplay UI reference kernel for
  workstation chrome, menus, settings, and parity work without pixel-copying.
- `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`: current V6 workstation shell
  gaps against the FXReplay UI guardrails and the next shell-only UI slice.
- `v6/docs/V6_HANDOFF.md`: latest restart handoff, current completed step,
  next step, key files, boundaries, and verification commands.
- `v6/docs/specs/replay-viewport-intent.md`: the first core V6 contract.
- `v6/docs/specs/replay-visible-latency.md`: user-visible replay candle latency
  gates that prevent V5's delayed K-line appearance problem from returning.
- `v6/docs/specs/pane-model.md`: unified pane model that forbids V5's old
  primary/non-primary split.
- `v6/docs/specs/fxreplay-baseline.md`: FXReplay-like replay workstation
  behavior and layout baseline for the first usable V6 chart route.
- `v6/TODO.md`: current execution steps and acceptance gates.
- `v5/docs/specs/v6-rewrite-start-decision.md`: why V6 exists and which V5
  failure mode it must avoid.

## Stable Specs

- `specs/replay-viewport-intent.md`: canonical viewport-intent model for
  default replay wall, manual temporary walls, native drag/zoom, display-window
  loads, and append/replace behavior.
- `specs/replay-visible-latency.md`: visible-candle latency metric, browser
  harness shape, and pre-feature performance gates.
- `specs/pane-model.md`: one pane state shape and one command/event path for
  single-pane and future multi-pane behavior.
- `specs/fxreplay-baseline.md`: first-screen product baseline for replay
  controls, chart workspace, status, default/manual walls, and no-future bars.
- `V6_PRODUCT_TOP_CHROME.md`: default top chrome rules that keep runtime/test
  diagnostics out of the user's main reading path.
- `V6_WORKFLOW_SHELL_AUDIT.md`: accepted shell-owned workflow behavior and the
  next-direction guardrail after Steps 32-36.
- `V6_REPLAY_CHART_READINESS_AUDIT.md`: passed visible-latency, wall replay,
  display timeframe, multi-pane, and chart engine readiness gates.
- `V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md`: accepted workstation
  replay/chart re-entry boundary after dashboard closeout.
- `V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`: accepted integration state
  for the chart surface owner contract and bridge boundaries.
- `V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md`: accepted integration state
  for chart control bridges that translate user chart controls into viewport
  commands.
- `V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md`: accepted browser
  regression coverage for chart control bridge user interactions.
- `V6_CHART_PRESENTATION_SURFACE_AUDIT.md`: accepted chart engine readiness and
  the static placeholder replacement direction.
- `V6_FXREPLAY_UI_GUARDRAILS.md`: accepted UI parity guardrails for top chrome,
  toolbars, timeframe menu, settings modal, and chart-first visual tone.
- `V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`: accepted UI parity gap classification
  and priority order before changing workstation chrome.

## Reading Rule

Do not load V5 historical sessions by default. Use V5 docs only for targeted
negative evidence or to port a test case into V6.
