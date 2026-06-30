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

- `fx-replay-initial-load.md`: stable rules for replay chart entry, wall-clock
  time semantics, initial display invariants, and verification harnesses.
- `fx-replay-prefix-demand-retention.md`: stable rules for left-side prefix
  demand detection, bounded older chunk loading, sparse merge, and Step 365 MVP
  retention.
- `fx-replay-viewport-display-cache.md`: target rules for Step 369 viewport
  display windows, arbitrary display timeframe switching, cache reuse, delayed
  release, and no-future display.
- `fx-replay-viewport-follow.md`: Phase 2 rules for auto-follow, right offset,
  and rolling visible windows while replay advances.
- `fx-replay-controls-ui.md`: stable rules for chart replay controls, command
  dispatch, read-only status, and browser verification.
- `fx-replay-cursor-persistence.md`: stable rules for cursor persistence,
  bounded restore, read-only progress, and reset/restart.
- `runtime-boundary-contracts.md`: stable rules for pure command/event
  contracts, event notification boundaries, and router root-scoped lifecycle.
- `chart-display-timezone.md`: stable rules for canonical/request/display time,
  display timezone preferences, and label-only timezone changes.
- `chart-presentation-settings.md`: stable rules for chart display preferences
  such as time label format, status fields, margins, right offset, and crosshair
  readouts without mutating replay/bar state.
- `chart-interaction-contracts.md`: Phase 3 rules for chart-owned manual
  visible-range movement, explicit auto-follow pause/resume, and viewport demand
  boundaries.
- `saas-readiness-strategy.md`: cross-phase rule that V5 stays SaaS-ready
  through ownership, repositories, and canonical replay time, while deferring
  auth, billing, and server-backed multi-tenancy until the training loop is
  validated.
