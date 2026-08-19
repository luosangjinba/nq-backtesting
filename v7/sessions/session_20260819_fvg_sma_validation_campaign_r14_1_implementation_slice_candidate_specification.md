# Session — FVG + SMA Validation Campaign R14.1/H121 Implementation-Slice Candidate

Date: 2026-08-19

Time: 03:02–03:10 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Starting commit: `161a818e`

Scope: documentation-only implementation-slice candidate and governance sync;
no allocation, Harness registration, or production implementation

## Product-Owner Authority

The accepted parent specification required separate authority before drafting
its implementation slice. The product owner then stated:

> 授权以上动作

In context, “以上动作” is the previously stated next action: draft the
implementation-slice specification for the accepted FVG + SMA Validation
Campaign / Study Case Demo. This session does not interpret that instruction as
authority to implement production code.

## Scope Preserved

This candidate uses only the already accepted production capabilities:

- `first-party.fair-value-gap@1.0.0` and its manually accepted
  `imbalance.fvg@1.0.0` Artifact path;
- `first-party.moving-averages@1.0.0` and exact
  `moving-averages.sma.close@1.0.0` Definition;
- existing Session, Workspace Transaction, Replay, Bar Data, Chart,
  persistence, and Server State Sync owners.

It starts no other plugin or algorithm, P1c.4, P1b.4, Community/Worker,
Journal, Dataset Builder, AI, Dashboard, Chart dataset application, visual
grammar, text, or Setup-free Phenomenon Study. H117 remains executable,
human-review-required, and unaccepted.

## Current Capability And Ecosystem Check

Before specifying a chart/workstation-facing slice, the review checked current
official Lightweight Charts 5.2 plugin and `IChartApi` documentation, the
official repository plugin examples, and the awesome-tradingview inventory.
The local agent-reach GitHub backend lacked GitHub authentication and its Exa
backend lacked an API key, so the same public sources were read through the
available Jina Reader web backend; no dependency or repository content was
downloaded into V7.

The result is bounded: current upstream extension points provide Custom Series
and Series/Pane Primitives, but no Campaign/StudyCase/Cohort/evidence workflow.
Official examples are proof-of-concept rendering references, not an accepted
business owner. No external package can replace V7's no-future provenance,
source-removal survival, raw-context drill-down, or sole-writer boundaries.
Therefore this candidate reuses existing owners and adds no native chart
object, renderer, data requester, chart synchronizer, or second writer.

Sources checked:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

## Candidate Result

The new candidate at
`../docs/V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_R14_1_IMPLEMENTATION_SLICE_SPEC.md`
proposes:

- unallocated review labels `R14.1` and H121, with the earlier possible
  P1c.4/H121 shorthand superseded before allocation and P1c.4 left separately
  unnumbered;
- exactly eight removable modules and one sole Validation Campaign writer;
- two generic public-only evidence adapters, with no Campaign branch inside
  either source plugin and no source mutation by Campaign;
- strict canonical V1 schemas for Campaign index/document, Definitions,
  Evidence Citations, immutable Case revisions, Cohorts, Analysis Runs,
  Source Verifications, raw-context intents, and audit export;
- exact commands, CAS/cancellation/currency fences, storage keys, resource
  ceilings, hydration/removal behavior, diagnostics, and poison isolation;
- one no-future directional first-touch Outcome algorithm with explicit same-
  Bar ambiguity, deterministic MFE/MAE, and no fill/P&L inference;
- frozen Cohort and Analysis lineage with exact denominators, Case-member
  drill-down, and source-unavailability disclosure;
- bounded Campaign UI only, with raw context opened through existing owners and
  no MEMO-V7-005 Dashboard or Chart-applied dataset behavior;
- deterministic audit JSON and explicit privacy/rights exclusions; and
- fourteen automated H121 evidence groups plus a ten-step focused human gate.

## Ten Decisions Await Review

The candidate closes no decision. Product-owner review is required for:

1. proposed R14.1/H121 label use;
2. exact eight-module removable ownership;
3. strict records, immutable revisions, keys, and ceilings;
4. generic asymmetric evidence preparation/currency fence;
5. no-future Case and Outcome semantics;
6. frozen Cohort analytics and drill-down;
7. local-first CAS/state-sync/hydration behavior;
8. bounded UI and explicit MEMO-V7-005 exclusion;
9. automated, browser, performance, security, and human gates; and
10. continued candidate-only non-implementation authority.

## Governance Synchronization

Updated:

- parent accepted specification with a subsequent-candidate link;
- TODO;
- documentation index;
- execution roadmap;
- task numbering;
- restart handoff;
- non-decision/adjacent-candidate registry;
- architecture manifest documentation metadata;
- parent specification-acceptance session with a later-candidate pointer; and
- this durable session record.

Not changed:

- `v7/docs/v7-harness-rules.json`;
- `v7/src/`, `v7/app/`, `v7/tests/`, deployment, server, fixture, generated
  Developer Kit, source-quality baseline, plugin manifest, or state-sync
  allowlist files;
- H117, H118, H119, or H120 status/evidence.

## Verification

The documentation-only candidate passed:

- `git diff --check`;
- architecture-manifest and Harness-registry JSON parsing;
- explicit changed-path check proving no `v7/src`, `v7/app`, `v7/tests`,
  `v7/server`, deployment, or `v7-harness-rules.json` change and no H121 row;
- `node v7/tests/architecture-hardening-harness.js` — 120 rules and 15
  negative controls;
- `node v7/tests/architecture-boundary-harness.js`;
- `node v7/tests/production-architecture-harness.js` — 76 modules, 174 edges,
  143 construction sites, 31 writer sites, zero blocking findings, and 15
  negative controls;
- `node v7/tests/production-module-assembly-harness.js` — 76 public entries,
  33 lifecycle modules, and 53 optional-removal cases;
- `node v7/tests/production-writer-closure-harness.js` — 25 surfaces, 31
  observed writer files, and 8 negative controls;
- `node v7/tests/deployed-runtime-architecture-harness.js`;
- `node v7/tests/source-quality-harness.js` — 582 production files, 558 public
  exports, and 22 negative controls;
- `node v7/tests/server-state-sync-harness.js`;
- `node v7/tests/production-manual-fvg-workflow-browser-harness.js` — accepted
  production manual FVG path and six negative controls;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed;
- `node v7/tests/local-plugin-package-harness.js` — H117 passed all 54 frozen
  negative controls while remaining executable, human-review-required, and
  unaccepted;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passed and
  reported H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passed
  22 negative controls and exact reversible Main/internal projection evidence;
  and
- `node v7/tests/core-moving-averages-harness.js` — accepted H120 formula,
  transaction, production-browser, timeframe-replacement, and four-Pane
  evidence passed while reporting H117 unchanged.

No generated Developer Kit, fixture, screenshot, Harness registry,
architecture/source-quality baseline, plugin, or state-sync allowlist was
refreshed.

## Exact Next Boundary

Review decisions 1–10 in the candidate. R14.1/H121 remain proposed but
unallocated/unregistered. Even acceptance of all ten decisions would authorize
documentation only; a later explicit implementation instruction is required
before production modules, schemas, routes, storage/state-sync allowlists,
fixtures, Harness registration, or implementation can begin.
