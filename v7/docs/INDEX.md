# V7 Documentation Index

V7 is a clean runtime rebuild of the replay/chart foundation. V6 remains a
read-only product, interaction, data-contract, and failure-evidence reference.

User and operator entry points:

- `../README.md` — V7 product overview and quick start;
- `V7_FOUNDATION_MILESTONE_V7_0_0.md` — accepted V7.0.0 scope, evidence,
  limitations, and non-blocking follow-ups;
- `V7_USER_GUIDE.zh-CN.md` — Chinese installation, data setup, Replay use,
  cross-device state, backup, and troubleshooting guide;
- `../deploy/linux/README.md` — detailed Linux deployment, security, rollback,
  and operations reference.

For the completed R8 recovery record, read
`V7_ARCHITECTURE_CONFORMANCE_RECOVERY_PLAN.md` immediately after the restart
handoff, followed by `V7_PRODUCTION_ARCHITECTURE_ANALYZER_R8_2.md` and its
machine-readable baseline, then
`V7_DESCRIPTOR_LIFECYCLE_INDEPENDENT_HARNESS_REPAIR_R8_3.md` and
`V7_RAW_COVERAGE_LEASE_CONTRACT_R8_4.md`, then
`V7_SOLE_BAR_DATA_RETENTION_OWNER_R8_5.md` and
`V7_SOLE_WORKSPACE_STATE_OWNER_R8_6.md`, then
`V7_PREPARED_COMMIT_CONTRACT_R8_7.md` and
`V7_REVERSIBLE_CHART_APPLICATION_R8_8.md`, then
`V7_GLOBAL_ATOMIC_WORKSPACE_TRANSACTION_R8_9.md`, then
`V7_UI_COMPOSITION_SPLIT_R8_10.md`, then
`V7_PRODUCTION_MODULE_HOST_BOOT_R8_11.md`, then
`V7_SOURCE_AND_DOCUMENTATION_CLOSURE_R8_12.md`, then
`V7_CALENDAR_CAPABILITY_RTH_LOCATE_REDERIVATION_R8_13.md`, then
`V7_FULL_PRODUCTION_REGRESSION_MATRIX_R8_14.md`, then
`V7_HUMAN_ACCEPTANCE_ZERO_DEBT_CLOSURE_R8_15.md`, then the current
`V7_REPLAY_FOUR_HOUR_CAP_AND_LATENCY_R9_1.md`,
`V7_REPLAY_MULTI_PANE_LATENCY_R9_2.md`, and
`V7_REPLAY_VIEWPORT_SEGMENTED_MULTI_PANE_R9_3.md`, followed by the current
`V7_AGGREGATED_BUCKET_TIME_LABELS_R9_4.md`. The parallel Linux acceptance-host
deployment is recorded in `V7_LINUX_ACCEPTANCE_HOST_DEPLOYMENT_R10_1.md`; it
is corrected for direct-IP/runtime compatibility in
`V7_LINUX_PUBLIC_IPV4_RUNTIME_COMPATIBILITY_R10_2.md`, with the one-command
operator path in `V7_LINUX_PUBLIC_IPV4_QUICK_DEPLOY_R10_3.md`. Authenticated
cross-device state is bound by `V7_SERVER_STATE_SYNC_R10_8.md`, and clean-host
CSV/DuckDB first-run setup is bound by `V7_DATABASE_BOOTSTRAP_IMPORT_R10_9.md`.
The 2026-08-06 full-code review and binding repair sequence are recorded in
`V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`; read it before changing any
transaction, cache, state-sync, deployment, public-server, or production-gate
boundary. Its automated closure evidence is
`../sessions/session_20260806_r11_1_architecture_integrity_recovery.md`; the
real-host and visual gates listed there remain open.
The current standalone runtime boundary is
`V7_STANDALONE_RUNTIME_SEPARATION_R12_2.md`: V7 releases contain only `v7/`,
read market data through `/v7/market-data/*`, and treat DuckDB as external
compatible data rather than an older-version runtime dependency.
The current lightweight-host capacity policy is
`V7_ADAPTIVE_LOW_MEMORY_DEPLOYMENT_R12_3.md`: the provider 512 MB class is the
minimum, and deployment automatically selects bounded DuckDB and persistent
swap settings instead of relying on host-specific operator commands.
Its pushed-host correction is `V7_SWAP_ACCOUNTING_TOLERANCE_R12_4.md`, which
accounts for the small `mkswap` header without accepting a material capacity
shortfall or requiring destructive operator repair.
The current cloud-playback correction is
`V7_CLOUD_REPLAY_HOT_PATH_R12_5.md`: it removes database revision discovery
from warm Replay network traffic and makes Autoplay cadence account for
transaction duration without introducing overlap or a second Replay owner.
The prior public-IP deployment correction is
`V7_HOST_ADAPTIVE_IDEMPOTENT_DEPLOYMENT_R12_6.md`: one public-IP entry now
detects database/release state, preserves shared Caddy by default, and migrates
recognized legacy Replay Lab layouts without taking ownership of foreign
sites.
The current operator entry is
`V7_UNIFIED_DEPLOYMENT_ENTRY_R12_7.md`: one `deploy.sh` covers local/private,
automatic or explicit public IPv4, public DNS, and LAN/VPN DNS; successful
deployments persist a strict non-secret profile for no-argument upgrades.
The second-acceptance correction is
`V7_ACCEPTANCE_CAPABILITY_STATUS_R12_8.md`: existing-database hosts expose only
importer health, Data Acquisition reports read-only Market Data coverage
without false Maintenance/import failures, and Replay UI does not leak internal
failure codes.
`V7_FOUNDATION_MILESTONE_V7_0_0.md` closes the phase-one foundation milestone;
unchecked provider/host-matrix evidence in the historical records is retained
as non-blocking follow-up unless a later decision explicitly promotes it to a
release gate. Read those records before the normal implementation reading order
below. `V7_NON_DECISION_MEMO_REGISTRY.md` is the canonical dated index for
unresolved ideas. It assigns stable memo ids, preserves position history, and
records tensions that a later decision must resolve. The registered
`V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`,
`V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md`, and
`V7_CHART_RESEARCH_SEMANTIC_CASE_AGENT_PREDECISION_MEMO.md`, together with
`V7_SEMANTIC_DATASET_MARKET_AND_COMMERCIALIZATION_PREDECISION_MEMO.md`, preserve
possible next product and business directions. Accepted ADRs may partially
promote named portions, but the remaining memo content authorizes no
implementation.
Accepted upstream `ADR-V7-006` is recorded in
`V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md`. It separates Plugin
Package, typed Contribution, Contribution Profile, negotiated Capability,
non-authoritative Domain Tag, and Pack; proposes an open, namespaced,
versioned, host-governed Profile Registry; and treats calculated series,
anchored studies, Drawings, Semantic Artifacts, and detectors as five initial
reference Profiles rather than a closed enum. One package may contain several
differently profiled Contributions, while typed dependencies, visual
co-presence, derived analysis, and human promotion remain distinct composition
operations. The product owner accepted all ten decisions on 2026-08-12 without
authorizing any SDK/schema/catalog value, delivery/Harness id, execution target,
or implementation. Its draft and acceptance records are
`../sessions/session_20260812_plugin_contribution_profile_composition_specification_draft.md`
and
`../sessions/session_20260812_plugin_contribution_profile_composition_specification_acceptance.md`.
Accepted subordinate `ADR-V7-005` is recorded at
`V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md`. It now applies only
to Contributions claiming the accepted architecture
`analysis.calculated-series` Profile:
Main/new/existing-region placement belongs to the user-owned instance, Scale
sharing is structural, multi-Plot/multi-group output is standard, and Core/
future Community Contributions claiming that same Profile share its ABI while
the Chart adapter remains sole native writer. It does not absorb FVG, SMT,
Fibonacci, Drawings, Semantic Artifacts, or detectors. The product owner
accepted all eight revised decisions on 2026-08-12 without authorizing
implementation. RSI/ATR/MACD remain unclassified examples, MA/SMA remains
unimplemented, P1a/P1b availability is unchanged, and P1b.4 remains paused.
The acceptance record is
`../sessions/session_20260812_calculated_series_projection_chart_region_specification_acceptance.md`.
The first required ADR-V7-005 delivery dependency has an accepted binding
specification at `V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md`. It defines
separate pure Profile-registry and calculated-series contract owners, exact
P0a Contribution binding without `kind` inference, and versioned Definition,
Plot, Scale, instance/ChartRegion, result/frame, provenance, limit, diagnostic,
and migration contracts. The product owner accepted all ten material decisions
on 2026-08-12. A separately authorized implementation on 2026-08-13 allocated
`P1c.1`/`H118` and added only the two pure modules, their pinned host
schemas/catalogs, synthetic fixtures, and headless evidence. The product owner
accepted the focused contract/evidence review on 2026-08-13; H118 is accepted
and P1c.1 is closed. SDK/runtime availability is still unchanged, P1b.4 remains
paused, and the H117 record is unchanged. Its draft, specification-acceptance,
and implementation/human-acceptance records are
`../sessions/session_20260812_calculated_series_pure_contract_candidate_specification.md`
and
`../sessions/session_20260812_calculated_series_pure_contract_specification_acceptance.md`,
plus
`../sessions/session_20260813_p1c_1_calculated_series_pure_contract_implementation.md`.
The second ADR-V7-005 dependency now has an accepted binding specification at
`V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md`. It binds a
removable complete-surface projection transaction beneath the existing sole
Chart Snapshot Application, a bounded Lightweight Charts native bridge,
stable same-chart Main/internal-region resources, structural Scale and
standard Plot realization, exact rollback/finalize behavior, and synthetic
Chromium evidence. On 2026-08-13 the product owner accepted decisions
1–6 and 9–10 as drafted and decisions 7–8 with stronger Chart-owner fault
escalation and settlement-admission boundaries. A separate instruction then
allocated P1c.2/H119 and implemented the removable transaction, Chart-owned
local child admission, adapter-private same-chart Main/internal resources,
standard Plot/Scale mappings, rollback/fault escalation, and real-Chromium
evidence. The first focused review on 2026-08-17 rejected H119 because line,
area, and baseline bridged the middle whitespace point. The authorized
correction now uses adapter-private contiguous value-run Series, bounds those
native segments, and proves three gaps/six probes/zero bridge pixels against a
positive raw-native sensitivity control. The product owner accepted the
corrected focused evidence on 2026-08-17; H119 is `accepted`, the correction
session is its durable acceptance evidence, and P1c.2 is closed. At P1c.2
closure the module was not yet wired into the product Workstation and no
MA/SMA or live instance loop existed. Its draft, acceptance, and implementation
records are
`../sessions/session_20260813_calculated_series_chart_owned_projection_candidate_specification.md`
and
`../sessions/session_20260813_calculated_series_chart_owned_projection_specification_acceptance.md`,
plus
`../sessions/session_20260813_p1c_2_calculated_series_chart_owned_projection_implementation.md`
and
`../sessions/session_20260817_p1c_2_h119_whitespace_rejection_and_correction.md`.
The third dependency has its binding specification at
`V7_CORE_SMA_SINGLE_PLUGIN_VERTICAL_SLICE_SPEC.md`. It follows the product
owner's direction to close one real plugin before expanding: one built-in Core
Moving Averages package contains exactly one canonical `SMA(close)` Definition
and one complete Add/settings/Main-to-new-region/Replay/persistence/unresolved/
reload/remove product loop. It adopts no auto-attached Lightweight Charts
Indicator helper, external Indicator library, second algorithm, or other
plugin. The product owner accepted all ten material decisions without amendment
on 2026-08-17 and separately authorized only this implementation. P1c.3 is now
implemented; H120 automated evidence and the focused production-route review
pass. The product owner accepted H120 on 2026-08-18, so H120 is `accepted`,
remains human-review-required, and P1c.3 is closed. H117 is unchanged and
P1b.4, every other plugin, Community/Worker, and business-layer implementation
remained paused at that acceptance checkpoint. The draft and specification-
acceptance records are
`../sessions/session_20260817_core_sma_single_plugin_vertical_slice_candidate_specification.md`
and
`../sessions/session_20260817_core_sma_single_plugin_vertical_slice_specification_acceptance.md`;
implementation and focused-review records are
`../sessions/session_20260818_p1c_3_core_sma_single_plugin_implementation.md`
and `V7_CORE_SMA_P1C3_HUMAN_REVIEW.md`; durable H120 acceptance is
`../sessions/session_20260818_p1c_3_h120_core_sma_human_acceptance.md`.
The product owner then authorized only a documentation candidate for one FVG +
SMA Validation Campaign / Study Case business tracer bullet. The unaccepted
candidate at `V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_DEMO_SPEC.md` defines
asymmetric, degradable independence: source plugins never depend on the
business module; new Setup capture may require exact public evidence from them;
frozen Cases, Outcomes, Cohorts, statistics, and audit history survive source
disable, uninstall, or incompatibility. It allocates no delivery/Harness id and
authorizes no implementation, other plugin, P1c.4, P1b.4, Community/Worker,
Journal, Dataset Builder, or AI work. Its durable draft record is
`../sessions/session_20260818_fvg_sma_validation_campaign_study_case_demo_candidate_specification.md`.
The later line-family/Circle/Arc
requirements are recorded without implementation at
`V7_VISUAL_PRIMITIVE_LINE_CIRCLE_ARC_FUTURE_REQUIREMENTS.md`.
The seconds/tick memo additionally records the current decision that minute-
sourced V7 remains valid without simulated-live training, defines the three-
of-four investigation signals, and keeps every future seconds path behind the
existing Bar Data/Replay/Chart owners.
The Agent-participatory learning-system memo preserves Research → Training →
Trading Review as three evidence-linked feedback loops. Its Research Project →
versioned Setup/Outcome definitions → Study Case → immutable Study Cohort →
auditable Analysis Run hierarchy remains the research substrate, while governed
Agent plans, tools, coaching, longitudinal review, and action provenance are
candidate system-wide requirements.
The accepted product-output decision is
`V7_EVIDENCE_GRADE_SEMANTIC_DATASET_PRODUCT_DECISION.md`. ADR-V7-003 makes
user-owned, AI-ready, evidence-grade semantic annotation data a first-class V7
output while preserving Replay as the controlled observation environment. It
binds exact market anchors, typed relations, no-future provenance, epistemic
separation, versioned meaning, human acceptance, reproducible derivation, raw-
context drilldown, portability, and replaceable AI providers. It allocates no
Dataset Builder, AI, Research/Training/Review, SaaS, shared-data, or Marketplace
implementation step. MEMO-V7-004 preserves the competitive, data-rights,
commercialization, branding, and market-entry discussion that remains open.
The accepted plugin-model decision is
`V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`. ADR-V7-004 keeps Kernel owners
outside the plugin catalog, classifies FVG, MA/SMA, BSL/SSL, and Fibonacci as
built-in Core Plugin capabilities, and permits derived plugins only through
declared public dependencies. It binds an Obsidian-like host-rendered Plugin
Center and a declarative/local/free-registry/isolated-worker sequence while
copying none of Obsidian's broad application privileges. Its 2026-08-10
amendment binds Chrome-like file/unpacked developer channels to the same
candidate pipeline, TradingView-like host-rendered Inputs/Style/Visibility and
Evidence/History surfaces, strict TypeScript authoring with compiled ESM plus
JSON Schema wire contracts, and a P0a-thin-platform/FVG-reference sequence. It
did not itself allocate a delivery id, loader, registry, Worker tier,
product-scope expansion, or Marketplace implementation. MEMO-V7-001 remains
open for those unresolved operations and product questions. The separately
authorized P0a implementation contract is
`V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`; P0b is implemented and
accepted under `V7_CORE_PLUGIN_CENTER_P0B.md`. The P1a authoring
contract in `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` is implemented and
accepted under H116; its Chinese design rationale is preserved in
`V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`. The P1b local
package/authoring MCP contract is accepted and amended in
`V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md`. Its separately authorized
P1b.1 contract/archive, P1b.2 transaction/storage, and P1b.3 Plugin Center/
product-correction slices are implemented: Manifest V2, deterministic `.v7plugin`,
portable candidate receipts, the sole inactive package inventory owner, atomic
IndexedDB CAS, declarative settings migration/retention/recovery, explicit
install review, a two-surface Included/Installed Center, archive-only production
browser adapter, and tooling-only unpacked security inspection. H117 is
executable with 54 frozen negative groups and corrected product-browser
evidence. The P1b.3 focused human review passed on 2026-08-12; separately
authorized P1b.4 MCP/closure remains open and deliberately paused.
`V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md` is the bounded review checklist.
Its compact-tab correction and post-implementation recommendation not to keep
Developer Mode as a top-level production surface are recorded in
`../sessions/session_20260812_p1b_3_tab_layout_and_developer_mode_review.md`;
the accepted removal is implemented and recorded in
`../sessions/session_20260812_p1b_3_developer_mode_surface_removal.md`.
The accepted post-milestone foundation is
`V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`. ADR-V7-001 separates
market-coordinate geometry, generic drawings, typed semantic artifacts,
declarative projections, and adapter-local render primitives; it treats
FVG/OB/Breaker/BSL/EQL as semantic artifacts rather than geometry subtypes. It
also separates manually anchored curve Geometry from MA/other calculated
Indicator series and requires first-party semantic types to use removable
packages from the first semantic slice, while deferring dynamic third-party
loading and Marketplace scope. It defines Geometry-first free drawing,
user-recognized evidence-constrained semantic construction, provenance-distinct
future detector suggestions, and one host-rendered schema-driven Property
Inspector. Its human gate closed on 2026-08-08. The separately bounded
`V7_MINIMAL_ANNOTATION_GEOMETRY_CONTRACT_R13_2.md` now activates only immutable
market-coordinate anchors, Point/Segment/Rectangle Geometry, and an extensible
removable Registry; it activates no Annotation state, Chart/UI, persistence, or
semantic package. `V7_HEADLESS_ANNOTATION_RUNTIME_R13_3.md` adds the separately
bounded removable Session document writer, exact generic-Drawing revisions, and
reversible fake-Repository transactions. It contains no business semantic type
and makes no visible application change.
`V7_ACCEPTED_ANNOTATION_CHART_PROJECTION_R13_4.md` adds one removable,
Chart-owned, reversible Primitive projection port plus a test-only static
Segment fixture. It does not wire production drawing UI or semantic packages.
`V7_SEGMENT_INTERACTION_PREVIEW_R13_5.md` adds the separately removable
non-semantic Segment gesture controller plus Chart-owned normalized gesture and
latest-wins transient Preview ports. Its real-chart surface remains a test
fixture and requires a human visual gate before the R13.5 commit.
`V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md` records accepted ADR-V7-002: official
Lightweight Charts Primitive patterns may be adapted, but reviewed community
drawing/toolkit runtimes may not become parallel V7 owners. It adds no
production dependency or pixels, keeps Indicator calculation under a later
decision. `V7_RECTANGLE_SELECTION_MINIMAL_INSPECTOR_R13_6.md` implements the
separately bounded Rectangle, accepted hit selection, atomic Geometry/style
revision, and minimal Segment/Rectangle Inspector over those V7-owned ports.
Its surface remains a test fixture. The corrected local visual gate closed on
2026-08-09; H104 is accepted and the user separately authorized the next
bounded step.
`V7_DURABLE_ANNOTATION_HISTORY_R13_7.md` is the accepted binding headless
contract for Session-keyed durable Annotation bytes, hard-reload restore,
exact-revision undo/redo, import/export, schema migration, and opaque envelope-
H105 closed on 2026-08-09 with no visible product change. R13.8 and H106 were
accepted on 2026-08-09 after the local NQ 1m/5m visual gate confirmed exact and
containing-bucket projection plus Replay no-future hide/restore.
`V7_PANE_TIME_REPLAY_ANNOTATION_PROJECTION_R13_8.md` freezes the source-agnostic
Pane/time/Replay projection owner, exact-instant and accepted-containing-bucket
policies, read-only no-future Replay behavior, multi-Pane settlement, and H106
human visual gate. It does not authorize R13.9 semantic packages.
`V7_SEMANTIC_PACKAGE_LIQUIDITY_LEVEL_R13_9.md` is the authorized binding
contract for the first trusted-build semantic plugin slice: host-owned package
lifecycle, unresolved Artifact survival, generic Runtime/persistence support,
and human/manual BSL/SSL creation or horizontal-Segment promotion. H107's
automated and corrected local human visual gates passed on 2026-08-09. H107 is
accepted; at that closure, R13.10 remained unauthorized.

