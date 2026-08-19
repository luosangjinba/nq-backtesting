# V7 FVG + SMA Validation Campaign / Study Case Business Demo — Accepted Specification

Status: all ten material product/architecture decisions accepted without
amendment; no delivery or Harness id allocated; no implementation authorized

Drafted: 2026-08-18

Accepted: 2026-08-19 02:39 PDT

Upstream decisions: accepted `ADR-V7-001`, accepted `ADR-V7-003`, accepted
`ADR-V7-004`, accepted `ADR-V7-005`, accepted `ADR-V7-006`, accepted H114 FVG
production workflow, and accepted P1c.3/H120 Core SMA vertical slice

Accepted scope: one local-first Validation Campaign → Study Case → Outcome →
frozen Cohort → deterministic statistics → raw-chart drill-down → portable
audit export loop using only the existing FVG and SMA capabilities

## Authority And Non-Authorization Boundary

The proposed next instruction was:

> 授权起草“FVG + SMA Validation Campaign / Study Case 业务垂直 Demo”候选规格；
> 仅使用现有 FVG 与 SMA，不新增插件或算法，不实施 P1c.4、P1b.4、
> Community/Worker 或 AI，先定义 Setup → Case → Outcome → Cohort →
> 统计回钻与导出的最小闭环。

The product owner replied:

> 同意以上授权，还想提个问题：业务层是否会影响插件生产使用，它们是否完全独立运行，
> 不相互依赖，如果拆除某个业务流程使用的插件，会发生什么？

That instruction authorized only the candidate specification and its durable
drafting record. On 2026-08-19, the product owner then stated:

> V7_FVG_SMA_Validation_Campaign_Study_Case_Demo_SPEC的十项决策审核通过

This accepts all ten material decisions below without amendment and makes this
document the binding business/product/architecture specification for the
bounded Demo. Per accepted decision 10, acceptance does not allocate a
business delivery or H121, create schemas/modules/storage/UI, alter either
plugin, start P1c.4, resume P1b.4, or authorize Community/Worker, Journal,
Dataset Builder, AI, or another business workflow.

## Direct Answer: Independent Runtime, Explicit Evidence Dependency

The required relationship is **asymmetric and degradable**, not “zero
dependency” and not coupled ownership:

1. FVG and SMA do not depend on the business layer. They must boot, calculate,
   draw, persist, disable/re-enable, and be removed exactly as they do today
   when every Campaign module is absent.
2. The Campaign runtime never imports either package, calls its private state,
   changes its settings, creates/removes its instances, enables/disables it, or
   waits on a plugin subscriber for correctness. It consumes only immutable,
   host-normalized evidence receipts through public query adapters.
3. A particular `SetupDefinition` may require exact FVG and SMA evidence for a
   **new** Study Case. That is a data-level prerequisite for one workflow step,
   not a ModuleHost/package lifecycle dependency and not permission to control
   either plugin.
4. Once accepted into a Study Case, the evidence citation is frozen. Disabling,
   uninstalling, upgrading, or losing a source plugin never deletes or silently
   reclassifies the Case, Outcome, Cohort, Analysis Run, or export.
5. When a required source is absent, new capture and current re-verification
   fail closed with an attributed unavailable state. Historical records remain
   readable and statistically countable with their source-verification status
   disclosed. No fallback, inferred substitute, or silent denominator change
   is allowed.

Thus the plugins are operationally independent, while the selected demo Setup
has an honest evidence requirement. “Independent” must not be implemented as
copying plugin truth into an untraceable business silo; “dependent” must not be
implemented as one feature module controlling another.

## Product Purpose

H114 proves one complete semantic FVG workflow. H120 proves one complete
calculated-series SMA workflow. Neither proves that a trader can turn exact
Replay observations into a reproducible strategy-validation record.

This specification defines a product tracer bullet above those two already
accepted capabilities. It should answer whether a user can:

- state one simple Setup hypothesis before seeing outcomes;
- capture exact FVG and SMA evidence at a no-future Replay cutoff;
- retain accepted, rejected, ambiguous, and incomplete observations;
- record a separately revealed path Outcome without rewriting decision-time
  evidence;
- freeze cases into an immutable Cohort;
- run small deterministic descriptive statistics with explicit denominators;
- click every number back to the source Session, Pane, cutoff, Artifact, SMA
  observation, and raw chart context;
