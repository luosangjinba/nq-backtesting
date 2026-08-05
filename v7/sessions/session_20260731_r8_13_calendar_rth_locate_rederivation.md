# Session — R8.13 Calendar Capability And RTH Locate Re-derivation

Date: 2026-07-31

## Scope

Started from the clean R8.12 commit `f62db2b9`. This step re-derived only the
calendar capability-extension boundary and the dense RTH Pane-location
preservation assigned to R8.13. It did not enter the R8.14 matrix or grant the
R7.3n/R7.3o human acceptance reserved for R8.15.

## Delivered

- Split fixed and calendar timeframe policy construction into versioned
  registered contributions at the composition boundary.
- Added a policy-family-agnostic registry for alignment identities,
  definitions, replacement entries, menus, history planning, and optional
  Replay steps.
- Proved a synthetic third-party timeframe registers without adding a concrete
  capability branch or importing calendar code into existing core owners.
- Bound the dense non-target preservation rule to Bar Data Runtime's accepted
  coverage leases, with no Pane/UI raw ledger or escaped batch.
- Extended the real Chrome gate through two Pane resets, dense P1 history,
  repeated ETH Locate, atomic RTH replacement, bidirectional RTH Locate, stable
  Pane walls, and unchanged Replay.
- Moved H019 and H066 from `regressed` to `executable` and activated H078 as
  `executable`; three R8.14 regressions remain.
- Current exact production evidence is 309 files, 23,073 effective lines,
  2,467 functions, 306 public exports, 48 modules, 125 dependency edges, 115
  construction sites, eight writer sites, and zero findings.

## Verification

- `node v7/tests/timeframe-capability-registry-harness.js`
- `node v7/tests/calendar-timeframe-domain-harness.js`
- `node v7/tests/bar-data-coverage-lease-harness.js`
- `node v7/tests/calendar-timeframe-browser-harness.js`
- `node v7/tests/replay-multi-pane-rth-history-browser-harness.js`
- architecture boundary, hardening, production architecture, source quality,
  ModuleHost, Replay Workspace composition, and focused owner Harnesses
- complete `v7/tests/*-harness.js` inventory with the configured V4
  market-data database
- `git diff --check` immediately before commit

The complete Harness inventory passed. One initial Replay Workspace run
crossed the unchanged 400 ms switch ceiling during host-load jitter, then
passed at 364.5 ms and 390.6 ms without changing the budget or code. A later
sequential run received one empty V4 response; the service remained healthy,
and the failed Layout gate plus every remaining Harness passed after restarting
the test-owned API. Final 100-sample Next evidence was p95 65.9 ms, p99 69.1
ms, and max 88.7 ms.

## Acceptance Boundary

Automated evidence restores executable protection but cannot grant human
acceptance. R7.3n/R7.3o remain awaiting review, R8 recovery mode stays active,
and R8.14 is not started by this commit.
