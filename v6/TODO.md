# V6 TODO

## Current State

Milestone stabilization Steps 438-454 are complete. This sequence repaired the
time-axis scaffold hot path, established a canonical test catalog, secured
persisted-data DOM rendering, reduced App/Shell/Chart Surface/runtime
composition pressure, moved governance probes out of production, centralized
time-presentation validation, and archived the historical working ledger.

Post-stabilization Steps 455-459 made the named milestone manifest executable,
triaged all failing root Node gates, and replaced role/environment inference
with explicit metadata. Historical snapshots, runners, browser tests, and
service-dependent tests now have reviewable classifications; detailed evidence
remains in the corresponding session records.

Step 460 made exhaustive catalog gates executable through a checked-in runner.
The catalog now classifies 761/761 files; exhaustive offline Node gates pass
380/380, both service environments pass 1/1, static gates pass 52/52, and the
named canonical suite passes 14/14. The 165 browser-local catalog gates remain
available as an explicit long-form run rather than an implicit routine gate.

Step 461 completed the post-stabilization product/foundation re-audit. The
chart/replay foundation is architecturally ready for one product thin slice,
but its canonical closeout exposed a repeated Manual Next latency failure:
219.2 ms and 188.3 ms against the existing 160 ms gate.
God View, Pseudo-Live, and Live Reproduction are constrained to policies over
shared owners, not separate runtimes. Semantic Drawing's shared semantic/plugin
direction is accepted with changes, while its UI/write path remains frozen.

The first post-foundation delivery order is now fixed by
`V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md`. Product implementation is
released in bounded order after Step 462 restored the latency gate; later Steps
remain independently reviewed and committed.

Step 462 attributed the canonical Manual Next failure to two near-serial window
loads. Same-timeframe cursor materialization now requests one exact bar and
reuses the source advance's forward cache. Five focused runs passed at
55.9–99.0 ms; canonical passed 14/14 with a 98.5 ms concurrency sample.

## Current Foundation Gates

- `node v6/tests/canonical-test-catalog-smoke.js`
- `node v6/tests/canonical-test-manifest-smoke.js`
- `node v6/tests/canonical-test-runner.js` (executes every named manifest gate)
- `node v6/tests/exhaustive-test-runner.js --environment=node`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/static-architecture-audit-step394.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Next Step — 463

Implement the validation domain spine only:

- minimal versioned contracts and lifecycle invariants for `playbookVersion`,
  `validationCampaign`, and `trial`;
- an explicit repository interface and migration-backed local persistence;
- create/get/list/reload and architecture gates;
- no production UI, mode shell, Semantic Drawing, order/outcome, or analytics.

Inspect existing persistence owners and contracts before choosing the
module/database boundary. Do not place this logic in App, Shell, Replay, chart,
or adapter entry files.

## Known Catalog Debt

- The canonical manifest is intentionally a named milestone gate set, while the
  catalog is exhaustive classification. Step 457 established explicit role
  metadata for infrastructure support and every TODO/INDEX historical snapshot;
  Step 458 completed explicit orchestration-runner metadata. Future non-gate
  roles must extend metadata rather than add source or filename heuristics.
- Test role/environment classification and exhaustive gate execution are now
  checked-in and metadata-driven. The named canonical runner remains
  intentionally smaller than the exhaustive catalog.
- The browser-local exhaustive environment contains 165 gates and is too costly
  for an implicit routine run. Use it deliberately until future work defines
  reviewed shards or budgets; do not weaken the canonical visible-latency gate.
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
