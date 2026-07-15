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
Cross-slice gates passed: canonical 14/14, exhaustive Node 411/411, and static
architecture 59/59. Replay/history measured 150.1 ms against the 160 ms gate.

Step 469 automated acceptance is complete. Campaign Summary now hands evidence
drillback to Replay Navigation, which safely rewinds all panes and removes
future bars through one shared replacement boundary. A real IndexedDB v4
two-trial recovery proved provenance, sample size, `+2R/-1R`, total/average R,
and raw drillback integrity. Canonical passed 14/14, exhaustive Node 413/413,
static architecture 59/59, app-shell browser passed, and Replay/history measured
85.8 ms against the unchanged 160 ms gate. Human workflow/friction acceptance
remains pending.

Step 469 human acceptance exposed a legacy Restart semantic mismatch. Restart now
enters an FXReplay-style Bar Replay selection mode, shows a blue marker, rejects
points outside the revealed session range, and truncates the selected candle plus
later candles through Replay rewind/shared replacement. Quick Session received a UI
pass; Session Home shed placeholder Analytics/fake progress. Visual review remains.
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

## Next Gate — Step 469 Human Acceptance

Use the real workflow to confirm recording friction, summary/R correctness,
same-session evidence return, no-future chart state across panes, and clear
cross-session rejection. Do not mark Step 469 fully accepted from automation.

After confirmation, Step 470 is the requested modularity/large-file audit before
the Validation Campaign Thin Slice milestone closes. It is an audit/planning
step, not authorization for new modes, Semantic Drawing, or business features.

## Known Catalog Debt

- Canonical is a named milestone set; the catalog is exhaustive metadata-driven
  classification. Extend role metadata instead of source/filename inference.
- The browser-local exhaustive environment contains 175 gates and is too costly
  for an implicit routine run. Use it deliberately until future work defines
  reviewed shards or budgets; do not weaken the canonical visible-latency gate.
- Historical tests remain for archaeology; they are not direction documents.
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
