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

## Active Specs

- `fx-replay-initial-load.md`: stable rules for replay chart entry, wall-clock
  time semantics, initial display invariants, and verification harnesses.
- `fx-replay-prefix-demand-retention.md`: stable rules for left-side prefix
  demand detection, bounded older chunk loading, sparse merge, and retention.
- `fx-replay-controls-ui.md`: stable rules for chart replay controls, command
  dispatch, read-only status, and browser verification.
- `fx-replay-cursor-persistence.md`: stable rules for cursor persistence,
  bounded restore, read-only progress, and reset/restart.
- `runtime-boundary-contracts.md`: stable rules for pure command/event
  contracts, event notification boundaries, and router root-scoped lifecycle.
