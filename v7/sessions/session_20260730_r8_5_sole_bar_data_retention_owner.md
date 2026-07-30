# R8.5 Sole Bar Data Retention Owner

Date: 2026-07-30

## Scope

R8.5 starts from clean R8.4 commit `f3d0feed`. It activates the bounded Raw
Coverage Lease through Bar Data Runtime, removes every Replay Workspace UI raw
retention path, and closes only the two production findings assigned to R8.5.

No HTML, styling, visible UI, or interaction behavior changes. Per the standing
workflow, this step uses automated evidence and requires no human UI review.

## Implementation Result

- Bar Data Runtime privately owns exact LRU, accepted/staged/transient raw
  coverage, coverage synthesis, transaction promotion/rejection, inactive-Pane
  release, and disposal;
- raw coverage is finite by consumer count, window count, per-window span, and
  aggregate span;
- Pane projection receives only transaction-bound revocable lease handles and
  consumes raw batches inside synchronous callbacks;
- Replay source traversal derives target evidence inside ephemeral read-view
  callbacks;
- caller cancellation cannot acquire a stale lease, while a shared late
  provider completion may populate only the owner cache;
- `source-batch-ledger.js`, `display-history-ledger.js`, UI cached source reads,
  and their direct tests are removed;
- projected display history composition is a pure Projection Domain operation
  over the accepted semantic snapshot;
- H074 advances from `executable` to `accepted` without clearing any later R8
  regression rule.

## Architecture Result

The refreshed exact production baseline contains:

- 43 active production modules;
- 105 actual dependency edges;
- 109 construction sites;
- two production roots;
- 15 declared writer surfaces;
- nine observed critical writer sites;
- one raw-retention writer, owned by `core.bar-data-runtime`;
- four remaining blocking findings assigned to R8.6, R8.9, and R8.11.

## Automated Evidence

- `node v7/tests/bar-data-coverage-lease-harness.js` — passed: bounds, exact-
  LRU eviction/coverage reuse, history extension, rejection, inactive consumer
  release, delayed cancellation/cache recovery, and disposal;
- `node v7/tests/raw-coverage-lease-contract-harness.js` — passed: 25 negative
  controls;
- `node v7/tests/projected-history-composition-harness.js` — passed;
- `node v7/tests/replay-step-source-traversal-harness.js` — passed;
- `node v7/tests/production-architecture-harness.js` — passed: 43 modules, 105
  edges, 109 construction sites, nine writer sites, four findings, nine
  negative controls;
- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/production-module-assembly-harness.js` — passed: 43 public
  entries, 11 lifecycle descriptors, complete optional-removal matrix;
- `node v7/tests/source-quality-harness.js` — passed: seven negative controls;
- the complete top-level harness loop — all 72 harnesses passed, including real
  V4 API and Chrome workspace/history/restore/performance gates;
- `git diff --check` — required at final commit gate.

## Commit Gate

R8.5 is exactly one commit. Stop after committing and report the commit id,
automated evidence, four remaining findings, clean worktree, and R8.6 as the
next bounded step.
