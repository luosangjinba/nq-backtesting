# V5 Documentation Index

Read this index before working on V5.

## Required First Reads

- `v5/README.md`: V5 purpose and hard architecture rule.
- `v5/docs/MVP_ARCHITECTURE.md`: architecture review and runtime boundaries.
- `v5/docs/EXECUTION_FRAMEWORK.md`: executable development framework.
- `v5/docs/V5_PHASE_ROADMAP.md`: current phase roadmap and step selection
  rules.
- `v5/docs/SETTINGS_BACKLOG_MATRIX.md`: staged Settings ownership matrix for
  deciding whether a control can be implemented directly or needs a new
  runtime/adapter contract first.
- `v5/docs/REPLAY_COUNTDOWN_CONTRACT.md`: replay-owned bar countdown derived
  state contract and UI ownership rules.
- `v5/docs/specs/layout-split-panes-contract.md`: split-pane ownership,
  active-pane, Settings scope, and sync contract before multi-pane UI work.
- `v5/docs/specs/multi-pane-behavior-contract-audit.md`: Step 503A behavior
  contract audit for active pane, shared TF, sync toggles, pane-local chrome,
  viewport demand, reset view, split resize walls, and test coverage.
- `v5/docs/specs/multi-pane-module-audit.md`: current multi-pane module audit,
  ownership debt, proposed split boundaries, and refactor order.
- `v5/docs/specs/replay-pane-fanout-plan.md`: current Step 529 plan for
  replacing same-timeframe replay pane event catch-up with coordinated
  reveal-batch fan-out.
- `v5/docs/specs/pane-local-timeframe-follow-plan.md`: current Step 530 plan
  for fixing pane-local TF changes that can leave a pane blank until reset.
- `v5/docs/specs/pane-local-display-state-isolation-plan.md`: current Step 531
  plan for stopping active-pane display TF and interaction state from leaking
  into other panes.
- `v5/docs/specs/pane-local-initial-coverage-plan.md`: current Step 532 plan
  for loading enough pane-local historical bars after TF changes without
  requiring an immediate left drag.
- `v5/docs/specs/workstation-visual-system.md`: V5 visual and interaction
  system for FXReplay-like workstation polish without bypassing runtime
  boundaries.
- `v5/docs/specs/workstation-decision-backlog.md`: consolidated recent
  decisions that should guide future chart/workstation plans before writing
  implementation code.
- `v5/docs/specs/fxreplay-parity-gap-audit.md`: current FXReplay parity
  coverage and remaining replay workstation workflow gaps.
- `v5/docs/specs/runtime-lifecycle-cleanup.md`: lifecycle and cleanup
  ownership rules for listeners, subscriptions, observers, timers, adapters,
  pane hosts, and caches.
- `v5/docs/specs/open-source-local-deployment.md`: current product direction:
  open-source/local-first deployment instead of SaaS-first infrastructure.
- `v5/TODO.md`: current step plan and manual acceptance standards.
- `v5/sessions/README.md`: session handoff ordering and targeted lookup rules.
- `v5/docs/specs/README.md`: stable spec index and step source map.
- `v5/docs/specs/product-review-loop.md`: product north star for Historical
  Replay Review and Live Execution Review.
- `v5/docs/vendor/lightweight-charts.md`: official Lightweight Charts API links
  and V5 usage rules before chart-engine work.

## Current Direction

V5 is a parallel frontend/runtime rewrite for the FX Replay direction. V4 remains
available as legacy/reference code, but V5 must not inherit V4's old frontend
control flow.

## Reading Rule

Do not load every historical document into context. Read only the documents
needed for the current step, then inspect code directly.
