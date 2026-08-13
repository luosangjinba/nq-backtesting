# Session — Plugin Contribution Profile And Composition Specification Draft

Date: 2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Scope: documentation and decision-candidate refinement only

## Product-Owner Authority

The product owner authorized:

> 起草 V7 Plugin Contribution Profile 与组合候选规格，采用开放注册表；同步修正 ADR-V7-005 的边界与待决策项。不实施，不验收，不启动 P1b.4。

The immediately preceding clarification accepted calculated series, anchored
studies, Drawing geometry, Semantic Artifacts, and detectors as useful current
classifications but explicitly rejected freezing exactly five contribution
types. Future Contribution Profiles must remain extensible.

This authority did not authorize production/SDK/schema/catalog/Harness code,
candidate acceptance, MA/SMA delivery, Community execution, P1b.4, or H117
acceptance.

## Existing Boundaries Reviewed

The drafting pass reviewed the relevant accepted and candidate boundaries:

- `V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` for Kernel/Core/Community,
  Package/Contribution/Pack, initial Core classifications, declared
  dependencies, trust tiers, and strict TypeScript authoring;
- `V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md` for calculated-
  series versus Drawing/Semantic truth, Geometry, Artifact projection,
  evidence, promotion, and package absence;
- `V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md` for current broad
  contribution-kind metadata and the FVG semantic/tool reference;
- `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` for qualified Developer Kit
  Contract Profiles, honest contribution availability, schemas/catalogs, and
  unavailable Indicator/Worker behavior;
- `V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` for the inert
  `local-declarative-package-v1` Package Contract Profile and unchanged empty
  contribution/execution boundary;
- `V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md` for the earlier
  calculated Indicator, manual Semantic, detector, Drawing, visual capability,
  and host-composition candidates;
- the original `ADR-V7-005` draft and its retained Lightweight Charts 5.2 Pane
  and awesome-tradingview reuse evidence.

No new external dependency or production reuse decision was needed. The
existing ADR-V7-005 native Pane feasibility decision remains adequate for the
subordinate calculated-series projection candidate.

## Candidate Drafted

Created
`v7/docs/V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md` as
`ADR-V7-006` candidate.

The draft separates five independent axes:

1. package distribution/trust;
2. Contribution Profile truth/lifecycle;
3. negotiated capabilities;
4. projection shape/location;
5. non-authoritative Domain Tags.

It proposes an open, namespaced, versioned, host-governed Profile Registry.
The five current Profiles are an initial reference set, not a closed enum or
exhaustive roadmap. A future Profile needs an accepted owner/schema/I/O/
permission/migration/resource/conformance contract and cannot be registered by
package code.

The draft requires one primary truth/lifecycle Profile per Contribution while
allowing one package to publish several differently profiled Contributions. It
distinguishes visual co-presence, package grouping, typed dependency, derived
analysis, and explicit human promotion. Host composition resolves exact
versioned acyclic dependencies; direct plugin-to-plugin control remains
forbidden.

The mapping covers MA/MACD/RSI/ATR, Fibonacci, manual/automatic FVG, BSL/SSL,
SMT, ordinary Drawings, and MA+FVG+SMT confluence without changing accepted
Core classifications or authorizing illustrative packages.

## ADR-V7-005 Revision

Revised
`v7/docs/V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md` without
accepting it.

The title and public boundary now identify calculated-series projection. In
that document, user-facing “Indicator” is explicitly limited to a Contribution
claiming the candidate `analysis.calculated-series` Profile. Contract terms now
use `CalculatedSeriesDefinition`, `CalculatedSeriesInstance`,
`CalculatedSeriesWorkspaceDocument`, and
`CalculatedSeriesProjectionFrame` where ambiguity mattered.

The revised eight material decisions retain generic Main/internal-region
placement, Plot Groups, structural Scale compatibility, exact no-stale frames,
host-owned layout/instance state, same-Profile Core/Community semantics, and the
sole Chart writer. They exclude anchored studies, Drawing Geometry, Semantic
Artifacts, detectors, workflows, and a universal visual-result ABI. ADR-V7-006
must be accepted before or together with ADR-V7-005.

## Governance Synchronized

Updated:

- `v7/TODO.md`;
- `v7/docs/INDEX.md`;
- `v7/docs/V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` with a clearly
  non-binding adjacent-candidate cross-reference;
- `v7/docs/V7_EXECUTION_ROADMAP.md`;
- `v7/docs/V7_NON_DECISION_MEMO_REGISTRY.md`;
- `v7/docs/V7_RESTART_HANDOFF.md`.

The next decision order is ADR-V7-006's ten material decisions followed by
ADR-V7-005's revised eight decisions. Neither candidate has an implementation
or Harness id.

## Verification

The documentation pass completed with:

- `git diff --check` — passed;
- `node v7/tests/source-quality-harness.js` — passed with 497 production files,
  461 public exports, and 22 negative controls;
- `node v7/tests/production-architecture-harness.js` — passed with 68 modules,
  150 dependency edges, 133 construction sites, 27 writer sites, zero blocking
  findings, and 15 negative controls;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed all 20 negative
  controls, including unchanged rejection of unauthorized Community/Worker/
  sub-Pane claims;
- `node v7/tests/local-plugin-package-harness.js` — H117's existing 54 negative
  groups, package/archive, transactions/storage, unpacked security, and real-
  browser product evidence passed;
- `v7/docs/v7-harness-rules.json` inspection — H117 remains `executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- changed-file inspection — only V7 documentation, `v7/TODO.md`, and this
  session record changed; no production, SDK, schema, catalog, dependency,
  fixture, or Harness-rule file changed.

## Non-Authorization Preserved

This session does not:

- accept ADR-V7-006 or ADR-V7-005;
- register even one Contribution Profile in code or schema;
- freeze the five reference Profiles as an exhaustive enum;
- implement calculated-series/anchored-study/Detector behavior;
- change P0a/P0b/P1a/P1b package or Contract Profile availability;
- make Installed packages active or executable;
- classify RSI, ATR, MACD, SMT, or another example as Core;
- implement MA/SMA or Fibonacci;
- start P1b.4 or accept H117;
- authorize P2/P3, Community execution, AI, strategy/execution, native
  renderers, Marketplace, or broader product scope.

## Next Gate

Product-owner review of the ten ADR-V7-006 material decisions is next. Only
after that candidate is accepted or amended should the revised eight
ADR-V7-005 calculated-series projection decisions be reviewed. Acceptance of
either decision remains documentation authority only; implementation requires
a later separately authorized bounded specification.
