# R8.8 Reversible Chart Application

Date: 2026-07-30

## Scope

R8.8 starts from clean R8.7 commit `518eab82`. It activates the Chart role of
the R8.7 Prepared Commit contract and does not coordinate Replay, Workspace
State, publication, or persistence; that remains exactly R8.9.

The successful UI, visuals, controls, gestures, and chart semantics are
unchanged. Automated recovery evidence is sufficient under the standing
workflow, so no manual UI review is required.

## Implementation Result

- Chart Snapshot Application now exposes a branded prepared handle with
  prepare/apply/rollback/finalize/dispose phases;
- reversible apply proves real painted visibility while leaving the accepted
  Chart snapshot and revision unchanged;
- adapter receipts must equal the exact prepared target revision;
- single-Pane Lightweight Charts state restores series, future axis, OHLC,
  scales, metadata, presentation, and revision;
- Pane-set apply retains the prior child adapters and DOM surface until exact
  finalize;
- Pane surface rollback restores prior membership, active/empty state, and
  maximize state before any removed child is released;
- finalize publishes accepted Chart state once and only then releases removed
  Pane adapters/hosts;
- legacy `present()` delegates through the same lifecycle pending R8.9 global
  coordination.

## Architecture Result

The refreshed production baseline contains:

- 45 active production modules;
- 115 actual dependency edges;
- 113 construction sites;
- two production roots;
- 15 declared writer surfaces;
- nine observed critical writer sites;
- three unchanged blocking findings assigned to R8.9 and R8.11.

## Automated Evidence

- `node v7/tests/chart-snapshot-application-harness.js` — passed with the
  explicit prepared lifecycle plus 15 existing negative/race controls;
- `node v7/tests/pane-set-materialization-harness.js` — passed with 23 existing
  controls and Replay/Workspace State/publication rollback cases;
- `node v7/tests/lightweight-chart-adapter-browser-harness.js` — passed with
  real v5.2.0 painted prepared rollback;
- `node v7/tests/production-architecture-harness.js` — passed: 45 modules,
  115 dependency edges, 113 construction sites, nine writer sites, three
  blocking findings, and nine negative controls;
- architecture boundary/hardening, production module assembly, source quality,
  Replay Navigation, Replay Pane Workspace, and Replay Layout Workspace gates
  passed;
- the complete 73-file top-level Harness loop passed;
- `git diff --check` passed.

## Rule Lifecycle

- H056 `review-p1-market-identity-and-visible-rollback`: `regressed` →
  `accepted` with new R8.8 recovery evidence;
- H076 remains `executable`, because global four-participant atomicity belongs
  to R8.9;
- 13 later recovery rules remain regressed.

## Commit Gate

R8.8 is exactly one commit. Stop after committing and report the commit id,
automated evidence, three remaining production findings, clean worktree, and
R8.9 as the next bounded step.