`V7_STAGE_ARCHITECTURE_REVIEW_R13_9A.md` is the documentation-only architecture
checkpoint after accepted R13.9. It confirms the existing modular owner graph
and records three blockers before a second semantic package: extensible
provenance, immutable construction identity, and serialized failed-generation
cleanup. R13.9/H107 remain accepted; R13.10 is blocked pending a separately
authorized remediation at that checkpoint.
`V7_SEMANTIC_CONTRACT_HARDENING_R13_9B.md` is the accepted repair: Artifact
schema 2 stores exact host-stamped package/definition construction identity,
exposes one package-owned portable provenance record, migrates unknown legacy
identity without invention, and serializes failed-generation cleanup before
re-enable. H108 proves the contract with an independent synthetic package.
`V7_PURE_ANNOTATION_EVIDENCE_RESOLVER_R13_10A.md` is the accepted headless next
boundary: one removable pure resolver selects only bounded Bar/Artifact
evidence already present in a supplied accepted Pane/Replay snapshot, preserves
exact source/display/data/cutoff identity, and fails instead of acquiring
missing or future evidence. H109 is automated.
`V7_EXACT_BAR_PICKER_R13_10B.md` is the accepted exact loaded-Bar selection
boundary. It adds a removable controller over the existing shared Chart
interaction lease, selects only original mounted-Series timestamps, and owns
no Bar request or accepted-state mutation. H110 and the corrected
cyan-candidate/lime-accepted real-browser human gate passed on 2026-08-09.
`V7_DETERMINISTIC_FVG_CONSTRUCTION_PROJECTION_R13_10C.md` is the accepted
strict three-Bar FVG boundary. It adds a removable evidence-derived Semantic
package over branded R13.10a evidence and emits only generic Rectangle,
midpoint-Segment, and projection-label inputs through existing owners. H111's
automated and focused local human visual gates passed on 2026-08-10. Evidence
Inspector/validated overrides remained outside that accepted step.
`V7_FVG_EVIDENCE_INSPECTOR_VALIDATED_OVERRIDE_R13_10D.md` now binds the
separately authorized host-rendered Inspector slice: the active Core FVG Plugin
owns bounded groups and inner-zone validation, Annotation Interaction owns only
the disposable local draft/Preview, and Annotation Runtime remains the sole
accepted Artifact writer. H112's automated evidence and corrected focused human
gate pass: a dirty edit now shows one Preview FVG while retaining accepted
bytes, and Cancel/Apply settle to one accepted layer. R13.10d is accepted and
closed.
The accepted
Core/Community plugin model classifies the existing FVG and BSL/SSL packages as
built-in Core capabilities. Its amendment makes a minimal P0a
manifest/contribution/settings bridge the prerequisite/reference boundary for
R13.10e. `V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md` now records the
implemented pure contract, FVG conformance manifest, and H113 automated gate;
it does not create a Plugin Center, loader, detector, or later distribution
phase. `V7_PRODUCTION_MANUAL_FVG_WORKFLOW_R13_10E.md` now binds the implemented
first production vertical slice through P0a: generic tool contribution, exact
Bar evidence, Core FVG construction, durable Runtime commit, multi-Pane
projection, and host-rendered Inspector. H114 passes automated evidence and
the focused production visual gate; R13.10e was accepted on 2026-08-11.
`V7_CORE_PLUGIN_CENTER_P0B.md` is the separately specified next Plugin
Platform boundary. It freezes a host-rendered trusted-build Core-only catalog,
one durable active/pending Core profile, explicit dependency impact,
restart-bound single-ModuleHost generations, settled fallback, package/default
settings, and byte-preserving disable/re-enable. P0b is implemented and H115's
automated evidence passes. Its first focused review found and corrected the
shared footer overlap; the corrected visual/interaction gate and P0b were
accepted on 2026-08-11.
ADR-V7-004's 2026-08-11 amendment additionally makes plugin development Agent-
native: a deterministic machine-readable Developer Kit/Harness is canonical,
with a local MCP adapter over the same operations. A later Pine indicator
migration assistant emits ordinary strict-TypeScript packages, compatibility
reports, tests, and provenance after the target SDK/runtime exists; Pine is not
a runtime language and semantic equivalence still requires evidence and human
review. `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` now binds the implemented
bounded SDK/CLI/Harness contract, non-installable developer evidence bundle,
isolated synthetic test host, diagnostics, receipts, and accepted H116 gate.
It adds no MCP, installation, Worker, or product-visible behavior. After
detailed review, the product owner accepted the specification's four material
boundaries, requested the plain-language reasoning be retained for future
maintainers, and separately authorized the bounded P1a implementation.
`V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` is the subsequent accepted
specification. It defines a distinct `.v7plugin` archive, non-executing device-
local inventory transactions, tooling-only prepared-candidate inspection, declarative
settings migration/data survival, Restricted Mode, and a local `stdio` MCP
adapter over P1a's eight operations. The product owner accepted all five
material decisions on 2026-08-11. Separately authorized P1b.1–P1b.3 now
register H117 as executable and implement 22 schemas, 10 catalogs, pure
Manifest/candidate/change/migration contracts, deterministic `.v7plugin`
pack/inspect, portable receipts, a sole package-store runtime, atomic
IndexedDB, separate Included/Installed surfaces, an archive-only browser
adapter, tooling-only unpacked security checks, and 54 negative groups. They add
no MCP server, activation,
external import/evaluation, or business contribution; H117 remains unaccepted
because the complete P1b.4 gate remains open, although the focused P1b.3 human
review passed on 2026-08-12.
The completed NQ historical-roll sequence is recorded in
`V7_NQ_LEGACY_RED_DATABENTO_ROLL_AUDIT.md`,
`V7_NQ_DATABENTO_FULL_CHAIN_DIFF.md`, and the binding execution record
`V7_NQ_DATABENTO_FULL_CHAIN_REPAIR.md`. Machine-readable mapping and final
audit evidence are `v7-nq-databento-full-chain-diff.json` and
`v7-nq-databento-full-chain-audit.json`. The matching completed ES execution
is recorded in `V7_ES_DATABENTO_FULL_CHAIN_REPAIR.md`, with frozen mapping and
audit evidence in `v7-es-databento-full-chain-diff.json` and
`v7-es-databento-full-chain-audit.json`.

