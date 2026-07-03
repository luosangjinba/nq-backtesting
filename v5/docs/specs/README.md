# V5 Specs

Specs store stable rules that future work must preserve.

Write a spec when:

- the behavior or boundary has been validated;
- the rule is expected to survive future steps;
- repeating the decision in every new session would be wasteful.

Specs should explain:

- what the rule is;
- why it exists;
- what is forbidden;
- how to verify it.

## Spec Phase Discipline

Specs must align with `v5/docs/V5_PHASE_ROADMAP.md`.

When adding or materially changing a spec, include or preserve:

- the phase the behavior belongs to;
- the phase gate it protects or advances;
- what is intentionally out of scope for the current phase;
- verification that the behavior does not violate runtime ownership boundaries.

If a spec idea belongs to a later phase, record it in that phase's backlog
instead of implementing it in the current step. This keeps V5 from being pulled
around by local UI observations or one-off FXReplay parity details.

## Active Specs

Specs are grouped by stable behavior area, not by step number. The step notes
below explain where a spec entered or materially changed V5; they do not imply
that future work must follow this file order.

- `product-review-loop.md`: cross-phase product north star defining Historical
  Replay Review and Live Execution Review as the two core review workflows,
  their shared foundation, and the V4 lesson V5 must preserve without copying
  V4 coupling.
- `fx-replay-initial-load.md`: stable rules for replay chart entry, wall-clock
  time semantics, initial display invariants, and verification harnesses.
- `fx-replay-prefix-demand-retention.md`: stable rules for left-side prefix
  demand detection, bounded older chunk loading, sparse merge, and Step 365 MVP
  retention.
- `fx-replay-viewport-display-cache.md`: target rules for Step 369 viewport
  display windows, arbitrary display timeframe switching, cache reuse, delayed
  release, and no-future display.
- `fx-replay-viewport-follow.md`: Phase 2/3 rules for auto-follow, right
  offset, rolling visible windows, and manual replay viewport anchors while
  replay advances.
- `fx-replay-controls-ui.md`: stable rules for chart replay controls, command
  dispatch/serialization, floating transport behavior, read-only status, route
  lifecycle, and browser verification.
- `fx-replay-cursor-persistence.md`: stable rules for cursor persistence,
  bounded restore, read-only progress, and reset/restart.
- `runtime-boundary-contracts.md`: stable rules for pure command/event
  contracts, event notification boundaries, and router root-scoped lifecycle.
- `runtime-lifecycle-cleanup.md`: lifecycle and cleanup ownership rules for
  listeners, subscriptions, observers, timers, adapters, pane hosts, and caches.
- `chart-display-timezone.md`: stable rules for canonical/request/display time,
  display timezone preferences, and label-only timezone changes.
- `chart-presentation-settings.md`: stable rules for chart display preferences
  such as time label format, status fields, margins, right offset, and crosshair
  readouts without mutating replay/bar state.
- `chart-interaction-contracts.md`: Phase 3 rules for chart-owned manual
  visible-range movement, explicit auto-follow pause/resume, viewport demand
  boundaries, native chart interaction, and viewport-level replay transport
  layering.
- `chart-engine-adapter.md`: Phase 3 rules for isolating real chart engine
  usage behind chart runtime/adapter boundaries while preserving offline smoke
  tests.
- `layout-split-panes-contract.md`: Phase 3 rules for future split panes,
  active-pane ownership, Settings scope, sync defaults, and forbidden runtime
  coupling before multi-pane UI implementation.
- `workstation-visual-system.md`: Phase 3 visual and interaction system for
  compact FXReplay-like workstation polish, tokenized styling, component states,
  active-pane controls, and screenshot/browser quality gates.
- `workstation-decision-backlog.md`: consolidated routing spec for recent
  workstation decisions that span chart engine behavior, multi-pane layout,
  replay performance, Settings, visual polish, V4 comparison, and local-first
  direction.
- `open-source-local-deployment.md`: cross-phase product direction that V5 is
  now an open-source/local-first replay workstation for desktop, LAN, VPS, or
  terminal-server deployment.
