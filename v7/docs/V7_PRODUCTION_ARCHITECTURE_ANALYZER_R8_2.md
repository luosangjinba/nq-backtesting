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

The committed snapshot currently contains:

- 42 active production modules;
- 100 actual module dependency edges;
- 101 cross-module construction sites;
- two production HTML/JavaScript composition roots;
- all 14 declared writer surfaces;
- 10 directly observed critical writer sites;
- 13 blocking production findings.

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

### R8.3 — Descriptor, Lifecycle, Independent Harness

- `core.calendar-timeframe-domain` imports `core.bar-data-contract` without a
  declared port;
- `core.fixed-timeframe-domain` imports `core.bar-data-contract` without a
  declared port;
- `core.session-store` imports `core.replay-navigation-settings` without a
  declared port;
- `core.bar-data-runtime` returns `dispose()` while declaring no lifecycle;
- `core.provider-execution-runtime` returns `dispose()` while declaring no
  lifecycle;
- Replay Workspace UI and Session Browser UI name browser harnesses that boot
  `/v7/app/` instead of independently booting their public modules.

### R8.5–R8.9 — Writer Ownership

- Replay Workspace UI owns `display-history-ledger.js` and
  `source-batch-ledger.js`, retaining market data outside Bar Data Runtime;
- Replay Workspace UI owns mutable accepted Pane Workspace state;
- `workspace-execution.js` accepts Pane data and semantic visible state after
  the Workspace transaction has already returned `committed`.

### R8.11 — Production Composition

- `app/main.js` manually constructs its graph without ModuleHost;
- `app/data-acquisition.js` manually constructs its surface without ModuleHost.

No item above is repaired or accepted by R8.2.

## Negative Controls

Eight mutations prove the production analyzer rejects:

- internal cross-module imports;
- an actual dependency omitted from the descriptor;
- an actual dependency cycle;
- a returned lifecycle handle omitted from the descriptor;
- an independent harness changed to the application shell;
- another production root bypassing ModuleHost;
- a writer outside its declared owner;
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

R8.3 must reduce the seven findings assigned to it to zero and update the same
snapshot in its single commit. Later steps do the same for their assigned
writer/composition findings. Expanding `knownViolations` requires a new stable
bug identity and explicit human review; it can never be an incidental baseline
refresh.