Read in this order before V7 implementation work:

1. `V7_RESTART_HANDOFF.md` after any machine/server/agent restart
2. `V7_PRODUCT_AND_SCOPE.md`
3. `V7_ARCHITECTURE.md`
4. `V7_V6_MIGRATION_DENYLIST.md`
5. `V7_V6_DISPOSITION_MATRIX.md`
6. `V7_V6_INTERACTION_CARRY_FORWARD.md`
7. `V7_UI_REFERENCE_AND_QUALITY.md`
8. `V7_HARNESS_STANDARD.md`
9. `V7_TASK_NUMBERING.md`
10. `V7_FOUNDATION_INTERACTION_CONTRACT.md`
11. `V7_CACHE_AND_LATENCY_CONTRACT.md`
12. `V7_SESSION_BROWSER_SURFACE.md`
13. `V7_CALENDAR_SURFACE.md`
14. `V7_BAR_DATA_CONTRACT.md`
15. `V7_RAW_COVERAGE_LEASE_CONTRACT_R8_4.md`
16. `V7_SOLE_BAR_DATA_RETENTION_OWNER_R8_5.md`
17. `V7_SOLE_WORKSPACE_STATE_OWNER_R8_6.md`
18. `V7_PREPARED_COMMIT_CONTRACT_R8_7.md`
19. `V7_REVERSIBLE_CHART_APPLICATION_R8_8.md`
20. `V7_GLOBAL_ATOMIC_WORKSPACE_TRANSACTION_R8_9.md`
21. `V7_UI_COMPOSITION_SPLIT_R8_10.md`
22. `V7_PRODUCTION_MODULE_HOST_BOOT_R8_11.md`
23. `V7_SOURCE_AND_DOCUMENTATION_CLOSURE_R8_12.md`
24. `V7_CALENDAR_CAPABILITY_RTH_LOCATE_REDERIVATION_R8_13.md`
25. `V7_FULL_PRODUCTION_REGRESSION_MATRIX_R8_14.md`
26. `V7_HUMAN_ACCEPTANCE_ZERO_DEBT_CLOSURE_R8_15.md`
27. `V7_BAR_DATA_RUNTIME.md`
28. `V7_PROVIDER_POLICY_CONTRACT.md`
29. `V7_COVERAGE_PLANNING_CONTRACT.md`
30. `V7_PROVIDER_EXECUTION_RUNTIME.md`
31. `V7_REPLAY_CONTRACT.md`
32. `V7_REPLAY_RUNTIME.md`
33. `V7_REPLAY_PREFETCH_CONTRACT.md`
34. `V7_WORKSPACE_TRANSACTION_RUNTIME.md`
35. `V7_PROJECTION_DOMAIN.md`
36. `V7_SESSION_HOURS_DOMAIN.md`
37. `V7_FIXED_TIMEFRAME_DOMAIN.md`
38. `V7_CALENDAR_TIMEFRAME_DOMAIN.md`
39. `V7_WORKSPACE_REPLACEMENT_RUNTIME.md`
40. `V7_COMPACT_WORKSPACE_CONTROLS.md`
41. `V7_REAL_V4_BARS_PROVIDER.md`
42. `V7_R5_6_CORRECTIVE_REVIEW.md` for the accepted R5.6 regression contract
43. `V7_PANE_WORKSPACE_DOMAIN.md`
44. `V7_REPLAY_PANE_RESPONSE_CONTRACT.md`
45. `V7_PANE_SET_MATERIALIZATION.md`
46. `V7_REPLAY_NAVIGATION_RUNTIME.md`
47. `V7_GOTO_REDESIGN_CONTRACT_R6_9D.md`
48. `V7_QUICK_GOTO_SETTINGS_R6_9E.md`
49. `V7_FUTURE_TIME_AXIS_R6_9E1.md`
50. `V7_EXACT_GOTO_R6_9H.md`
51. `V7_REPLAY_NAVIGATION_PREFERENCE_STORE.md`
52. `V7_WORKSTATION_SETTINGS_CATALOG_R6_9F.md`
53. `V7_WORKSTATION_SETTINGS_PRODUCT_REFINEMENT_R6_9G.md`
54. `V7_WORKSTATION_SETTINGS_FOUNDATION_R6_9I.md`
55. `V7_WORKSTATION_SETTINGS_STATUS_CURRENT_PRICE_R6_9K.md`
56. `V7_WORKSTATION_SETTINGS_CANVAS_R6_9L.md`
57. `V7_WORKSTATION_SETTINGS_TIME_R6_9M.md`
58. `V7_LAYOUT_SYNC_CONTRACT_R6_10A.md`
59. `V7_LAYOUT_SYNC_SYMBOL_INTERVAL_R6_10B.md`
60. `V7_PANE_PRIORITY_IDENTITY_R6_10C1.md`
61. `V7_LAYOUT_SYNC_TIME_ROLLBACK_R6_10C2.md`
62. `V7_PANE_TIME_LOCATION_R6_10C3.md`
63. `V7_DATE_RANGE_SYNC_DEFER_AND_R6_CLOSURE.md`
64. `V7_SESSION_WORKSPACE_CHECKPOINT_R7_1.md`
65. `V7_RESTORED_WORKSPACE_PERFORMANCE_R7_2.md`
66. `V7_DATA_ACQUISITION_MILESTONE_R7_3.md`
67. `V7_CONTRACT_ROLL_MILESTONE_R7_3C.md`
68. `V7_REAL_PANE_WORKSPACE_R6_5.md`
69. `V7_REPLAY_BAR_STEP_R6_6.md`
70. `V7_CONTINUOUS_AUTOPLAY_R6_7.md`
71. `V7_MULTI_PANE_RTH_HISTORY_R6_7A.md`
72. `V7_MANUAL_VIEWPORT_SPAN_R6_7B.md`
73. `V7_CONTRIBUTING_HISTORY_WINDOWS_R6_7C.md`
74. `V7_STABLE_TOOLBAR_REFRESH_R6_7D.md`
75. `V7_FIXED_REPLAY_TRANSPORT_R6_8.md`
76. `V7_RESIZABLE_PANE_LAYOUTS_R6_9.md`
77. `V7_PANE_OHLC_CROSSHAIR_SYNC_R6_9A.md`
78. `V7_PANE_CANVAS_OVERLAY_MAXIMIZE_R6_9B.md`
79. `V7_PANE_CONTROL_DOCK_R6_9C.md`
80. `V7_CHART_SNAPSHOT_APPLICATION.md`
81. `V7_VIEWPORT_RUNTIME.md`
82. `V7_LIGHTWEIGHT_CHART_SLICE.md`
83. `V7_EXECUTION_ROADMAP.md`
84. `V7_REPLAY_FOUR_HOUR_CAP_AND_LATENCY_R9_1.md`
85. `V7_REPLAY_MULTI_PANE_LATENCY_R9_2.md`
86. `V7_REPLAY_VIEWPORT_SEGMENTED_MULTI_PANE_R9_3.md`
87. `V7_AGGREGATED_BUCKET_TIME_LABELS_R9_4.md`
88. `V7_LINUX_ACCEPTANCE_HOST_DEPLOYMENT_R10_1.md`
89. `V7_LINUX_PUBLIC_IPV4_RUNTIME_COMPATIBILITY_R10_2.md`
90. `V7_LINUX_PUBLIC_IPV4_QUICK_DEPLOY_R10_3.md`
91. `V7_SERVER_STATE_SYNC_R10_8.md`
92. `V7_DATABASE_BOOTSTRAP_IMPORT_R10_9.md`
93. `V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`
94. `V7_STANDALONE_RUNTIME_SEPARATION_R12_2.md`
95. `V7_CLOUD_REPLAY_HOT_PATH_R12_5.md`
96. `V7_NON_DECISION_MEMO_REGISTRY.md` as the canonical dated index for every
    unresolved product/architecture memo and its cross-memo tensions
