# Session — FVG + SMA Validation Campaign R14.1/H121 Implementation-Slice Specification Acceptance

Date: 2026-08-19

Time: 03:54 PDT

Branch: `feature/v7-drawing-semantic-annotation`

Starting commit: `9b0824c2`

Scope: accept all ten implementation-slice decisions without amendment;
documentation and governance synchronization only

## Product-Owner Decision

The product owner stated:

> R14.1/H121 候选规格 1–10 全部接受。

This accepts decisions 1–10 in
`../docs/V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_R14_1_IMPLEMENTATION_SLICE_SPEC.md`
without amendment.

## Accepted Outcome

The accepted implementation specification binds:

- proposed `R14.1`/H121 labels for this exact slice once a later implementation
  instruction allocates them, while keeping P1c.4 separate and unnumbered;
- exactly eight removable modules, one sole Campaign writer, public-only
  evidence adapters, and complete removal without changing FVG/SMA/Replay;
- strict canonical V1 Campaign, Definition, Citation, immutable Case revision,
  Cohort, Analysis, Verification, raw-context intent, and audit schemas;
- exact commands, CAS/cancellation/source-currency fences, storage keys,
  resource ceilings, stable diagnostics, and Campaign-only poison isolation;
- asymmetric and degradable FVG/SMA evidence capture without reverse plugin
  dependency, source mutation, fallback, or historical deletion;
- the exact no-future first-touch Outcome policy, explicit same-Bar ambiguity,
  deterministic MFE/MAE and time-to-touch, and no fill/P&L inference;
- frozen finalized Case-revision Cohorts, deterministic statistics with exact
  denominators, source-unavailability disclosure, and member drill-down;
- local-first persistence plus separately allowlisted reuse of existing whole-
  state sync, with no second client or silent merge;
- bounded Campaign UI/raw-context intents and deterministic local audit JSON,
  while excluding all MEMO-V7-005 Dashboard/Chart-application/visual work; and
- proposed H121 automated, production-browser, security, performance,
  regression, and ten-step focused-human acceptance evidence.

## Preserved Non-Implementation Boundary

Accepted decision 10 remains binding. This acceptance:

- does not allocate R14.1 or H121 and adds no H121 Harness-registry row;
- authorizes no implementation plan, production schema, module, command,
  storage key, state-sync allowlist, route, UI, export, fixture, or test code;
- changes neither FVG nor SMA and starts no other plugin or algorithm;
- does not start P1c.4, P1b.4, Community/Worker, Journal, Dataset Builder, AI,
  Dashboard, multi-dataset Chart application, visual grammar, text, or Setup-
  free Phenomenon Study;
- leaves MEMO-V7-005's seventeen product decisions open and unimported; and
- leaves H117 `executable`, human-review-required, unaccepted, and otherwise
  unchanged.

## Documentation Updated

- the accepted R14.1/H121 implementation-slice specification;
- its accepted parent Demo specification;
- TODO, documentation index, execution roadmap, task numbering, restart
  handoff, non-decision/adjacent-candidate registry, and architecture-manifest
  documentation status;
- the candidate and parent acceptance sessions with subsequent-acceptance
  pointers; and
- this durable acceptance record.

No production or Harness-registry file was changed.

## Verification

The documentation-only acceptance passed:

- `git diff --check`;
- architecture-manifest and Harness-registry JSON parsing;
- changed-path verification proving no production/test/deployment/state-sync
  implementation or `v7-harness-rules.json` change and no H121 row;
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
  H114 production workflow and six negative controls;
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
architecture/source-quality baseline, plugin, production route, or state-sync
allowlist was refreshed.

## Exact Next Boundary

No production work is authorized. The next possible action is a separate
explicit product-owner instruction to allocate and implement only the accepted
R14.1/H121 slice. That later instruction would register H121 as executable,
human-review-required, and initially unaccepted. Automated passage and the
focused human gate would both be required before R14.1/H121 could close.
