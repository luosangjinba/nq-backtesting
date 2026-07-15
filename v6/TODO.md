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

Step 469 technical acceptance is complete. Campaign Summary now hands evidence
drillback to Replay Navigation, which safely rewinds all panes and removes
future bars through one shared replacement boundary. A real IndexedDB v4
two-trial recovery proved provenance, sample size, `+2R/-1R`, total/average R,
and raw drillback integrity. Canonical passed 14/14, exhaustive Node 413/413,
static architecture 59/59, app-shell browser passed, and Replay/history measured
85.8 ms against the unchanged 160 ms gate. The acceptance harness writes the
domain chain directly; the workstation does not yet expose a complete Campaign
recording or R-statistics UI, so no human workflow/friction claim is made.

Exploratory Replay use exposed a legacy Restart semantic mismatch. Restart now
enters an FXReplay-style Bar Replay selection mode, shows a blue marker, rejects
points outside the revealed session range, and truncates the selected candle
plus later candles through Replay rewind/shared replacement. Quick Session/Home
received a UI pass; its Session Summary/Stats surface is not Validation Campaign
analytics.
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

## Next Gate — Step 470 Modularity Audit

Audit large and mixed-responsibility V6 files before selecting the next product
implementation phase. Record ownership risks and bounded split candidates; do
not infer authorization for new modes, Semantic Drawing, Campaign UI, or other
business features from this audit.

The future Validation Campaign UI phase must implement the real recording and
summary workflow before recording friction, sample/R presentation, or human
drillback comprehension can be accepted.

## Required Before Milestone Close — ETH/RTH Session Hours

`v6/docs/V6_ETH_RTH_SESSION_HOURS_PHASE_PLAN.md` is a blocking pre-milestone
capability. The earlier ETH control was removed because it was an inert shell
placeholder; implementation must establish a real Session Hours owner and
integrate eligible-bar semantics with Replay, Chart Data, timeframe projection,
persistence, and evidence provenance.

After Step 470, execute ETH/RTH Phases A-F before starting multi-instrument
panes. Do not close the next product milestone while this gate remains open.

## Planned Capability — Multi-Instrument Panes

`v6/docs/V6_MULTI_INSTRUMENT_PANE_PHASE_PLAN.md` records the accepted delivery
shape for pane-local Session instruments over one shared Replay clock. It is
valuable for NQ/ES intermarket and SMT review, but does not preempt Step 470.

When the current milestone gates permit new chart-foundation work, begin with
ETH/RTH first. After its acceptance gate passes, begin multi-instrument Phase A
contract/gap semantics. Do not start from the symbol picker, do not allow assets
outside `session.symbols`, and do not create per-pane Replay cursors.

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
