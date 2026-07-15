# V6 TODO

## Current State

Milestone stabilization Steps 438-454 are complete. Post-stabilization Steps
455-460 established explicit test classification, named canonical gates, and
exhaustive runners. Historical detail is archived or kept in the corresponding
session records.

Step 461 fixed the first validation vertical-slice order and constrained God
View, Pseudo-Live, and Live Reproduction to policies over shared owners.
Semantic Drawing's direction remains accepted with changes while its UI/write
path stays frozen.

Step 462 restored the 160 ms Replay/history latency gate through exact one-bar
cursor materialization and forward-cache reuse. Step 463 established immutable
playbook versions, campaign/trial lifecycles, and transactional IndexedDB
persistence without UI or Replay/chart/Bar Data coupling.

Step 464 added the Blind Trial Coordinator. It transactionally binds a pending
trial to public Replay session/cursor/visible-through provenance, resumes it
after IndexedDB reload, rejects mismatched or rewound Replay state, and never
mutates Replay. Canonical passed 14/14; exhaustive Node passed 398/398.

Step 465 added separate prospective observation and evidence artifacts,
atomically persisted with pane/timeframe/time-price and Replay no-future
provenance. It adds no overlay or Semantic Drawing write path.

Step 466 added an immutable prospective trade-plan revision with direction,
entry, stop, target, invalidation, and active trial/evidence references.

Step 467 added separate simulated execution/outcome facts, bounded R, and
mandatory `1m` within-minute ordering disclosure without tick-accuracy claims.

Step 468 added a read-only campaign summary and stable evidence drillback
descriptor. Automatic backward chart repositioning remains gated on a safe
navigation-owner contract; Analytics does not mutate Replay or source truth.

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

## Next Step — 469

Run Trial Acceptance only:

- exercise complete real trial records and persistence recovery;
- verify provenance, sample size, R, and raw evidence drillback integrity;
- decide or implement only the safe owner-level backward navigation contract
  required for automatic chart drillback;
- run human workflow/recording-friction acceptance and foundation regression;
- no ontology expansion, Semantic Drawing, broad dashboard, or mode shell.

After Step 469, perform the requested modularity/large-file audit before the
Validation Campaign Thin Slice milestone closes.

## Known Catalog Debt

- The canonical manifest is intentionally a named milestone gate set, while the
  catalog is exhaustive classification. Step 457 established explicit role
  metadata for infrastructure support and every TODO/INDEX historical snapshot;
  Step 458 completed explicit orchestration-runner metadata. Future non-gate
  roles must extend metadata rather than add source or filename heuristics.
- Test role/environment classification and exhaustive gate execution are now
  checked-in and metadata-driven. The named canonical runner remains
  intentionally smaller than the exhaustive catalog.
- The browser-local exhaustive environment contains 175 gates and is too costly
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
