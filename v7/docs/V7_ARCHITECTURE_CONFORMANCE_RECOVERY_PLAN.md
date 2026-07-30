# V7 Architecture Conformance Recovery Plan

Status: binding recovery constitution (R8, activated by R8.1 on 2026-07-30)

## Decision

R8 is the only permitted V7 delivery milestone until architecture conformance
is restored and reaccepted. New product features, opportunistic fixes, and
acceptance of R7.3n/R7.3o are frozen. A change may land only when it is required
by an R8 step, updates its executable evidence in the same commit, and begins
and ends with a clean worktree.

The immutable pre-remediation checkpoint is commit `fa561599`. That commit
preserves the exact implementation and evidence that triggered this recovery;
it is not an architecture acceptance point.

## Recovery Outcome

R8 is complete only when production, not a fixture model, proves all of the
following:

- Bar Data Runtime is the sole owner of raw-market-data request, retention,
  cache identity, coalescing, and eviction;
- Replay Runtime is the sole owner of cursor and reveal state;
- one semantic Workspace State owner holds the accepted Pane/Session Hours/
  Viewport snapshot under complete Session, activation, transaction, and
  revision identity;
- Chart Runtime is the sole chart-series writer and participates in a staged,
  reversible commit rather than publishing before the semantic commit can
  succeed;
- Workspace Transaction Runtime is the only global commit coordinator and
  either commits Chart, Replay, semantic Workspace State, and publication as
  one unit or restores every owner to the last accepted revision;
- production composition boots through ModuleHost using accurate descriptors,
  declared ports, lifecycle cleanup, and real optional-removal evidence;
- capability additions extend registered contracts without editing existing
  core owners or branching on concrete capability ids;
- source-responsibility, size, documentation, and cross-product gates inspect
  real production sources and real browser behavior;
- the reported dense two-Pane ETH/RTH drag-and-Locate sequence cannot collapse
  either target or non-target Pane, move Replay, or expose mixed revisions.

Passing old harnesses is necessary but not sufficient. No recovery item may be
closed with a toy model, source-name inventory, or UI-side replica of an owner.

## Recorded Regressions

| Bug | Production evidence | Broken boundary | First recovery step |
| --- | --- | --- | --- |
| `BUG-V7-0001` | Chart presentation can succeed before a later commit failure, leaving new visible Chart state with the prior accepted Workspace/Replay revision. | atomic Workspace commit and visible rollback | R8.7 |
| `BUG-V7-0002` | Replay Workspace UI retains and merges raw source batches outside Bar Data Runtime. | sole raw request/cache/retention owner | R8.4 |
| `BUG-V7-0003` | After a dense ETH workflow, switching to RTH and locating from one Pane can reset/collapse the non-target Pane to the Session start. | explicit Pane time location and cross-product closure | R8.13 |
| `BUG-V7-0004` | Production composition manually constructs services instead of booting the declared ModuleHost graph; descriptors and lifecycle declarations can drift from imports and returned cleanup. | module boundary and lifecycle enforcement | R8.2 |
| `BUG-V7-0005` | Architecture and source gates can stay green while checking fixtures, declared inventories, or synthetic assemblies rather than production behavior. | harness truthfulness | R8.2 |

The affected accepted harness rules are marked `regressed` in
`v7-harness-rules.json`. Their original `acceptanceEvidence` is retained as
history; R8 evidence never rewrites or erases it.

Recovery assignments are explicit: R8.6 owns H007; R8.8 owns H056; R8.9 owns
H009/H010/H049/H050; R8.10 owns H024; R8.11 owns H018; R8.12 owns H022/H023;
R8.13 owns H019/H066; and R8.14 owns H021/H025/H069. A step may add evidence
earlier, but it cannot clear a rule assigned to a later gate.

## Binding Delivery Sequence

Every item below is exactly one bounded commit. After each commit, stop and
report the commit, evidence, remaining risks, and next step for review. Never
amend or squash an R8 commit. If review rejects a step, preserve it and create a
new delivery id for its replacement before doing corrective work.

### R8.1 — Recovery Constitution And Regression Lifecycle

- record this binding plan in the index, roadmap, restart handoff, and TODO;
- assign stable bug identities and preserve the pre-remediation checkpoint;
- add blocking `regressed` rule lifecycle semantics with negative controls;
- change no production runtime or browser behavior.

### R8.2 — Production Architecture Analyzer

- inspect imports, public-entry boundaries, actual construction, mutable
  writers, returned lifecycle handles, and independent boot targets directly
  from production sources;
- fail descriptor/import/lifecycle drift and fixture-only false-green cases;
- publish a complete owner/dependency/writer baseline for later R8 steps.

### R8.3 — Descriptor, Lifecycle, And Independent-Harness Repair