97. `V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md` as deferred,
    partially promoted context whose remaining questions are non-binding
98. `V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` as accepted ADR-V7-004;
    read before specifying Core/Community packages, dependency graphs, Plugin
    Center, installation, SDK, Agent authoring Harness/MCP, Pine migration,
    registry, or Marketplace behavior
98a. `V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md` as the implemented pure
     built-in manifest/contribution/settings/status boundary and FVG/H113
     conformance record
98b. `V7_CORE_PLUGIN_CENTER_P0B.md` as the implemented restart-bound trusted
     Core catalog/profile/generation contract accepted under H115
98c. `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` as the implemented and
     accepted bounded strict-TypeScript SDK, deterministic CLI/library/Harness,
     isolated synthetic-host, developer evidence bundle, receipt, and H116
     contract
98d. `V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md` as the
     non-normative Chinese explanation of P1a's motivations, four accepted
     material boundaries, authoring flow, isolation, and phase separation
98e. `V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` as the accepted binding
     amended P1b specification for local inactive-package admission,
     transactional inventory/recovery, tooling-only prepared-candidate
     inspection, and a bounded
     authoring MCP adapter; do not treat specification acceptance as
     implementation authorization
98f. `V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md` and
     `V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md` as the binding
     calculated-series architecture decisions