- retain that research history when a source plugin is disabled or absent;
- export a portable audit bundle without creating an AI Dataset Builder.

The demo is intended to test the future business architecture, not to establish
that this two-condition Setup is profitable or complete ICT methodology.

## Existing Capability Reuse

The demo uses exactly these existing first-party capabilities:

- `first-party.fair-value-gap@1.0.0`, with accepted manual construction of an
  `imbalance.fvg@1.0.0` Semantic Artifact, exact three-Bar evidence, durable
  Annotation ownership, unresolved package survival, and raw-context
  inspection under H114;
- `first-party.moving-averages@1.0.0`, contribution
  `indicator.moving-averages@1.0.0`, Definition
  `moving-averages.sma.close@1.0.0`, with exact SMA(close), host-owned
  instance/settings state, no-future output, durable unresolved survival, and
  Main/internal-Region projection under H120.

The accepted H114 and H120 capability/ecosystem checks already retain
Lightweight Charts as the sole native chart adapter and reject external helper
objects which would become second writers. This specification adds no renderer,
Chart primitive, calculation algorithm, or third-party workflow dependency.
Its chart interactions are existing FVG/SMA projection and existing Workspace
navigation only.

No current plugin contract exposes a ready-made business Study Case or
evidence-grade Campaign owner. Adopting a generic journal form or copying a
Notion-like row would lose no-future provenance, immutable source revisions,
unresolved-plugin behavior, and raw-chart drill-down. The bounded business
records below therefore require an explicit V7 owner rather than an external
UI/storage shortcut.

## Selected Record Names

This first demo specifies the following product records:

| Record | Meaning | Sole semantic owner |
| --- | --- | --- |
| `ValidationCampaignV1` | one governed Setup-validation question and its versioned definitions/cases | future removable Validation Campaign runtime |
| `SetupDefinitionV1` | exact ex-ante evidence requirements and qualification policy | Validation Campaign runtime |
| `OutcomeDefinitionV1` | exact later path-observation policy, separate from Setup truth | Validation Campaign runtime |
| `EvidenceCitationV1` | immutable host-issued observation receipt pointing to exact source truth | Validation Campaign runtime owns the citation; source owner retains source truth |
| `StudyCaseV1` | one positive, negative, ambiguous, or incomplete research observation | Validation Campaign runtime |
| `StudyCohortV1` | immutable case-id/revision selection and inclusion policy | Validation Campaign runtime |
| `AnalysisRunV1` | deterministic metric version, exact Cohort, inputs, outputs, and drill-down index | Validation Campaign runtime |
| `SourceVerificationV1` | append-only result of explicitly rechecking a citation against a currently available source | Validation Campaign runtime |

`ValidationCampaign` is selected as the first product container because it is
already the accepted user workflow above the shared Replay foundation.
`StudyCase` is selected instead of `SetupCase` because the first demo must keep
no-trade, rejected, ambiguous, and incomplete observations, not only completed
trade processes. A future Journal-owned Setup Case may reference a Study Case;
this demo neither creates nor resolves that later contract.

The Campaign runtime is not a semantic-annotation store, calculated-series
runtime, Session Store, Journal, or generic plugin workflow engine. Its records
reference those owners rather than absorbing their payloads.

## One Included Demo Setup

The only included business template is specified as
`demo.sma-trend-manual-fvg@1.0.0`. It is host-owned versioned seed data, not a
third plugin and not a hard-coded runtime branch.

At Campaign creation the user selects:

- one instrument;
- one registered context timeframe and one registered execution timeframe;
- `long` or `short` direction;
- the exact Session Hours policy;
- one existing context Pane and one execution Pane when capturing a Case.

The evidence requirements are:

1. one exact ready, visible `moving-averages.sma.close@1.0.0` instance using
   `source: close` and `length: 20` on the context Pane;
2. the latest eligible context close and SMA value at or before the observation
   cutoff, with `close > SMA` for long or `close < SMA` for short;
3. one exact active, accepted `imbalance.fvg@1.0.0` Artifact revision on the
   execution Pane, observed no later than the same cutoff, bullish for long or
   bearish for short;
