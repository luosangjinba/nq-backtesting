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

## Next Step — 466

Implement Prospective Trade Plan only:

- persist direction, entry, stop, target, and invalidation separately from
  observation/evidence;
- require an active trial and prospective evidence reference;
- commit an immutable pre-result revision and distinguish later review edits;
- no execution/outcome, R, Analytics, Semantic Drawing, or mode shell.

Do not place trade-plan truth inside observation, Journal, Replay, drawing,
App, Shell, persistence-adapter, or route entry files.

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