98g. `V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md` and
     `V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md` as accepted
     H118/H119 dependencies
98h. `V7_CORE_SMA_SINGLE_PLUGIN_VERTICAL_SLICE_SPEC.md` as the implemented
     and accepted one-package/one-definition P1c.3 scope, with
     `V7_CORE_SMA_P1C3_HUMAN_REVIEW.md` as the passed focused gate
98i. `V7_VISUAL_PRIMITIVE_LINE_CIRCLE_ARC_FUTURE_REQUIREMENTS.md` as
     documentation-only future primitive input; it authorizes no implementation
98j. `V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_DEMO_SPEC.md` as the
     documentation-only, unaccepted business tracer-bullet candidate using
     existing FVG and SMA; it allocates no delivery/Harness id or implementation
99. `V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md` as deferred,
    non-binding context only
100. `V7_CHART_RESEARCH_SEMANTIC_CASE_AGENT_PREDECISION_MEMO.md` as dated,
    non-binding AI-Agent-participatory Research, Training, and Trading Review
    context only
101. `V7_SEMANTIC_DATASET_MARKET_AND_COMMERCIALIZATION_PREDECISION_MEMO.md` as
    the partially promoted market, competitor, data-rights, commercialization,
    branding, and open-model discussion; its remaining questions are non-binding
