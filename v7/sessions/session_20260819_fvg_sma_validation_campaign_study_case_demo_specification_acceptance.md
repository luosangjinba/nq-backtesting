# Session — FVG + SMA Validation Campaign / Study Case Demo Specification Acceptance

Date: 2026-08-19

Time: 02:39 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Scope: accept all ten material decisions without amendment; documentation and
governance synchronization only

## Product-Owner Decision

The product owner stated:

> V7_FVG_SMA_Validation_Campaign_Study_Case_Demo_SPEC的十项决策审核通过

This accepts decisions 1–10 in
`../docs/V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_DEMO_SPEC.md` without
amendment.

## Accepted Outcome

The accepted business/product/architecture specification binds:

- one tracer bullet using only the accepted
  `first-party.fair-value-gap@1.0.0` and
  `first-party.moving-averages@1.0.0`/SMA(close) capabilities;
- the selected `ValidationCampaign`, versioned Setup/Outcome Definition,
  immutable Evidence Citation, `StudyCase`, frozen `StudyCohort`, deterministic
  `AnalysisRun`, and append-only Source Verification records;
- asymmetric and degradable independence: plugins never depend on or receive
  commands from Campaign, while an exact Setup may require public provider
  evidence for new capture;
- frozen decision-time evidence and strict separation from later Outcome;
- no-loss provider disable, uninstall, absence, reinstall, and incompatible-
  version behavior;
- the one exact `demo.sma-trend-manual-fvg@1.0.0` Setup with template-local
  Context/Execution Pane roles, ready SMA(close,20), manually accepted
  direction-aligned FVG, and explicit human qualification;
- the one first-touch path Outcome policy with honest same-Bar ambiguity and no
  fill, P&L, partial, optimization, or profitability claim;
- immutable Cohorts, exact denominators, source-availability disclosure, and
  drill-down through existing Session/Workspace/Replay owners;
- one removable local-first Campaign owner, read-only evidence adapters,
  reversible separately allowlisted persistence/state sync, and bounded audit
  export rather than Dataset Builder.

## Preserved Non-Authorization Boundary

Accepted decision 10 remains binding. This acceptance:

- allocates no delivery or Harness id and does not allocate P1c.4/H121;
- authorizes no implementation-slice specification and no production schema,
  command, runtime, persistence, state-sync, UI, export, fixture, or Harness
  change;
- changes neither the FVG nor SMA plugin and starts no other plugin or
  algorithm;
- does not start P1b.4, Community/Worker, Journal, Dataset Builder, AI, or any
  other business workflow;
- leaves H117 `executable`, human-review-required, unaccepted, and otherwise
  unchanged;
- does not accept or import MEMO-V7-005's seventeen open Dashboard, Chart-
  application, SetupVisualGroup, visual-grammar/text, or Setup-free Phenomenon
  Study decisions.

## Documentation Updated

- the accepted Demo specification;
- TODO, documentation index, execution roadmap, task numbering, restart
  handoff, and non-decision/adjacent-candidate registry;
- this durable specification-acceptance record.

No production or Harness registry file was changed.

## Verification

The documentation-only acceptance passed:

- `git diff --check`;
- architecture manifest JSON parse;
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
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed;
- `node v7/tests/local-plugin-package-harness.js` — H117 passed all 54 frozen
  negative controls plus contract, transaction, storage, unpacked-security,
  and real-browser product evidence while remaining unaccepted;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passed and
  reported H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passed
  with exact reversible Main/internal Plot projection evidence;
- `node v7/tests/core-moving-averages-harness.js` — accepted H120 formula,
  transaction, production-browser, timeframe-replacement, and four-Pane
  evidence passed while reporting H117 unchanged.

No generated Developer Kit, fixture, Harness registry, architecture, or source-
quality baseline was refreshed.

## Exact Next Boundary

No repository-changing implementation is authorized. The next possible action
is a separate product-owner instruction to draft the implementation-slice
specification. That future specification must allocate and define the bounded
delivery/Harness, exact public records and commands, ownership modules,
persistence/state-sync ceilings, failures and transactions, automated evidence,
browser fixture, performance budgets, and focused human gate. It must be
accepted before a later explicit implementation instruction can change
production code.