4. explicit user confirmation classifying the observation as `qualified`,
   `rejected`, `ambiguous`, or `incomplete`, with optional bounded notes and
   confidence.

The two Panes must use the same canonical instrument and current shared Replay
clock. Their registered timeframes may differ, but no plugin requests sibling
Pane data. The host composes two independent evidence citations against one
accepted Workspace/cutoff snapshot.

Visual co-presence alone never satisfies the Setup. An SMA line touching or
crossing an FVG has no inferred relationship. The user deliberately selects
the sources and accepts the Case; no scanner, alert, signal, confluence score,
or automatic occurrence is created.

The Campaign UI may explain missing prerequisites and deep-link to existing
host-owned plugin surfaces. It cannot auto-enable a package, silently add an
SMA, change length/style/placement, construct an FVG, or remove a source.

## Evidence Citation Contract

An `EvidenceCitationV1` is a bounded immutable receipt, not a second copy of a
plugin document. It contains only portable values needed to understand and
audit the observation:

```text
EvidenceCitationV1
|-- citationId / citationRevision
|-- evidenceRole / predicateId / predicateVersion
|-- observationContext
|   |-- Session / Workspace / Pane identities and revisions
|   |-- dataset / instrument / timeframe / Session Hours identities
|   `-- exclusive Replay cutoff / capturedAt
|-- providerIdentity
|   |-- package / Contribution / Profile-or-type / Definition versions
|   `-- package generation and schema/definition/provenance digests
|-- sourceReference
|   |-- owner kind / record or instance id / exact revision
|   `-- source evidence or result-frame digest
|-- boundedClaim
|   |-- normalized values needed by the predicate
|   `-- predicate result and human acceptance source
|-- sourceAvailabilityAtCapture
`-- receiptDigest
```

It contains no raw Bar arrays, complete Artifact payload, complete calculated
series, screenshot, native Chart handle, DOM/Canvas value, plugin function,
mutable owner handle, filesystem path, network reference, or private package
state.

The FVG citation points to the exact Annotation document/entity revision and
records only the normalized direction/type/observation identity needed by this
Setup predicate. Annotation Runtime remains authoritative for the Artifact,
geometry, attributes, evidence history, and archival state.

The SMA citation points to the exact calculated-series document/instance
revision and accepted ready frame. Because result points are intentionally not
persisted by H120, the host-issued receipt additionally freezes only the
observed close, SMA value, comparison result, eligible Bar time, input/frame
identity, and result/provenance digest. It does not turn the Campaign into a
calculation cache and cannot repaint the line.

Changing an SMA setting, moving/hiding the instance, revising/archiving the FVG,
or advancing Replay after capture never mutates an accepted citation. A
correction creates a new Study Case revision or replacement citation with
attributed history; it never silently edits what was observed.

## Capture Transaction And No-Future Boundary

Case capture is explicit and outside the Replay visible-commit critical path:

1. the UI dispatches `prepareStudyCase` with Campaign/definition revisions and
   selected public source identities;
2. the Campaign runtime freezes the already accepted Workspace and exclusive
   Replay cutoff without requesting Bars or moving Replay;
3. host evidence adapters query exact immutable FVG and SMA public snapshots;
4. each adapter validates source type/version/revision, eligibility, provider
   generation, Pane identity, dataset, and cutoff, then emits a portable
   receipt candidate;
5. the runtime validates the Setup predicates and user classification, prepares
   its own persistence candidate, and rechecks that every source identity is
   still current;
6. one Campaign-document revision commits or the prior bytes/state are restored
   exactly; source plugin documents and Chart surfaces are never participants
   because capture does not mutate them.

Source changes, Replay movement, Pane replacement, package generation change,
late query result, missing FVG, non-ready/hidden SMA, wrong SMA length, future
point, direction mismatch, stale document, or persistence conflict produces no
accepted Case revision. The user may retain an explicit `incomplete` draft only
through a separate command which records the unavailable reason and does not
qualify the Setup.

Outcome Bars are not visible to the decision-evidence adapters. Later Outcome
capture receives its own explicit observation window and cannot rewrite the
Setup classification or citation cutoff.

## Minimal Outcome Definition

The only specified Outcome policy is
`demo.directional-first-touch-path@1.0.0`. At the decision cutoff the user
records:

- direction;
- one reference price;
- one invalidation price;
- one target price;
- a bounded number of execution-timeframe Bars for the later observation
  horizon.

For long, `invalidation < reference < target`; short reverses the inequality.
After the user explicitly advances/reveals Replay and requests Outcome capture,
a pure domain helper receives a host-supplied immutable eligible Bar window. It
does not request/cache Bars or move Replay. It produces:

- `target-first`;
- `invalidation-first`;
- `same-bar-ambiguous` when one OHLC Bar contains both and intrabar order is
  unknowable at the available source resolution;
- `horizon-expired` when neither is reached;
- `incomplete-data` when the declared window cannot be proven complete;
- bounded MFE/MAE and time-to-first-touch when determinable.

This is a historical path observation, not an order, fill, position, P&L,
slippage model, broker simulator, or financial recommendation. It deliberately
refuses to guess same-Bar sequencing. Alternative partials, trailing stops,
multiple exits, fees, position sizing, and counterfactual exit policies require
later versioned Outcome Definitions and are excluded from this demo.

## Study Case Lifecycle

One `StudyCaseV1` binds:

- exact Campaign, Setup Definition, and Outcome Definition revisions;
- instrument, source resolution, Session/Workspace/Pane identities, and
  observation Replay cutoff;
- ordered immutable decision-time Evidence Citations;
- qualification class, author, confidence, notes, and revision history;
- the ex-ante reference/invalidation/target/horizon plan;
- a distinct later Outcome Evidence record and its observation cutoff/window;
- source-verification history and stable diagnostics.

The specified states are:

```text
draft
  -> observation-recorded
    -> outcome-recorded
      -> finalized