- correct all descriptor dependencies and lifecycle declarations;
- make every independent harness boot its module without the application shell;
- prove disposal and each optional-removal case against production assembly.

### R8.4 — Raw Coverage Lease Contract

- define a pure transaction-scoped `RawCoverageLease`/read-view contract;
- bind identity, bounded windows, lifetime, cancellation, and disposal;
- prohibit retained raw batches or cache-like ledgers in UI/feature owners.

### R8.5 — Sole Bar Data Retention Owner

- activate the lease through Bar Data Runtime;
- remove `SourceBatchLedger` and every UI raw-retention path;
- prove bounded LRU/coverage reuse, delayed work, and disposal in production.

### R8.6 — Sole Semantic Workspace State Owner

- introduce one runtime owner for accepted Pane Workspace, Session Hours,
  Viewport, and persistence-facing semantic state;
- remove UI-side accepted ledgers and direct mutable ownership;
- bind every state value to complete transaction and revision identity.

### R8.7 — Prepared Commit Contract

- define prepared commit/rollback/finalize receipts for Chart, Replay,
  Workspace State, and publication participants;
- forbid irreversible visible or semantic mutation during prepare;
- prove forged, stale, duplicate, partial, and disposal failures.

### R8.8 — Reversible Chart Application

- replace early irreversible `present()` with stage/apply/rollback/finalize;
- prove exact visible receipt and restoration of the previous Pane set after
  failures at every later participant boundary.

### R8.9 — Globally Atomic Workspace Transaction

- make Workspace Transaction Runtime coordinate all prepared participants;
- remove the post-terminal UI commit domain;
- prove all failure permutations leave Chart, Replay, Workspace State,
  publication, and persistence on one prior accepted revision.

### R8.10 — UI And Composition Split

- reduce route/UI controllers to commands, DOM presentation, and event
  subscription;
- move construction and orchestration into focused composition modules;
- remove oversized mixed-purpose production files without forwarding shards.

### R8.11 — Production ModuleHost Boot

- boot the real application through ModuleHost and registered public ports;
- prove two isolated application instances, reverse cleanup, partial-start
  rollback, and the production optional-module removal matrix.

### R8.12 — Source And Documentation Closure

- enforce effective-code/function budgets against all production files;
- document every public contract, side effect, lifecycle, cancellation path,
  critical invariant, and tracked compatibility/debt path;
- permit no undocumented exception or expired compatibility owner.

### R8.13 — Calendar Capability And RTH Locate Re-derivation

- reintroduce calendar timeframes through registered capability extension
  without edits or concrete-id branches in existing core owners;
- fix `BUG-V7-0003` through the corrected owners, not a UI raw-data ledger;
- keep R7.3n/R7.3o unaccepted until this replacement passes.

### R8.14 — Full Production Regression Matrix

- run real production permutations across Pane count, focus/target, instrument,
  fixed/calendar timeframe, ETH/RTH, dense/manual/default Viewport, cache state,
  delayed/reordered/failing work, Replay action, persistence, and restart;
- include dynamic post-visible failure injection for `BUG-V7-0001`;
- require every catalog rule to be executable or explicitly reaccepted.

### R8.15 — Human Acceptance And Zero-Debt Closure

- repeat the exact dense two-Pane ETH/RTH drag-and-Locate workflow in a hard-
  reloaded real browser;
- review interaction, visual settlement, latency, restore, and cleanup;
- close every R8 TODO, regression record, temporary compatibility path, and
  source exception before deactivating recovery mode.

## Exact RTH Acceptance Sequence

The final browser gate must preserve this sequence as one stable regression
identity:

1. open a Session with two Panes and reset both;
2. make P1 maximally dense while P2 retains its own normal wall;
3. drag P1 rightward across a large historical span;
4. in ETH, locate a P1 market instant in P2 repeatedly and verify both Panes;
5. switch the Session to RTH through one atomic replacement;
6. drag and locate again in both target directions;
7. verify neither Pane returns to Session start, collapses left, loses its
   accepted wall, exposes future bars, or moves the shared Replay cursor;
8. inject delayed/reordered/failing participants and verify the same last
   accepted complete revision remains visible and persisted.

## Per-Step Gate

Each R8 commit must include:

- a clean start and clean end;
- implementation, catalog/manifest updates, positive evidence, negative
  controls, docs, TODO, and session evidence together when applicable;
- focused harnesses plus architecture boundary, architecture hardening, source
  quality, and `git diff --check`;
- no production behavior outside the named step;
- an explicit list of regressed rules repaired, still regressed, or newly
  discovered.

Recovery mode may be disabled only by R8.15 after all `regressed` rules return
to `accepted` with new recovery evidence and explicit human approval where the
catalog requires it.
