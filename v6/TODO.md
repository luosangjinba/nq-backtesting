# V6 TODO

## Current State

Milestone stabilization Steps 438-454 are complete. This sequence repaired the
time-axis scaffold hot path, established a canonical test catalog, secured
persisted-data DOM rendering, reduced App/Shell/Chart Surface/runtime
composition pressure, moved governance probes out of production, centralized
time-presentation validation, and archived the historical working ledger.

Post-stabilization Step 455 made the named milestone manifest executable as one
canonical runner. The manifest now truthfully declares named milestone gates,
while the catalog separately declares exhaustive classification rather than
implying exhaustive execution.

Step 456 then audited all 27 failing root Node gate tests outside that named
manifest: 22 current contracts were refreshed without production changes, five
superseded phase assertions were explicitly quarantined with successor
coverage, and the remaining root Node gate set passed 366/366.

Step 457 replaced the remaining TODO/INDEX source-text support heuristic with
explicit role metadata. Of 155 affected tests, one remains the current-ledger
gate and 154 completed-phase snapshots are explicitly quarantined. The catalog
now classifies 751/751 JavaScript files, while root Node gates pass 371/371 and
the named canonical suite passes 14/14.

The product freeze used by this milestone is now released for planning only.
Implementation of the three operating modes, Semantic Drawing, or other new
business capability still requires an explicit reviewed decision; it is not an
automatic next Step.

## Current Foundation Gates

- `node v6/tests/canonical-test-catalog-smoke.js`
- `node v6/tests/canonical-test-manifest-smoke.js`
- `node v6/tests/canonical-test-runner.js` (executes every named manifest gate)
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/static-architecture-audit-step394.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Next Decision

Perform a short post-stabilization product/foundation re-audit before selecting
new implementation. The decision should compare:

1. remaining chart-foundation usability gaps;
2. shared infrastructure required by the proposed three modes;
3. the reviewed Semantic Drawing plugin specification;
4. Journal/Backtesting validation-loop priorities.

Do not start a mode or plugin implementation from this TODO alone.

## Known Catalog Debt

- The canonical manifest is intentionally a named milestone gate set, while the
  catalog is exhaustive classification. Step 457 established explicit role
  metadata for infrastructure support, orchestration runners, and every
  TODO/INDEX historical snapshot; future non-gate roles must extend that
  metadata rather than add source or filename heuristics.
- Historical static/readiness/selection tests remain available for targeted
  archaeology but are not product direction documents.

## Archive

- `v6/archive/TODO_THROUGH_STEP453.md`: complete historical working ledger.
- `v6/archive/DOCS_INDEX_THROUGH_STEP453.md`: complete pre-closeout docs index.
- `v6/sessions/`: step evidence; use only for targeted lookup.

## Rules

- Read `v6/docs/INDEX.md` and the required direction/architecture/roadmap docs
  before V6 work.
- Preserve runtime/data/Replay/chart ownership boundaries.
- Keep each Step independently verified and committed.
- Check existing Lightweight Charts and awesome-tradingview capabilities before
  custom chart/workstation implementation.