```

`rejected`, `ambiguous`, and `incomplete` are qualification classes, not
discarded drafts. A finalized Case is immutable; an attributable superseding
revision is required for correction. Deleting or archiving a source Artifact
or instance after finalization never cascades into Case deletion.

If a required plugin disappears after `observation-recorded`, the user can
still record the later Outcome because decision evidence is already frozen.
The Case shows source verification unavailable but does not lose its chronology
or become retrospectively unqualified.

## Frozen Cohort And Deterministic Statistics

A `StudyCohortV1` freezes exact Case ids/revisions, Setup/Outcome versions,
inclusion/exclusion policy, manual overrides with reasons, author/time, parent
Cohort, and a complete content digest. A live filtered list may aid navigation,
but an Analysis Run consumes only a frozen Cohort.

The first deterministic metric set is deliberately small:

- total Case count;
- counts by qualification class;
- counts by Outcome class;
- `resolvedFirstTouchCount`;
- `targetFirstRate = target-first / resolvedFirstTouchCount`;
- same-Bar ambiguous, horizon-expired, incomplete-data, and source-unavailable
  counts shown beside every rate;
- median MFE, MAE, and time-to-first-touch only over explicitly reported
  eligible subsets.

No Case is silently removed because a plugin is absent. Historical source
availability is a disclosed dimension, not an invisible filter. A metric that
requires current source re-execution must stop as unavailable; metrics derived
only from frozen Case/Outcome values remain reproducible without live plugins.

Every aggregate cell carries its exact Cohort, metric implementation version,
denominator, included Case revisions, excluded Case revisions/reasons, and a
drill-down index. “Win rate,” causation, expectancy, profitability, strategy
optimization, and statistical significance are not claimed by this demo.

## Raw-Context Drill-Down

Selecting a Case or aggregate member dispatches existing host commands to open
the referenced Session and restore the exact recorded Workspace/Panes at the
observation cutoff. The Session Store, Workspace Transaction, Replay Runtime,
Bar Data Runtime, and Chart owner perform their normal work; the Campaign UI
does not write their state directly and does not create a second Replay/chart
product.

When exact source plugins are available, the UI may request a read-only
verification and highlight the cited FVG/SMA through existing public selection
or legend mechanisms. When they are absent, the raw Bars and Campaign citation
remain visible with a clear source-unavailable explanation; missing plugin
pixels are never reconstructed from the citation receipt.

Opening chart context does not mutate the Case. Re-verification writes only an
append-only `SourceVerificationV1` result after explicit user action. A match,
mismatch, absent source, incompatible version, changed dataset, or missing
record is reported distinctly and never rewrites the original citation.

## Plugin And Business-Module Lifecycle Matrix

| Event | FVG/SMA production behavior | Existing business records | New/open workflow behavior |
| --- | --- | --- | --- |
| Campaign module absent/disabled | both plugins operate exactly as today | Campaign bytes remain untouched but UI/runtime is unavailable | no Campaign capture/statistics; Replay and plugins remain fully usable |
| FVG disabled or package absent | tool and FVG projections are removed; Annotation-owned Artifact remains unresolved/read-only under its contract | Cases/Cohorts/Analysis Runs and FVG citation receipts remain | new FVG-required capture and current FVG verification are unavailable; an already observed Case may still record Outcome |
| SMA disabled or package absent | calculation and pixels stop; exact instance wire remains unresolved under H120 | Cases/Cohorts/Analysis Runs and SMA observation receipts remain | new SMA-required capture and current recalculation verification are unavailable; no cached line is painted |
| both source plugins absent | neither plugin runs or projects | complete business history and frozen statistics remain readable with unavailable-source counts | no new qualified Case; raw-context drill-down still uses Session/Replay/Bars |
| cited FVG archived or SMA instance removed | ordinary owner command affects only that source | citation remains and reports archived/missing source on verification | no cascade delete; new capture needs another exact eligible source |
| settings or source revision changes | plugin follows its own normal transaction | prior citations remain pinned to old revisions | new capture uses the new exact revision; prior Case is not silently recomputed |
| exact compatible re-enable/reinstall | plugin resolves through its own lifecycle and recalculates/reprojects current truth | history remains byte-identical | explicit verification may append a match; no automatic Case rewrite |
| incompatible/new semantic version | old source bytes/references remain unresolved unless an owner-approved migration exists | old Cases/Cohorts remain under old Definition versions | no guessed migration; adopting new meaning requires a new Setup Definition version |
| one plugin fails | the other plugin and base Replay remain isolated and usable | historical records remain | only predicates requiring the failed source become unavailable |

Package disable is the current Core behavior; future quarantine/uninstall uses
the same survival rule when such distribution tiers are separately authorized.
Removing a plugin means removing live capability, never erasing historical
research truth owned elsewhere.

## Required Owner Boundaries

The later implementation slice must use focused modules with explicit
ports rather than a broad route controller:

| Boundary | Allowed responsibility | Forbidden responsibility |
| --- | --- | --- |
| pure Validation Study contract/domain | branded records, canonical validation, hashes, Setup/Outcome predicates, Cohort and metric calculations | mutable runtime, DOM, storage, Chart, Bars, Replay, plugin access |
| removable Validation Campaign runtime | sole Campaign/Definition/Case/Cohort/Analysis revisions and commands | Annotation/calculated-series writes, plugin lifecycle, raw Bar requests, Chart writes |
| evidence-provider adapters | translate exact public FVG or SMA snapshots into one common receipt candidate | private imports, source mutation, cached owner handles, generic semantic inference |
| outcome input adapter | request an already admitted bounded outcome window through a host-owned public evidence port | Bar Data provider calls, cache ownership, Replay movement |
| Campaign persistence adapter | versioned bytes, CAS, reversible prepare/finalize/rollback, corruption reporting | product meaning, plugin bytes, source-record mutation |
| Campaign UI | host-rendered Campaign list, Case capture/review, Cohort/Analysis, drill-down intents | direct state writes, plugin enablement/settings, Chart/Replay/Bar mutation |
| audit export adapter | deterministic portable bundle from immutable Campaign revisions | Dataset Builder, model format, remote upload, raw Bars by default |

The composition root may register exact FVG and SMA evidence adapters. The
generic Campaign runtime consumes a provider registry keyed by versioned
evidence contract identities; it contains no `if FVG` or `if SMA` branch.
Future providers require their own adapter/conformance evidence and do not edit
the Campaign owner.

Source packages never import Campaign contracts. Their manifests, module
dependencies, runtime APIs, persistence, settings, projections, performance,
and product surfaces remain unchanged. The Campaign module is an optional
consumer, never a reverse dependency of FVG or SMA.

The first demo is a first-party removable product module, not a public Setup
Workflow Plugin. Public workflow contribution/Profile/SDK semantics remain
unaccepted and cannot be inferred from this internal modular boundary.

## Persistence, State Sync, And Hydration

Campaign data requires its own versioned namespace because a Campaign spans
Sessions and is not Session configuration, Annotation state, or a calculated-
series document. One persistence owner stores only Campaign-owned records and
source citations. It never places Campaign bytes inside a plugin package,
Annotation document, calculated-series sidecar, or Session checkpoint.

The later implementation specification must select exact keys and bounded
record/resource ceilings compatible with the current state-service per-value
and request limits. Local durable success remains immediate. Adding an exact
Campaign prefix to Server State Sync requires an explicit allowlist change and
must reuse capture/apply/conflict/backup/rollback behavior rather than add a
network client.

Hydration order is tolerant: Campaign records may load before source documents
or packages. They begin `source-resolution-pending`, then become available or
unavailable after exact owner generations settle. They are never deleted
because one device lacks a package. Cross-device source absence is disclosed.

Every Campaign mutation is exact-revision CAS and reversible. A persistence or
state-sync failure does not roll back Replay, FVG, SMA, or Workspace because
the command does not mutate them. An unprovably restored Campaign store poisons
only the optional Campaign capability and leaves the workstation usable.

## Portable Audit Export

The demo may export one deterministic local audit bundle containing:

- Campaign, Setup, Outcome, Case, Cohort, Analysis, and verification records;
- exact source identities/revisions/digests and no-future cutoffs;
- metric definitions, denominators, inclusion/exclusion reasons, and lineage;
- known market-data source/revision/resolution and rights metadata;
- an explicit declaration of omitted raw Bars, plugin package bytes,
  screenshots, credentials, native objects, and private paths.

The export is not a Dataset Builder, training package, train/validation split,
AI prompt bundle, public corpus, remote synchronization protocol, or import
format. Raw Bars and images are excluded by default. Any later import, model-
ready transformation, data sharing, or remote upload requires separate schema,
rights, privacy, conflict, and authorization decisions.

## Minimal Product Surface

The specified user experience reuses one workstation:

1. create/open a Validation Campaign from a small Campaign surface;
2. inspect the exact Setup and Outcome Definition versions;
3. open an existing Replay Session and assign visible context/execution Panes;
4. satisfy prerequisites using the ordinary FVG and SMA product surfaces;
5. choose **Capture Study Case**, review both evidence receipts, classify the
   observation, and record the ex-ante path plan;
6. continue Replay normally and later choose **Record Outcome**;
7. finalize the Case, freeze a Cohort, run the fixed metric set, and select any
   count/member for raw-context drill-down;
8. export the local audit bundle.

The surface must distinguish `Ready`, `Incomplete`, `Source unavailable`,
`Source mismatch`, `Outcome pending`, `Finalized`, and `Historical—verification
unavailable`. It must never display a missing provider as a failed strategy or
silently hide affected Cases.

Campaign capture may take a bounded UI interaction lease while its review
dialog is open. Ordinary Replay controls, chart drag/wheel/crosshair, plugin
settings, and FVG editing remain unchanged otherwise. Analytics and export run
outside visible Replay transactions and cannot stall candle publication.

## Required Automated Evidence For A Later Implementation

No Harness id is registered by this specification acceptance. A later accepted
implementation-slice specification must preserve at least:

1. minimal-core and FVG/SMA production boot with the complete Campaign feature
   removed and unchanged plugin/runtime revisions;
2. Campaign boot and historical-record readability with FVG absent, SMA absent,
   both absent, Annotation source pending, and calculated document pending;
3. exact long/short FVG + SMA citation capture with Definition/settings/frame/
   Artifact/Pane/dataset/cutoff identity closure;
4. stale Workspace, future point, hidden/non-ready SMA, wrong length, wrong
   direction, archived FVG, changed package generation, and CAS collision
   producing zero accepted qualified Case writes;
5. source receipts containing no raw series/Bar arrays, private payloads,
   callbacks, native handles, DOM/Canvas, owner references, or plugin code;
6. Observation/Decision and later Outcome evidence separation with deliberate
   future-leak negative controls;
7. target-first, invalidation-first, same-Bar ambiguity, horizon expiry,
   incomplete data, MFE/MAE, and deterministic repeat fixtures;
8. exact revision rollback at each Campaign persistence phase without changing
   source plugin, Annotation, calculated-series, Session, Replay, Workspace,
   Bar Data, or Chart writer revisions;
9. finalized Case survival across package disable, instance removal, Artifact
   archive, both-plugin absence, exact re-enable, incompatible version, hard
   reload, and cross-device hydration;
10. frozen Cohort identity, honest qualification/outcome/unavailable counts,
    exact rate denominator, deterministic Analysis Run, and no silent exclusion;
11. raw-context drill-down through existing Session/Workspace/Replay commands,
    including source-available and source-unavailable states;
12. byte-deterministic audit export, rights/source metadata, and verified
    absence of raw Bars, plugin bytes, credentials, native state, and AI data;
13. accessible keyboard/focus/responsive behavior and clear degraded-state copy
    in real Chromium;
14. bounded representative Campaign/Case/Cohort performance off the Replay
    critical path, lifecycle disposal, optional-removal matrix, architecture,
    sole-writer, source-quality, state-sync, and production regression gates.

Positive-only evidence is insufficient. At least one deliberately stale source,
one missing provider, one incompatible provider version, one same-Bar ambiguous
Outcome, one state-sync conflict, and one corrupted Campaign document must fail
with their exact intended diagnostic.

## Required Focused Human Review For A Later Implementation

Human review should verify:

1. FVG and SMA remain understandable and fully usable without a Campaign;
2. creating a Campaign does not silently enable, add, configure, move, hide, or
   remove either plugin;
3. one long and one short Case clearly show the exact selected SMA/FVG evidence
   and observation cutoff;
4. incomplete/ambiguous/rejected Cases are easy to retain and are not counted
   as qualified by accident;
5. advancing Replay and recording Outcome never changes what the user knew at
   the observation cutoff;
6. same-Bar target/invalidation ambiguity is honest rather than guessed;
7. Cohort statistics show exact denominators and every number drills to the
   correct raw chart context;
8. disabling FVG, SMA, and both leaves historical Cases/statistics readable,
   blocks only affected new capture/verification, and never deletes data;
9. exact re-enable restores source availability without rewriting old Cases;
10. hard reload, a second device without one provider, and audit export remain
    understandable, local-first, and free of orphan or misleading states.

The material decisions are accepted. A separately authorized implementation
slice and its later focused product-owner human review remain mandatory before
any implementation can close.

## Explicit Exclusions

This accepted specification does not authorize or include:

- implementation, a delivery/Harness id, or changes to production schemas,
  modules, manifests, source, persistence allowlists, routes, or fixtures;
- modification of FVG or SMA identity, formula, semantics, settings, UI,
  persistence, projection, enablement, or lifecycle;
- another plugin or algorithm, EMA, MACD, RSI, BSL/SSL, MSS, displacement, OB,
  Fibonacci, detector, alert, scan, signal, ranking, or confluence engine;
- generic multi-Plot/layout P1c.4, P1b.4, Community registry, Worker execution,
  Pine migration, Marketplace, or public Setup Workflow SDK/Profile;
- automatic Session search, automatic Setup occurrence detection, automatic
  FVG creation, automatic SMA instance creation, or background case mining;
- Journal trade import, Setup Case, order, fill, position, P&L, broker,
  simulated execution, slippage, commissions, risk sizing, partials, or
  alternative exit optimization;
- a full Research Project, Training, Trading Review, deliberate-practice
  program, Agent, LLM, provider, recommendation, or autonomous decision;
- Dataset Builder, model-ready schema, training/evaluation splits, public
  corpus, remote upload, team/collaboration, or hosted SaaS;
- raw Bar redistribution, screenshot truth, unstructured tag/prose-only truth,
  or claims of causation/profitability/statistical validity;
- copying complete Annotation, calculated-series, Session, Journal, or plugin
  payloads into Campaign storage;
- direct feature-to-feature control, plugin-private imports, a second Bar
  requester, Replay owner, Chart writer, Annotation writer, calculated-series
  writer, Session store, or state-sync client.

## Ten Material Decisions — Accepted Without Amendment

The product owner accepted decisions 1–10 below on 2026-08-19. Their accepted
meaning remains exactly the bounded meaning reviewed in the candidate draft.

1. **One product tracer bullet:** use only accepted
   `first-party.fair-value-gap@1.0.0` and
   `first-party.moving-averages@1.0.0`/SMA(close) to prove one Campaign → Study
   Case → Outcome → Cohort → statistics → drill-down → audit-export loop; add
   no plugin or algorithm.
2. **Selected first business records:** use `ValidationCampaign`, versioned
   `SetupDefinition`/`OutcomeDefinition`, `EvidenceCitation`, `StudyCase`,
   immutable `StudyCohort`, `AnalysisRun`, and append-only
   `SourceVerification`; defer Journal `SetupCase` and the full Research/
   Training/Review system.
3. **Asymmetric independence:** FVG/SMA never depend on or receive commands from
   the Campaign feature; the Campaign is a removable consumer of immutable
   public evidence receipts. A Setup's provider requirement affects new capture
   only and is not a package lifecycle dependency.
4. **Frozen evidence truth:** every citation binds exact source/package/
   Definition/instance-or-Artifact revision, Workspace/Pane/dataset/timeframe,
   values/digests, and exclusive Replay cutoff; it copies no complete source
   payload and strictly separates Observation/Decision from later Outcome.
5. **No-loss removal semantics:** disable/uninstall/absence removes live plugin
   tools/calculation/projection under existing owners but never deletes or
   silently reclassifies business records. Existing statistics remain readable
   with unavailable-source counts; new capture/reverification fails closed;
   exact reinstall may verify but never rewrite history.
6. **One deliberate Setup template:** same-instrument context/execution Panes,
   visible ready SMA(close,20), direction-aligned manual accepted FVG, and
   explicit human qualification form the only demo Setup; visual overlap is no
   confluence and no occurrence is automatically found.
7. **One honest Outcome policy:** record direction/reference/invalidation/
   target/horizon ex ante, then compute only a later first-touch path outcome,
   MFE/MAE, and time-to-event; same-Bar order is ambiguous and no trade fill,
   P&L, partial, or optimization is claimed.
8. **Frozen, traceable analytics:** Analysis Runs consume immutable Cohorts,
   expose exact denominators and excluded/unavailable counts, and drill every
   aggregate member through existing Session/Workspace/Replay owners to raw
   chart context.
9. **Separate local-first ownership:** one removable Campaign runtime and
   persistence namespace own only business records; provider adapters are
   read-only, persistence/state sync is reversible and separately allowlisted,
   export is a bounded audit bundle rather than Dataset Builder, and removal
   leaves Replay/plugins unchanged.
10. **Acceptance does not authorize implementation:** this acceptance binds the
    specified product/architecture scope but does not allocate or implement a
    delivery/Harness, start P1c.4/P1b.4, add another plugin, authorize
    Community/Worker/AI/Journal/Dataset work, or change H117; every repository-
    changing implementation step requires a later explicit instruction.

## Required Sequence After Acceptance

Acceptance of all ten decisions is not implementation authority. The next
possible action is a separately authorized implementation-slice specification,
which must select the delivery/Harness id, exact public schemas/commands,
storage keys and ceilings, state-sync change, module descriptors, diagnostics,
transaction phases, browser fixture, performance budgets, and focused human
gate. Drafting that implementation-slice specification also requires an
explicit later product-owner instruction.

P1c.4 remains the next required dependency **inside the calculated-series
expansion program**, but it is not automatically the next overall product
delivery. This accepted business specification consumes
only the already accepted single-Plot SMA and FVG paths. MACD or another real
plugin remains later and separately gated.

## Acceptance Record

- deciding authority: product owner;
- accepted: 2026-08-19, without amendment to decisions 1–10;
- durable record:
  `../sessions/session_20260819_fvg_sma_validation_campaign_study_case_demo_specification_acceptance.md`;
- allocation: none; no delivery or Harness id exists for this specification;
- implementation: not authorized;
- preserved scope: the Context/Execution Pane roles remain local to
  `demo.sma-trend-manual-fvg@1.0.0`; the separate MEMO-V7-005 Dashboard,
  multi-dataset Chart application, visual grammar, text, and Setup-free
  Phenomenon Study questions remain open and are not imported here;
- unchanged gates: H117 remains `executable`, human-review-required, and
  unaccepted; P1c.4/H121, P1b.4, other plugins, Community/Worker, Journal,
  Dataset Builder, AI, and all production work remain paused.