- `saas-readiness-strategy.md`: historical strategy superseded by Step 490.
  Keep its useful repository/runtime boundary lessons, but do not use it to
  prioritize auth, billing, hosted entitlement, or production multi-tenancy.

## Step Source Map

- Product north star: `product-review-loop.md`
- Step 363: `fx-replay-initial-load.md`
- Step 365: `fx-replay-prefix-demand-retention.md`
- Step 366: `fx-replay-controls-ui.md`
- Step 367: `runtime-boundary-contracts.md`
- Step 368: `fx-replay-cursor-persistence.md`
- Step 369: `fx-replay-viewport-display-cache.md`
- Step 372: `chart-display-timezone.md`
- Step 373: `chart-presentation-settings.md`
- Step 374: `fx-replay-viewport-follow.md`
- Step 376: `chart-interaction-contracts.md`
- Step 377: `chart-engine-adapter.md`
- Step 378: `chart-interaction-contracts.md`
- Step 379: `chart-engine-adapter.md`, `chart-interaction-contracts.md`
- Step 380: `chart-interaction-contracts.md`,
  `fx-replay-viewport-follow.md`
- Step 381: `chart-interaction-contracts.md`
- Step 382: `chart-interaction-contracts.md`,
  `chart-presentation-settings.md`
- Step 383: `chart-interaction-contracts.md`
- Step 384: `chart-interaction-contracts.md`
- Step 385: `chart-engine-adapter.md`, `chart-interaction-contracts.md`
- Step 386: `chart-interaction-contracts.md`,
  `chart-presentation-settings.md`
- Step 387: `chart-interaction-contracts.md`, `fx-replay-controls-ui.md`
- Step 388: `chart-interaction-contracts.md`,
  `chart-presentation-settings.md`
- Step 389: `chart-interaction-contracts.md`
- Step 390: `chart-interaction-contracts.md`
- Step 391: `fx-replay-controls-ui.md`
- Step 392: `chart-interaction-contracts.md`
- Step 393: `chart-interaction-contracts.md`, `fx-replay-controls-ui.md`
- Step 394: `fx-replay-controls-ui.md`
- Step 395: `fx-replay-controls-ui.md`,
  `chart-presentation-settings.md`
- Step 396: `fx-replay-controls-ui.md`
- Step 397: `fx-replay-controls-ui.md`
- Step 398: `fx-replay-controls-ui.md`
- Step 399: `fx-replay-controls-ui.md`
- Step 400: `fx-replay-controls-ui.md`
- Step 401: `fx-replay-viewport-follow.md`,
  `chart-interaction-contracts.md`, `fx-replay-controls-ui.md`
- Step 402: `fx-replay-controls-ui.md`
- Step 403: `fx-replay-controls-ui.md`
- Step 404: `chart-interaction-contracts.md`
- Step 418: `chart-presentation-settings.md`
- Step 419: `chart-presentation-settings.md`
- Step 420: `chart-presentation-settings.md`
- Step 421: `chart-presentation-settings.md`
- Step 422: `chart-interaction-contracts.md`,
  `fx-replay-viewport-follow.md`
- Step 423: `chart-interaction-contracts.md`,
  `fx-replay-viewport-follow.md`
- Step 460: `layout-split-panes-contract.md`,
  `chart-interaction-contracts.md`, `chart-presentation-settings.md`
- Step 461: `layout-split-panes-contract.md`
- Step 488: `workstation-visual-system.md`,
  `chart-interaction-contracts.md`, `fx-replay-controls-ui.md`
- Step 489: `workstation-visual-system.md`,
  `chart-interaction-contracts.md`, `fx-replay-controls-ui.md`
- Step 490: `open-source-local-deployment.md`,
  `saas-readiness-strategy.md`, `product-review-loop.md`
- Step 491: `workstation-decision-backlog.md`,
  `layout-split-panes-contract.md`, `workstation-visual-system.md`
- Step 492: `runtime-lifecycle-cleanup.md`,
  `runtime-boundary-contracts.md`, `chart-engine-adapter.md`
- Cross-phase: `open-source-local-deployment.md`
