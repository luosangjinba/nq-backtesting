# R8.4 Raw Coverage Lease Contract

Date: 2026-07-30

## Scope

R8.4 starts from clean R8.3 commit `60b92d93`. It defines the pure transaction-
scoped Raw Coverage Lease/read-view boundary and executable negative controls.
It does not activate the lease in Bar Data Runtime or remove Replay Workspace
UI retention; those are R8.5 responsibilities.

No existing production runtime, HTML, visible UI, or interaction behavior is
changed. The new production source is an independently runnable pure contract
module.

## Contract Result

`core.raw-coverage-lease-contract` establishes:

- complete branded Session/activation/transaction identity on every scope and
  read;
- finite request count, per-window span, and aggregate span;
- one exact provider/instrument/resolution/dataset source scope;
- ordered, non-overlapping raw request windows;
- synchronous, exact-window, callback-scoped read views;
- no raw batch stored on the scope, lease, or lifecycle snapshot;
- explicit active/cancelled/disposed state;
- synchronous AbortSignal cancellation and idempotent disposal;
- zero reads after cancellation, disposal, stale identity, or window mismatch.

The manifest now declares `rawMarketDataRetention` as a sole-writer surface
owned by `core.bar-data-runtime`. The production analyzer already enforces this
against real sources.

## Recovery State

H074 advances from `declared` to `executable`; it is deliberately not accepted.
The two existing UI retention findings and `BUG-V7-0002` stay blocking for
R8.5. All 15 R8.1 `regressed` rules remain regressed, and no later recovery rule
is cleared early.

Because this step has no visual or interaction change, it requires automated
evidence and a completion report rather than manual browser review.

## Automated Evidence

- `node v7/tests/raw-coverage-lease-contract-harness.js` — passed: positive
  scope/read/lifecycle evidence and 25 negative controls;
- `node v7/tests/production-architecture-harness.js` — passed: 43 modules, 102
  dependency edges, 103 construction sites, 10 observed writer sites, the same
  six blocking findings, and nine negative controls including a UI raw-
  retention writer outside Bar Data Runtime;
- `node v7/tests/production-module-assembly-harness.js` — passed: 43 public
  entries, 11 lifecycle descriptors, and the complete one-case optional-
  removal matrix;
- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/architecture-hardening-harness.js` — passed: 79 rules and 12
  negative controls;
- `node v7/tests/source-quality-harness.js` — passed: seven negative controls;
- `for test_file in v7/tests/*-harness.js; do node "$test_file" || exit $?;
  done` — all 72 top-level Harnesses passed, including real V4 API and Chrome
  gates;
- `git diff --check` — passed.

## Commit Gate

R8.4 is exactly one commit. Stop after committing and report the commit id,
automated evidence, six remaining production findings, clean worktree, and
R8.5 as the next bounded step.