102. `V7_EVIDENCE_GRADE_SEMANTIC_DATASET_PRODUCT_DECISION.md` as accepted
    ADR-V7-003; read before any dataset, AI, Research, Training, Trading Review,
    hosted, or shared-data specification
103. `V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md` as accepted
    ADR-V7-001; read before any drawing or semantic annotation implementation
104. `V7_MINIMAL_ANNOTATION_GEOMETRY_CONTRACT_R13_2.md` as the binding pure
    market-coordinate Point/Segment/Rectangle and extensible Registry contract
105. `V7_HEADLESS_ANNOTATION_RUNTIME_R13_3.md` as the binding removable sole
    Annotation Document writer and exact generic-Drawing revision contract
106. `V7_ACCEPTED_ANNOTATION_CHART_PROJECTION_R13_4.md` as the binding
    Chart-owned prepare/apply/rollback/finalize Primitive projection contract
107. `V7_SEGMENT_INTERACTION_PREVIEW_R13_5.md` as the binding one-shot Segment
    gesture, transient Preview, cancellation, and Chart arbitration contract
108. `V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md` as accepted ADR-V7-002 and
    `v7-community-reuse-audit.json` as its pinned machine-readable candidate
    evidence; read before specifying or implementing R13.6
109. `../TODO.md`

The numbered order above is for implementation work. Ordinary users should use
the user/operator entry points instead of reading the architecture history.

Executable architecture metadata lives in
`v7-architecture-manifest.json`. Its harness must pass before every V7 commit.
Cross-process production ownership, service dependencies, host writers, and
previously excluded Node/Python/V4/deployment paths live in
`v7-deployed-runtime-manifest.json` and are enforced separately from the
browser module graph.
Critical rule lifecycle and activation metadata lives in
`v7-harness-rules.json`.
Foundation/unplanned-candidate interaction ownership and visible-completion metadata lives
in `v7-foundation-interactions.json`.
Cache identity, prefetch, latency tiers, refresh behavior, and chunked history
budgets live in `v7-cache-latency-contract.json`.
The restored Workspace performance/race and foundation-axis evidence matrix
lives in `v7-restored-workspace-performance-matrix.json`.
The binding R8.14 production failure/concurrency/cross-product execution
disposition lives in `v7-production-regression-matrix.json`.
