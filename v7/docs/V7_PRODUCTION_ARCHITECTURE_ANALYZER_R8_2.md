# V7 Production Architecture Analyzer — R8.2

Status: binding executable recovery gate (2026-07-30)

## Purpose

R8.2 replaces architecture confidence based on descriptors, hand-maintained
writer inventories, and toy assembly fixtures with a deterministic scan of the
actual V7 production tree. It does not repair the findings. It makes every
current finding explicit, blocking, assigned to a numbered recovery step, and
detectable when production changes.

The machine-readable baseline is
`v7-production-architecture-baseline.json`. The executable implementation is
split between `tests/support/production-architecture-analyzer.js` and
`tests/support/production-architecture-validator.js`, exercised directly by
`tests/production-architecture-harness.js` and by the main Architecture Boundary
Harness.

## Production Evidence Read

The analyzer reads, rather than trusts a fixture to represent:

- every descriptor in `activeProductionModules`;
- every JavaScript file under each active module directory;
- all static cross-module imports and whether they use the target `public.js`;
- descriptor required/optional ports versus actual import dependencies;
- returned `dispose()` sites versus descriptor lifecycle declarations;
- every descriptor's named independent harness, including whether it boots the
  application shell, imports the public entry directly, or reaches it through
  a dedicated browser fixture;
- every module factory imported and invoked across a module boundary;
- every HTML module-script production entry and whether it boots through
  `core.module-host`;
- the complete manifest writer inventory plus critical source writer probes for
  Chart series, provider requests, Replay cursor, Workspace snapshot, retained
  market data, and mutable Pane Workspace state.

Actual dependency cycles, internal cross-module imports, descriptor drift,
unhosted production roots, app-shell “independent” harnesses, and writers
outside the declared owner are violations.

## Exact Baseline

The exact snapshot was refreshed by R8.7 after activating the prepared commit
contract descriptor. It currently contains:

- 45 active production modules;
- 114 actual module dependency edges;
- 112 cross-module construction sites;
- two production HTML/JavaScript composition roots;
- all 15 declared writer surfaces;
- nine directly observed critical writer sites;
- three blocking production findings, down from the 13 first recorded by R8.2.

The full arrays are committed, not summarized away behind counts. Any module,
owner, import site, public boundary, construction site, lifecycle observation,
independent-harness mode, composition root, or writer site change produces
`production-snapshot-drift` until the same bounded recovery commit updates and
explains the baseline.

The baseline is not an allowlist of acceptable architecture. Its
`knownViolations` must exactly equal current analyzer output and every item must
carry a stable BUG id plus future R8 repair step. A new violation cannot be
hidden by an old violation with the same code because subjects are unique and
the full finding objects are compared.

## Current Blocking Findings

### R8.9 — Writer Ownership

- `workspace-execution.js` accepts Pane data and semantic visible state after
  the Workspace transaction has already returned `committed`.

### R8.11 — Production Composition

- `app/main.js` manually constructs its graph without ModuleHost;
- `app/data-acquisition.js` manually constructs its surface without ModuleHost.

R8.6 removes the UI accepted Pane ledger and leaves one detected Pane Workspace
writer inside `core.workspace-state-runtime`. The three items above remain
blocking.

## R8.3 Repair Result

R8.3 removed all seven findings assigned to it:

- Fixed Timeframe and Calendar Timeframe now declare their Bar Data contract
  dependency;
- Session Store now declares its Replay Navigation Settings dependency;
- Bar Data Runtime and Provider Execution Runtime now declare their returned
  `dispose()` lifecycle;
- Replay Workspace UI boots its public entry directly in a headless harness;
- Session Browser UI boots its public entry through a dedicated fixture with
  Replay Workspace UI absent.

The production descriptor assembly imports all 42 real public entries, boots
the descriptor graph through ModuleHost, disposes all 10 declared lifecycle
modules exactly once in reverse assembly order, and proves the complete current
optional-removal matrix. There is one declared optional edge: Session Browser
UI must boot without Replay Workspace UI. Production application factories and
the two real HTML composition roots remain deliberately assigned to R8.11.

## R8.4 Contract Result

R8.4 adds `core.raw-coverage-lease-contract` through public dependencies on the
Raw Bar Data and complete Workspace Transaction identity contracts. The module
defines finite same-source request scopes, synchronous callback-scoped reads,
and cancellable/disposable access without storing raw batches.

The manifest now declares `rawMarketDataRetention` as the fifteenth sole-writer
surface, owned only by `core.bar-data-runtime`. The existing production scanner
continues to report the two Replay Workspace UI ledgers as R8.5 violations.
R8.4 therefore adds a contract and executable rule without reducing or
expanding the six-item blocking inventory.

## R8.6 Semantic State Result

R8.6 adds `core.workspace-state-runtime`, moves accepted Pane Workspace,
Session Hours, semantic Viewport controllers, and checkpoint construction out
of Replay Workspace UI, and binds each aggregate snapshot to complete Session,
activation, transaction, and runtime revision identity. The Pane writer probe
now identifies the runtime factory as the sole allowed writer. The R8.6
finding is closed; the R8.9 post-terminal UI publication finding remains.

## R8.7 Prepared Commit Contract Result

R8.7 adds `core.prepared-commit-contract`, with one declared dependency on the
complete Workspace Transaction identity contract. It defines exact branded
prepare/apply/rollback/finalize evidence for Chart, Replay, Workspace State,
and publication, but does not yet activate any participant or add a production
writer. The three R8.9/R8.11 findings therefore remain unchanged, as required.

## Negative Controls

Nine mutations now prove the production analyzer rejects:

- internal cross-module imports;
- an actual dependency omitted from the descriptor;
- an actual dependency cycle;
- a returned lifecycle handle omitted from the descriptor;
- an independent harness changed to the application shell;
- another production root bypassing ModuleHost;
- a writer outside its declared owner;
- raw market-data retention in a UI module outside Bar Data Runtime;
- production construction drift while older fixture evidence remains unchanged.

These controls operate on the production-derived snapshot. The positive path
always scans real production first; the fixtures cannot substitute for that
scan.

## Boundaries And Follow-Up

This analyzer is deliberately static and deterministic. It reads explicit ESM
imports, explicit module-script entries, factory calls, lifecycle shapes, and
named critical writer probes. Dynamic runtime failure atomicity remains owned
by R8.7–R8.9 and the production cross-product/browser matrix remains owned by
R8.14–R8.15.

R8.3 reduced its seven assigned findings to zero. R8.4 updates the snapshot for
its new pure module while intentionally retaining all six later-step findings.
Later steps must reduce their assigned writer and composition findings to zero.
Expanding `knownViolations` requires a new stable bug identity and explicit
review; it can never be an incidental baseline refresh.
