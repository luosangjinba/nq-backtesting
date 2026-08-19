# Session — FVG + SMA Validation Campaign / Study Case Business Demo Candidate

Date: 2026-08-18

Branch: `feature/v7-drawing-semantic-annotation`

Status: documentation-only candidate completed; ten material decisions await
product-owner review; no delivery/Harness id allocated and no implementation
authorized

## Product-Owner Authority

The proposed bounded instruction was:

> 授权起草“FVG + SMA Validation Campaign / Study Case 业务垂直 Demo”候选规格；
> 仅使用现有 FVG 与 SMA，不新增插件或算法，不实施 P1c.4、P1b.4、
> Community/Worker 或 AI，先定义 Setup → Case → Outcome → Cohort →
> 统计回钻与导出的最小闭环。

The product owner replied:

> 同意以上授权，还想提个问题：业务层是否会影响插件生产使用，它们是否完全独立运行，
> 不相互依赖，如果拆除某个业务流程使用的插件，会发生什么？

This authorized the candidate and this durable drafting record only.

## Direct Dependency Answer

The selected boundary is asymmetric and degradable rather than absolute zero
dependency:

- FVG and SMA never depend on the Campaign module and remain fully usable when
  it is absent;
- the selected Setup may require exact immutable FVG and SMA public evidence
  to accept a new Study Case, without gaining authority over either plugin;
- after capture, the citation and Case are frozen Campaign-owned history and
  require no live provider for reading, Cohort membership, deterministic
  statistics, or audit export;
- disabling or removing a provider removes its live tool, calculation,
  projection, and current verification; affected new capture fails closed,
  while existing Cases, Outcomes, Cohorts, Analysis Runs, and statistics are
  neither deleted nor silently reclassified;
- an exact compatible reinstall may support explicit verification, but cannot
  rewrite history; an incompatible version remains unresolved and requires a
  new versioned Setup meaning rather than a guessed migration.

This keeps production plugin operation independent while making each business
workflow's evidence prerequisites explicit and honest.

## Inputs Reviewed

- accepted product/scope and evidence-grade semantic dataset decisions;
- accepted Core/Community plugin lifecycle, Contribution Profile/composition,
  no cross-feature control, and host-owned durable Artifact survival rules;
- accepted H114 production manual FVG workflow and exact Annotation evidence/
  provenance boundaries;
- accepted P1c.3/H120 single-package SMA(close) calculation, instance,
  persistence, unresolved survival, and Chart-owner projection boundaries;
- existing Session, Workspace, Replay, Bar Data, Chart, state-sync, and
  persistence ownership rules;
- the non-binding Research → Study Case → Cohort → Analysis concept memo.

The accepted H114/H120 capability checks were reused because this candidate
adds no Chart renderer, calculation algorithm, package, or external dependency.

## Candidate Produced

`../docs/V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_DEMO_SPEC.md` proposes:

- one built-in demo Setup using a visible ready SMA(close,20), one manually
  accepted direction-aligned FVG, and explicit human qualification;
- versioned Campaign, Setup, Outcome, Evidence Citation, Study Case, frozen
  Cohort, Analysis Run, and append-only Source Verification records;
- exact no-future observation receipts without copying raw Bars, full source
  payloads, calculated series, screenshots, native objects, or plugin code;
- a separate later first-touch path Outcome with honest same-Bar ambiguity,
  bounded MFE/MAE/time, and no fill, P&L, or profitability claim;
- deterministic statistics with exact denominators, unavailable-source counts,
  and drill-down through existing Session/Workspace/Replay owners;
- a removable business runtime/persistence namespace and read-only evidence
  adapters, plus a bounded local audit export distinct from Dataset Builder;
- explicit disable, uninstall, source deletion, revision change, compatible
  reinstall, incompatible upgrade, and missing-business-module behavior;
- ten material decisions for later product-owner review.

## Preserved Boundaries

- no production source, schema, runtime, module, route, storage, state-sync,
  fixture, Harness registry, package, algorithm, or dependency was added or
  changed;
- neither FVG nor SMA was modified and neither gains a business dependency;
- no delivery or Harness id was allocated and the candidate is not accepted;
- P1c.4/H121 and P1b.4 remain unallocated/paused;
- no other plugin, Community/Worker, public workflow SDK, Journal, Dataset
  Builder, AI, or business implementation was started;
- H117 remains `executable`, human-review-required, unaccepted, with
  `acceptanceEvidence: null`.

## Documentation Updated

- the new candidate specification;
- `../TODO.md`;
- `../docs/INDEX.md`;
- `../docs/V7_EXECUTION_ROADMAP.md`;
- `../docs/V7_TASK_NUMBERING.md`;
- `../docs/V7_RESTART_HANDOFF.md`;
- the architecture manifest's stale H120 status text and required-document
  inventory.

## Verification

The bounded documentation change passed:

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
- `node v7/tests/source-quality-harness.js` — 582 production files, 558
  public exports, and 22 negative controls;
- `node v7/tests/server-state-sync-harness.js`;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passes;
- `node v7/tests/local-plugin-package-harness.js` — H117 passes all 54 frozen
  negative controls plus contract, transaction, storage, unpacked-security,
  and real-browser product evidence without changing its governance state;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passes and
  reports H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passes;
- `node v7/tests/core-moving-averages-harness.js` — accepted H120 formula,
  transaction, production-route real-browser, timeframe replacement, and four-
  Pane evidence passes while reporting H117 unchanged.

The architecture manifest remains valid JSON. The Developer Kit fingerprint
stayed current, so no generated baseline or source-quality snapshot was
refreshed. Final staged `git diff --check` is required before commit.

## Next Decision

The product owner should accept, amend, or reject the ten material decisions.
Acceptance would bind only the candidate product/architecture scope. It would
still allocate no implementation; a later explicit implementation-slice
specification must select schemas, commands, storage/state-sync bounds,
diagnostics, transaction phases, delivery/Harness id, automated evidence, and
focused human review.
