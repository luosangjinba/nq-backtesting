# V7 FVG + SMA Validation Campaign / Study Case R14.1/H121 Implementation Slice — Accepted Specification

Status: all ten material decisions accepted without amendment on 2026-08-19;
`R14.1` and H121 remain proposed labels only and are not allocated or
registered; no production implementation is authorized

Drafted: 2026-08-19 03:02 PDT

Accepted: 2026-08-19 03:54 PDT

Parent specification:
`V7_FVG_SMA_VALIDATION_CAMPAIGN_STUDY_CASE_DEMO_SPEC.md`, accepted without
amendment on 2026-08-19

Proposed scope: one removable local-first business vertical slice from
Validation Campaign creation through Study Case evidence capture, later
Outcome, frozen Cohort, deterministic Analysis Run, raw-context drill-down, and
portable audit export, using only the already accepted FVG and SMA(close)
capabilities

## Authority And Allocation Hold

The accepted parent specification ended with this exact next boundary:

> The next possible action is a separate product-owner instruction to draft
> the implementation-slice specification.

The product owner then stated:

> 授权以上动作

In context, this authorizes this candidate specification, its durable session
record, and documentation/governance synchronization. It does not authorize
production schemas, modules, storage, state-sync, routes, fixtures, or Harness
changes.

The product owner subsequently stated:

> R14.1/H121 候选规格 1–10 全部接受。

This accepts every material decision below without amendment and makes this
document the binding implementation specification for the bounded slice.
Accepted decision 10 remains controlling: specification acceptance is not
implementation authority and does not allocate/register the proposed labels.

The candidate proposed the program label `R14.1` and Harness H121. They remain
deliberately **unallocated and unregistered** after specification acceptance.
In particular:

- `R14` denotes removable Validation Campaign business vertical slices;
- `R14.1` would denote this one accepted-parent-spec tracer bullet;
- H121 would be its automated plus focused-human acceptance gate;
- no H121 row may be added to `v7-harness-rules.json` before a later explicit
  implementation instruction;
- the previously discussed P1c.4 remains a separate, unallocated calculated-
  series expansion and receives no Harness number from this specification;
- this specification acceptance does not implement the slice; only a later
  explicit implementation instruction could allocate R14.1,
  register H121 as executable, and change production code.

H117 remains `executable`, human-review-required, and unaccepted. Nothing in
this draft refreshes its baseline or changes its status.

## Bound Product Result

If separately accepted and implemented, this slice must let a local user:

1. create one bounded Campaign using the exact seeded Setup and Outcome
   Definitions from the parent specification;
2. select an existing visible SMA(close,20) instance and accepted manual FVG,
   review exact no-future evidence, and deliberately record a qualified,
   rejected, ambiguous, or incomplete Study Case;
3. advance Replay normally and later record the bounded first-touch Outcome
   without changing decision-time evidence;
4. finalize immutable Case revisions, freeze exact Case revisions into a
   Cohort, and run the fixed deterministic metric set;
5. inspect every aggregate denominator and member, then open the cited raw
   Session/Workspace/Replay context through existing owners;
6. disable or remove either evidence provider without losing historical
   records or changing existing statistics; and
7. export one deterministic local audit JSON document.

This is not a generic workflow builder. It implements exactly
`demo.sma-trend-manual-fvg@1.0.0` and
`demo.directional-first-touch-path@1.0.0` as versioned host seed data. A
different Setup, Outcome policy, plugin, automatic detector, Journal workflow,
Dashboard, capital curve, Chart-applied dataset, or AI pipeline is outside the
slice.

## Existing-Capability And Ecosystem Check

The drafting review checked the current official Lightweight Charts 5.2 plugin
documentation and repository plugin examples, plus the current
awesome-tradingview inventory:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

The official extension points are Custom Series and Series/Pane Primitives.
They extend rendering below a Chart owner; they do not supply a Campaign,
Study Case, immutable Cohort, no-future evidence receipt, deterministic
analysis lineage, or source-removal survival contract. The official repository
also characterizes plugin examples as proof-of-concept starting points rather
than production workflow owners.

The awesome-tradingview inventory provides charting libraries, indicators,
brokers, data sources, and other ecosystem references, but no item replaces
V7's accepted Session, Replay, Bar Data, Annotation, calculated-series,
Workspace, or evidence-provenance owners. No external production dependency is
selected. In particular, this slice adds no Lightweight Charts primitive,
native Series, chart synchronization helper, second chart writer, data
requester, or generic journal dependency.

## Binding Ownership Rules

The following closures are non-negotiable:

- only `core.bar-data-runtime` requests and caches Bars;
- only `core.replay-runtime` owns cursor and reveal state;
- only `core.workspace-transaction-runtime` changes accepted Workspace truth;
- only Chart Snapshot Application and its adapter-private descendants write
  native Chart surfaces;
- only Annotation Runtime writes Annotation documents and Semantic Artifacts;
- only calculated-series runtime/persistence own calculated-series documents
  and instances;
- only the proposed Validation Campaign runtime writes Campaign documents;
- UI dispatches commands and subscribes to immutable state;
- FVG and SMA never import a Campaign module, register a business callback, or
  change lifecycle because Campaign is present;
- Campaign never imports package-private FVG/SMA code, changes either source,
  copies a complete source document, or waits on a source subscription for
  correctness.

The implementation may add a narrow, package-neutral read-only observation
query to the existing Annotation manual-workflow and calculated-series public
facades. That seam may expose only frozen portable snapshots already owned by
those facades. It may not expose runtime handles, storage adapters, native
objects, mutable internal state, or Campaign-specific predicate logic.

## Exact Proposed Module Graph

The slice consists of exactly eight new removable modules. Versions are frozen
at `1.0.0` for this accepted specification.

| Module | Sole owner | Required ports | Optional ports | Lifecycle |
| --- | --- | --- | --- | --- |
| `optional.validation-study-domain` | `validation-study-domain` | none | none | none |
| `adapter.validation-campaign-persistence` | `validation-campaign-persistence` | `optional.validation-study-domain`, `adapter.session-persistence` | none | none |
| `adapter.validation-fvg-evidence` | `validation-evidence-adapter` | `optional.validation-study-domain`, `core.plugin-contract`, `optional.annotation-manual-workflow` | none | none |
| `adapter.validation-sma-evidence` | `validation-evidence-adapter` | `optional.validation-study-domain`, `core.plugin-contract`, `core.calculated-series-contract`, `optional.calculated-series-runtime` | none | none |
| `adapter.validation-outcome-window` | `validation-outcome-window-adapter` | `optional.validation-study-domain`, `core.bar-data-contract`, `core.bar-data-runtime`, `core.replay-contract`, `core.replay-runtime`, `core.session-hours-domain` | none | none |
| `adapter.validation-campaign-audit-export` | `validation-campaign-audit-export` | `optional.validation-study-domain` | none | none |
| `optional.validation-campaign-runtime` | `validation-campaign-runtime` | `optional.validation-study-domain`, `adapter.validation-campaign-persistence`, `adapter.validation-outcome-window`, `adapter.validation-campaign-audit-export` | `adapter.validation-fvg-evidence`, `adapter.validation-sma-evidence` | `dispose` |
| `adapter.validation-campaign-ui` | `validation-campaign-ui` | `optional.validation-study-domain`, `optional.validation-campaign-runtime`, `core.browser-async-contract` | none | `start`, `stop`, `dispose` |

`adapter.session-application` may receive the runtime/UI as optional ports and
wire UI output intents to existing application commands through one focused
composition helper. It must not gain Campaign domain logic. Omitting the UI
omits its dependent Campaign closure; omitting either evidence adapter leaves
the runtime usable in a degraded historical-read mode. Omitting the entire
eight-module closure leaves production FVG, SMA, Session, Replay, Workspace,
Bar Data, Chart, state sync, and their persisted bytes unchanged.

The two evidence adapters present the same frozen
`ValidationEvidenceProviderV1` API:

```text
providerId
providerVersion
evidenceRole
getAvailability(request) -> AvailabilityV1
prepareCitation(request, signal) -> EvidenceCandidateV1
verifyCitation(request, signal) -> VerificationCandidateV1
dispose? -> absent in V1
```

The only registered tuples are
`(validation.evidence.manual-fvg, 1.0.0, execution-fvg)` and
`(validation.evidence.sma-close, 1.0.0, context-sma)`. These are host adapter
identities, not package identities.

Host composition supplies a sorted frozen provider array. The Campaign runtime
validates unique `(providerId, providerVersion, evidenceRole)` tuples and looks
up only identities named by the Setup Definition. Its source contains no
FVG/SMA conditional branch. A missing, duplicate, incompatible, or throwing
provider becomes an attributed availability result; it cannot prevent the
runtime from hydrating historical Campaign data.

This internal provider contract is not a Plugin Profile, public SDK,
Marketplace surface, or permission model. Generalizing it is outside R14.1.

## Canonical Value Rules

Every public value in this slice is a deeply frozen plain JSON value with a
strict exact-key schema. Validators reject unknown keys, inherited enumerable
keys, accessors, functions, symbols, sparse arrays, cycles, non-finite numbers,
unsafe integers, and unpaired Unicode surrogates.

- schema ids and versioned identities are exact lowercase ASCII contract ids;
- record ids are lowercase RFC 4122 UUIDv4 strings generated by an injected id
  factory; tests inject deterministic ids;
- epoch values are non-negative safe integers in UTC milliseconds from an
  injected clock;
- user strings are Unicode NFC, contain no C0 controls except newline in notes,
  and use code-point/UTF-8 byte ceilings below;
- enum strings are lowercase ASCII and closed;
- binary64 results preserve their exact JSON number, canonicalize `-0` to `0`,
  and reject `NaN`/infinity;
- digests are lowercase `sha256:` plus exactly 64 hexadecimal characters;
- canonical JSON recursively sorts object keys by Unicode code point, preserves
  array order, emits no insignificant whitespace, and UTF-8 encodes the result;
- a `contentDigest` covers the record with only that field omitted;
- ids, timestamps, revisions, and digests are host-issued, never trusted from
  UI input.

All revisions start at `1`, increment by exactly one, and remain positive safe
integers. No schema performs coercion, automatic rename, timezone conversion,
deduplication, or best-effort repair.

Common references are exact closed values:

```text
definitionRef: id / version / contentDigest
caseRef: caseId / caseRevision / caseContentDigest
cohortRef: cohortId / cohortRevision / cohortContentDigest
citationRef: citationId / citationRevision / citationContentDigest
```

Here `version` is a semantic-version string and record `revision` is the
positive integer mutation history. Neither may substitute for the other.

## Exact Public Schemas

The only public schema ids are:

| Schema id | Version | Purpose |
| --- | --- | --- |
| `v7.validation-campaign-index` | 1 | bounded list of Campaign ids |
| `v7.validation-campaign-document` | 1 | one aggregate and all immutable history |
| `v7.validation-campaign` | 1 | Campaign identity/configuration |
| `v7.validation-setup-definition` | 1 | exact Setup predicate policy |
| `v7.validation-outcome-definition` | 1 | exact later Outcome policy |
| `v7.validation-evidence-citation` | 1 | frozen decision-time source receipt |
| `v7.validation-study-case` | 1 | one immutable Case revision |
| `v7.validation-study-cohort` | 1 | frozen exact Case-revision selection |
| `v7.validation-analysis-run` | 1 | deterministic aggregate and drill-down |
| `v7.validation-source-verification` | 1 | append-only current-source check |
| `v7.validation-raw-context-intent` | 1 | immutable output intent for existing owners |
| `v7.validation-audit-bundle` | 1 | deterministic export-only envelope |

Nested exact values use the same validator but do not create separately stored
top-level record types.

### `ValidationCampaignIndexV1`

Exact fields:

```text
schema / version / revision
campaignIds[]
updatedAtEpochMs
contentDigest
```

`campaignIds` is unique and lexicographically sorted. The index contains no
title, status, statistics, plugin availability, or duplicated Campaign truth.

### `ValidationCampaignDocumentV1`

Exact fields:

```text
schema / version / documentRevision
campaign
setupDefinitions[]
outcomeDefinitions[]
caseRevisions[]
cohorts[]
analysisRuns[]
sourceVerifications[]
createdAtEpochMs / updatedAtEpochMs
contentDigest
```

Arrays are in stable `(createdAtEpochMs, id, revision)` order, except source
verifications which use `(checkedAtEpochMs, verificationId)`. There is exactly
one Campaign, one Setup Definition, and one Outcome Definition in R14.1. The
Definition records are immutable seed copies. Changing the Setup/Outcome
meaning creates a new Campaign; R14.1 provides no Definition editor or
migration command.

`caseRevisions` retains full immutable revisions. A newer revision does not
replace earlier bytes. Cohorts always point to exact retained revisions.

### `ValidationCampaignV1`

Exact fields:

```text
schema / version
campaignId / revision
title / status
instrumentId / contextTimeframeId / executionTimeframeId / sessionHoursId
direction
setupDefinitionRef / outcomeDefinitionRef
authorLabel
createdAtEpochMs / updatedAtEpochMs / archivedAtEpochMs
contentDigest
```

`status` is `active` or `archived`; `archivedAtEpochMs` is null only while
active. `direction` is `long` or `short`. No ordering constraint is imposed on
the two timeframe ids: the terms Context and Execution express Setup roles,
not a universal higher-timeframe rule.

### `SetupDefinitionV1`

Exact fields:

```text
schema / version
setupDefinitionId / setupDefinitionVersion
templateId / templateVersion
contextRole / executionRole
smaPredicate
fvgPredicate
humanClassificationPolicy
contentDigest
```

R14.1 freezes:

```text
templateId: demo.sma-trend-manual-fvg
templateVersion: 1.0.0
contextRole: context-pane
executionRole: execution-pane
smaPredicate:
  providerId: validation.evidence.sma-close
  providerVersion: 1.0.0
  definitionId: moving-averages.sma.close
  definitionVersion: 1.0.0
  source: close
  length: 20
  requiredState: ready-visible
  longComparison: close-above-sma
  shortComparison: close-below-sma
fvgPredicate:
  providerId: validation.evidence.manual-fvg
  providerVersion: 1.0.0
  semanticTypeId: imbalance.fvg
  semanticTypeVersion: 1.0.0
  requiredState: active-accepted
  longDirection: bullish
  shortDirection: bearish
humanClassificationPolicy:
  classes: [qualified, rejected, ambiguous, incomplete]
  explicitConfirmationRequired: true
```

Both predicates require the Campaign instrument, exact assigned Pane role,
exact Session Hours identity, and one shared exclusive Replay cutoff. They do
not require equal timeframes, visual overlap, an SMA/FVG cross, or automatic
source discovery.

### `OutcomeDefinitionV1`

Exact fields:

```text
schema / version
outcomeDefinitionId / outcomeDefinitionVersion
policyId / policyVersion / horizonUnit / minimumHorizon / maximumHorizon
terminalClasses[] / nonterminalClasses[]
mfeMaePolicy / timeToFirstTouchPolicy / sameBarPolicy
contentDigest
```

R14.1 freezes:

```text
policyId: demo.directional-first-touch-path
policyVersion: 1.0.0
horizonUnit: execution-bars
minimumHorizon: 1
maximumHorizon: 2000
terminalClasses: [target-first, invalidation-first, same-bar-ambiguous]
nonterminalClasses: [horizon-expired, incomplete-data]
mfeMaePolicy: direction-aware-absolute-points-through-terminal-or-horizon
timeToFirstTouchPolicy: one-based-execution-bar-count
sameBarPolicy: never-infer-intrabar-order
```

### `EvidenceCitationV1`

Exact fields:

```text
schema / version
citationId / citationRevision
evidenceRole / predicateId / predicateVersion
observationContext
providerIdentity
sourceReference
boundedClaim
sourceAvailabilityAtCapture
capturedAtEpochMs
receiptDigest / contentDigest
```

`observationContext` contains exactly:

```text
sessionId / sessionRevision
workspaceRevision / workspaceDigest
paneId / paneRevision / paneRole
datasetId / datasetRevision / instrumentId / timeframeId / sessionHoursId
exclusiveReplayCutoffEpochMs
latestEligibleBarStartEpochMs
```

`providerIdentity` contains exactly:

```text
providerId / providerVersion
packageId / packageVersion / packageGeneration
contributionId / contributionVersion
definitionOrSemanticTypeId / definitionOrSemanticTypeVersion
schemaDigest / definitionDigest / provenanceDigest
```

Nullable package/contribution fields are allowed only for host-owned portions
explicitly marked null by the provider schema; missing keys are never allowed.

`sourceReference` contains exactly:

```text
ownerKind
sourceDocumentId / sourceDocumentRevision
sourceRecordId / sourceRecordRevision
resultFrameId / resultFrameRevision
sourceDigest / resultDigest
```

FVG uses Annotation document/entity identities and null result-frame fields.
SMA uses calculated-series document/instance and accepted result-frame
identities. `boundedClaim` is one of two exact unions:

```text
SMA claim:
  claimKind: sma-close-comparison
  close / sma / comparison / comparisonPassed
  valueBarStartEpochMs / length / visible / readiness

FVG claim:
  claimKind: manual-fvg-observation
  direction / lifecycle / acceptance
  evidenceBarStartEpochMs[3]
  lowerPrice / upperPrice
  predicatePassed
```

The citation contains no raw Bar object, complete Artifact, complete
calculated-series frame, style/settings payload beyond `length`, screenshot,
native handle, function, DOM/Canvas value, private state, filesystem path, URL,
or mutable owner reference. `receiptDigest` covers the normalized provider
candidate before Campaign ids/timestamps; `contentDigest` covers the complete
citation.

### `StudyCaseV1`

Exact fields:

```text
schema / version
caseId / caseRevision / supersedesCaseRevision
campaignId / acceptedDocumentRevision
setupDefinitionRef / outcomeDefinitionRef
lifecycleState / qualificationClass
observationContext
evidenceCitations[]
predicateResults[]
pathPlan
outcomeObservation
confidence / notes / authorLabel
createdAtEpochMs / updatedAtEpochMs / finalizedAtEpochMs
contentDigest
```

`lifecycleState` is `draft`, `observation-recorded`, `outcome-recorded`, or
`finalized`. `supersedesCaseRevision` is null for revision 1 and the exact prior
revision otherwise. `finalizedAtEpochMs` is non-null only when finalized.

`pathPlan` contains exact `direction`, finite `referencePrice`,
`invalidationPrice`, `targetPrice`, and `horizonBars`. Long requires
`invalidationPrice < referencePrice < targetPrice`; short requires the reverse.

`outcomeObservation` is null before Outcome. Otherwise it contains exactly:

```text
policyId / outcomeClass
decisionCutoffEpochMs / outcomeCutoffEpochMs
firstEligibleBarStartEpochMs / lastObservedBarStartEpochMs
observedBarCount / horizonBars / coverageState
terminalBarStartEpochMs / timeToFirstTouchBars
mfePoints / maePoints
barWindowDigest / calculationDigest
recordedAtEpochMs
```

Drafts may contain zero, one, or two citations and explicit unavailable
predicate results. `observation-recorded` requires exactly two valid citations.
A `qualified` observation requires both frozen predicates to pass plus explicit
human confirmation. Rejected/ambiguous observations may preserve two valid
receipts while explaining the human classification. `incomplete` is never
silently promoted.

Corrections append a complete superseding Case revision. A finalized revision
is never mutated or deleted.

### `StudyCohortV1`

Exact fields:

```text
schema / version
cohortId / cohortRevision
campaignId / name
setupDefinitionRef / outcomeDefinitionRef
parentCohortRef
memberCaseRefs[] / excludedCaseRefs[]
selectionPolicy / manualOverrideReasons[]
authorLabel / createdAtEpochMs
contentDigest
```

Each member/exclusion reference contains exact `caseId`, `caseRevision`, and
`caseContentDigest`. Members must be finalized, unique, and retained in the
same Campaign document. Arrays are sorted by `(caseId, caseRevision)`. The
selection policy is the exact R14.1 frozen predicate `all-finalized-revisions`
plus explicit manual include/exclude reasons; no live query is stored as Cohort
truth.

### `AnalysisRunV1`

Exact fields:

```text
schema / version
analysisRunId / analysisRunRevision
campaignId / cohortRef
metricSetId / metricSetVersion / sourceAvailabilitySnapshot
counts / rates / medians
metricLineage[] / drilldownIndex[]
authorLabel / createdAtEpochMs
contentDigest
```

`metricSetId` is `demo.validation-first-touch-descriptives` and
`metricSetVersion` is `1.0.0`. `counts` contains total,
each qualification class, each Outcome class, `resolvedFirstTouchCount`, and
`sourceUnavailableCount`. `rates` contains only `targetFirstRate`, represented
as exact numerator, denominator, and nullable binary64 value. `medians`
contains MFE, MAE, and time-to-first-touch values plus exact eligible Case
references; values are null for empty subsets.

`sourceAvailabilitySnapshot` freezes one result per citation/provider at run
time. Provider absence changes only a later run's disclosed availability count;
it never changes the frozen Cohort or an earlier Analysis Run.

Every `metricLineage` entry states metric version, numerator Case refs,
denominator Case refs, excluded refs/reasons, and result digest. The
`drilldownIndex` maps every displayed count/rate/median to the exact Case refs
used. The UI must not label any value “win rate,” expectancy, profitability,
causation, or significance.

### `SourceVerificationV1`

Exact fields:

```text
schema / version
verificationId / verificationRevision
campaignId / caseRef / citationRef
providerId / providerVersion
result / observedSourceReference
reasonCode / detail
checkedAtEpochMs
contentDigest
```

`result` is `match`, `mismatch`, `source-absent`, `provider-absent`,
`incompatible-version`, `dataset-mismatch`, or `record-missing`. Verification
is explicit and append-only. `observedSourceReference` is null when no source
could be observed and otherwise uses the exact source-reference shape from the
provider. It never changes a citation, qualification, Outcome, Cohort, or
Analysis Run.

### `RawContextIntentV1`

Exact fields:

```text
schema / version
campaignId / caseRef / contextRole
sessionId / sessionRevision
workspaceRevision / workspaceDigest
datasetId / datasetRevision / instrumentId / sessionHoursId
exclusiveReplayCutoffEpochMs
paneIntents[] / sourceSelectionIntents[]
contentDigest
```

`contextRole` is `observation` or `outcome`. Pane intents contain only recorded
Pane id/role/timeframe and accepted public Workspace configuration needed by
the existing Workspace Transaction; source-selection intents contain only
portable source ids/revisions. This value is an output request, not authority.
Application composition must dispatch ordinary Session/Workspace/Replay
commands and handle their own CAS/errors. Campaign code does not directly open
a Session, move Replay, request Bars, or write a Chart.

### `ValidationAuditBundleV1`

Exact fields:

```text
schema / version
exportedAtEpochMs / exportFormatId
exportFormatVersion
campaignDocument
metricDefinitions[]
sourceAndRightsMetadata
omissions[]
payloadDigest
```

`exportFormatId` is `v7.validation-campaign-audit-json` and
`exportFormatVersion` is `1.0.0`. `payloadDigest`
covers the canonical bundle with only that field omitted. Export is a
download-only JSON file named `v7-validation-campaign-audit-v1.json`; no import
or upload command exists.

## Hard Resource Ceilings

Validation occurs before hashing, persistence, publication, or download.
R14.1 freezes these independent ceilings:

| Resource | Maximum |
| --- | ---: |
| Campaigns in the index | 16 |
| distinct Case ids per Campaign | 128 |
| revisions per Case id | 8 |
| Cohorts per Campaign | 32 |
| Analysis Runs per Campaign | 32 |
| verifications per citation | 4 |
| evidence citations per Case revision | 2 |
| outcome horizon | 2,000 execution Bars |
| one outcome adapter input | 2,000 Bars and 512,000 UTF-8 bytes |
| title/name/author label | 80 Unicode code points each |
| notes | 2,000 UTF-8 bytes |
| reason/detail/manual override | 512 UTF-8 bytes each |
| confidence | null or integer 0–100 |
| one persisted Campaign document | 1,250,000 UTF-8 bytes |
| Campaign index | 64,000 UTF-8 bytes |
| all Campaign index/document values combined | 1,500,000 UTF-8 bytes |
| audit JSON | 1,500,000 UTF-8 bytes |
| concurrent evidence preparations | 1 |
| evidence preparation lease | 60 seconds |

The ceilings are conjunctive; reaching one never expands another. A command
fails before mutation with `VALIDATION_CAMPAIGN_RESOURCE_LIMIT`; no array,
string, history, receipt, Cohort, or export is silently truncated or evicted.

## Persistence And State-Sync Contract

The only persisted keys are:

```text
v7.validation-campaign:index
v7.validation-campaign:document:<campaign-id>
```

`<campaign-id>` is the exact lowercase UUIDv4 from the document. No user input
is concatenated into a key. The persistence adapter accepts/returns canonical
UTF-8 JSON bytes and provides exact `prepare`, `apply`, `finalize`, and
`rollback` phases with readback verification.

Creating a Campaign prepares the new document and index against exact prior
raw bytes, applies document then index, publishes only after both readbacks
match, and finalizes both. Any failure rolls back in reverse order to the exact
prior bytes. A failed or unprovable rollback poisons only
`optional.validation-campaign-runtime`; all Campaign mutations stop, while
Session/Replay/FVG/SMA/Chart continue normally. Hydration rejects and reports
an orphan document, missing indexed document, duplicate id, digest mismatch,
unknown schema, impossible revision graph, or ceiling violation; it never
repairs or discards bytes automatically.

All other mutations prepare and commit exactly one Campaign document key with
expected `documentRevision` and exact prior bytes. Command success linearizes
at final source/currency validation immediately before persistence `apply`.
The runtime publishes one immutable snapshot only after durable readback and
finalize. Subscriber failure is isolated and cannot determine command success.

A later separately authorized implementation must add exactly the index key
and document prefix to the existing Server State Sync allowlist. It must reuse
the existing whole-snapshot capture/apply/conflict/backup/rollback transport;
it may not add another state client, merge algorithm, background source
verification, or network dependency. Local durable success remains immediate;
server sync is later and asynchronous. A server conflict never silently merges
Campaign revisions.

Campaign hydration does not wait for FVG/SMA. Stored records first expose
`source-resolution-pending`; once optional provider availability settles they
expose exact available/unavailable states. Provider absence on another device
never deletes bytes or blocks historical read, Cohort calculation, or export.

## Exact Runtime API And Commands

`optional.validation-campaign-runtime` exposes one frozen API:

```text
execute(command, signal?) -> Promise<CommandResultV1>
listCampaigns() -> CampaignSummaryV1[]
getCampaign(campaignId) -> ValidationCampaignDocumentV1
prepareCaseObservation(request, signal?) -> Promise<CaseObservationPreviewV1>
readCase(campaignId, caseId, caseRevision?) -> StudyCaseV1
readAnalysisDrilldown(campaignId, analysisRunId, metricId) -> DrilldownV1
prepareRawContextIntent(request) -> RawContextIntentV1
prepareAuditExport(campaignId, signal?) -> Promise<ValidationAuditBundleV1>
snapshot() -> ValidationCampaignRuntimeSnapshotV1
subscribe(listener) -> unsubscribe
dispose()
```

`execute` accepts exactly these command kinds and exact user-controlled fields:

| Command kind | Required input |
| --- | --- |
| `create-campaign` | title, instrument/timeframes/Session Hours, direction, author label, expected index revision |
| `archive-campaign` | Campaign id, expected document/Campaign revisions |
| `save-incomplete-case` | Campaign/definition revisions, observation context, selected source ids when present, classification reason, path plan, confidence/notes, preview token, expected document revision |
| `commit-case-observation` | Campaign/definition revisions, `qualified`/`rejected`/`ambiguous`, explicit confirmation, path plan, confidence/notes, preview token, expected document revision |
| `record-case-outcome` | exact Case revision, explicit later Replay cutoff, expected document revision |
| `finalize-case` | exact Case revision, expected document revision |
| `supersede-case` | exact prior Case revision, corrected human/path fields, optional valid preview token when replacing evidence, reason, expected document revision |
| `freeze-cohort` | name, exact finalized Case refs, exclusions/override reasons, optional parent Cohort ref, expected document revision |
| `run-analysis` | exact Cohort ref/digest, expected document revision |
| `verify-source` | exact Case/citation refs, expected document revision |

There is no update/delete Definition, delete Case, delete Cohort, rerun old
Analysis in place, auto-capture, auto-scan, add-plugin, plugin-settings, move-
Replay, request-Bar, apply-dataset-to-Chart, or import command.

Every mutation performs strict validation and exact-revision CAS. Runtime-
issued ids and times are ignored if supplied by the caller. Cancellation before
linearization writes nothing; cancellation after linearization returns the
accepted result. Only one evidence preparation may exist; starting another
cancels and invalidates the prior preview. A preview token expires after 60
seconds and is never persisted.

## Observation Preparation And Commit

`prepareCaseObservation` is a read-only, cancellable phase:

1. validate Campaign and expected document/Definition revisions;
2. freeze the accepted Session, Workspace, Pane assignments, dataset,
   instrument, Session Hours, and shared exclusive Replay cutoff;
3. require the latest eligible context Bar and all cited FVG evidence Bars to
   satisfy `bar.startEpochMs < exclusiveReplayCutoffEpochMs`;
4. call the two generic provider ports in stable provider-id order;
5. validate provider/version/generation, source/document/record revisions,
   Pane role, dataset, timeframe, visibility/readiness/lifecycle, bounded
   claims, digests, and Setup predicates;
6. return a deeply frozen preview with provider candidates, predicate results,
   availability details, source currency fences, and one opaque preview token.

The UI must display the preview and require deliberate classification/path
confirmation. Commit then:

1. validates the exact preview token and TTL;
2. re-reads Campaign/document revision;
3. rechecks Workspace generation, Replay cutoff, package generation, and exact
   source revision/digest currency fences through the same public providers;
4. builds immutable citations and the new Case revision;
5. validates ceilings and canonical bytes;
6. performs the Campaign-only persistence transaction; and
7. publishes after finalize.

The final currency check is the command linearization fence. A source change
after that fence is later history and does not mutate the citation. A change
before it produces zero accepted Case bytes. Source documents are read-only
participants and never join the persistence transaction.

`save-incomplete-case` may preserve missing/unavailable evidence and its exact
reason. It cannot create `observation-recorded`, cannot set `qualified`, and
cannot be selected as a finalized Cohort member until a later explicit
superseding revision completes the observation.

## Exact No-Future Outcome Algorithm

Outcome recording is a later explicit operation. It never reopens or rewrites
decision evidence.

The outcome adapter receives one immutable request from the Campaign runtime
and calls only the public Bar Data Runtime. The adapter never calls a provider
or cache directly. The request is bounded to the Case instrument, execution
timeframe, Session Hours, interval
`[decisionCutoffEpochMs, requestedOutcomeCutoffEpochMs)`, and at most the first
2,000 eligible Bars. The Replay owner must prove that
`requestedOutcomeCutoffEpochMs <= currentExclusiveReplayCutoffEpochMs`.

Only Bars satisfying both of these tests are admitted:

```text
bar.startEpochMs >= decisionCutoffEpochMs
bar.startEpochMs < requestedOutcomeCutoffEpochMs
```

Bars are strict ascending, unique, finite OHLC values with
`low <= min(open, close) <= max(open, close) <= high`. Provider coverage and
dataset revision are frozen in the window digest. Whitespace is not a Bar and
never receives an inferred price.

For each eligible Bar in ascending order, stopping at the first terminal Bar or
the declared `horizonBars`:

- long target touch: `high >= targetPrice`;
- long invalidation touch: `low <= invalidationPrice`;
- short target touch: `low <= targetPrice`;
- short invalidation touch: `high >= invalidationPrice`;
- target only produces `target-first`;
- invalidation only produces `invalidation-first`;
- both on the first terminal Bar produce `same-bar-ambiguous` with no guessed
  intrabar sequence;
- neither after exactly `horizonBars` proven-complete eligible Bars produces
  `horizon-expired`;
- an owner-attributed irrecoverable coverage gap or end-of-dataset before the
  terminal/horizon can be proven produces `incomplete-data`;
- fewer revealed Bars without a terminal and without proven incomplete
  coverage produces no Outcome revision and
  `VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED`.

For a complete non-incomplete result, MFE/MAE use all Bars through and including
the terminal or horizon Bar:

```text
long MFE = max(0, max(high - referencePrice))
long MAE = max(0, max(referencePrice - low))
short MFE = max(0, max(referencePrice - low))
short MAE = max(0, max(high - referencePrice))
```

`timeToFirstTouchBars` is the one-based offset of `target-first` or
`invalidation-first`; it is null for same-Bar ambiguous, horizon-expired, and
incomplete-data. MFE/MAE are null only for incomplete-data. No OHLC ordering is
invented, and no fill, trade, stop execution, P&L, fees, slippage, size, partial,
or counterfactual is computed.

## Case Lifecycle And Corrections

Allowed transitions are exact:

```text
draft -> observation-recorded
observation-recorded -> outcome-recorded
outcome-recorded -> finalized
```

`save-incomplete-case` creates or supersedes only `draft`.
`commit-case-observation` creates or supersedes `observation-recorded`.
`record-case-outcome` appends `outcome-recorded`; `finalize-case` appends
`finalized`. Every transition is a new complete Case revision linked to the
prior revision. Existing revisions remain byte-identical.

A finalized Case has no transition. `supersede-case` creates a new draft or
observation-recorded replacement revision with an explicit reason; it never edits
the finalized revision. Without a preview token it reuses the prior citations
byte-for-byte and may change only classification/path/confidence/notes. Replacing
evidence requires a current `prepareCaseObservation` token and the complete
currency-fenced commit path. A Cohort already pointing to the older revision
remains unchanged. There is no cascade from source archive/removal, Campaign
archive, or provider loss.

## Cohort And Analysis Rules

A Cohort freezes only exact finalized Case revisions. Its source selection may
start from `all-finalized-revisions`, but the persisted truth is the explicit
sorted member/exclusion lists and reasons. A superseding Case is not
automatically substituted.

The pure domain helper calculates:

- total Case count;
- counts for qualified, rejected, ambiguous, and incomplete;
- counts for target-first, invalidation-first, same-bar-ambiguous,
  horizon-expired, and incomplete-data;
- `resolvedFirstTouchCount = target-first + invalidation-first`;
- `targetFirstRate = target-first / resolvedFirstTouchCount`, or null when the
  denominator is zero;
- the current provider-unavailable citation/Case count, disclosed independently
  from every frozen behavioral count;
- median MFE, MAE, and time-to-first-touch over their exact non-null eligible
  Case subsets.

Median sorts finite values ascending; an odd count selects the middle value and
an even count uses the binary64 arithmetic mean of the two middle values,
normalizing `-0` to `0`. Every output stores its exact Case-reference subset and
digest. Ambiguous, horizon-expired, incomplete-data, rejected, incomplete, and
source-unavailable counts remain visible next to `targetFirstRate`; none is
silently folded into or removed from its denominator.

An Analysis Run freezes the current availability snapshot. Re-enable or removal
may change a later run's availability disclosure, but it does not mutate the
earlier run and cannot change record-derived metrics.

## Source Removal, Re-Enable, And Verification

The exact degraded behavior is:

| State | Existing history | New qualified capture | Outcome on already observed Case | Current verification |
| --- | --- | --- | --- | --- |
| Campaign closure absent | bytes untouched; UI unavailable | unavailable | unavailable through Campaign UI | unavailable |
| FVG provider absent | readable/exportable | blocked | allowed | provider-absent |
| SMA provider absent | readable/exportable | blocked | allowed | provider-absent |
| both absent | readable; record-derived analysis works | blocked | allowed | provider-absent |
| source record removed/archived | citation unchanged | exact source ineligible | allowed | record-missing or mismatch |
| exact provider returns | no automatic write | allowed only with current eligible sources | allowed | explicit match may append |
| incompatible provider returns | unchanged | blocked | allowed | incompatible-version |

No provider lifecycle event subscribes into Campaign correctness. Availability
is sampled on hydration, explicit preparation, analysis, or verification. It
never deletes, silently upgrades, reclassifies, or changes a denominator.

## Product UI And Raw-Context Drill-Down

The slice adds two application routes:

```text
#/campaigns
#/campaigns/<campaign-id>
```

The UI contains only:

- Campaign list/create/archive;
- exact Setup and Outcome Definition summary;
- Case list and capture-review dialog;
- Outcome/finalize actions;
- Cohort freeze form;
- fixed statistics table with exact denominators and member drill-down;
- source-availability/verification history;
- raw-context intent action; and
- local audit export.

The Replay route may display transient Campaign/Case navigation context, but it
does not own or persist Campaign truth. `RawContextIntentV1` is handed to
application composition, which uses existing Session, Workspace Transaction,
Replay, Bar Data, and Chart flows. Stale/missing Session, dataset, Pane, or
source is an explicit unavailable result. If exact providers are available,
existing public source selection/highlight behavior may be requested; if not,
the UI shows Bars plus citation metadata and never reconstructs missing plugin
pixels.

Campaign adds no Chart Series, Primitive, marker, price line, text, entry/stop/
target rendering, SetupVisualGroup, calendar, win-rate card, capital curve, or
multi-dataset Chart application. Those are open MEMO-V7-005 product decisions
and are not imported into R14.1.

The surface must be keyboard-complete, restore focus after dialogs, announce
busy/error/degraded states, use visible labels rather than color alone, retain
readability at 620 CSS pixels, and never disable ordinary Replay/chart/plugin
interaction outside the bounded capture review lease.

## Deterministic Audit Export

`prepareAuditExport` reads one immutable Campaign snapshot and metric
definitions, validates all digests/ceilings, and produces canonical JSON. It
includes exact Campaign/Definition/Case/Cohort/Analysis/Verification records,
source identities/digests/cutoffs, metric lineage, known dataset revision and
source/rights metadata, and an omissions declaration.

It explicitly excludes raw Bars, screenshots, plugin package bytes, plugin
code, credentials, cookies, tokens, native Chart/DOM/Canvas state, filesystem
paths, private provider payloads, AI prompts/embeddings/labels, and remote
references. Export does not persist new Campaign state, does not upload, and
does not define an import format.

## Stable Diagnostics

Public failures use `ValidationCampaignError` with exact `code`, safe `message`,
`operation`, nullable Campaign/Case/source identity, and optional frozen safe
details. Stack traces, native errors, paths, raw records, bytes, callbacks, and
credentials never enter UI state or persistence.

The stable V1 codes are:

```text
VALIDATION_CAMPAIGN_DISPOSED
VALIDATION_CAMPAIGN_BUSY
VALIDATION_CAMPAIGN_POISONED
VALIDATION_CAMPAIGN_REVISION_STALE
VALIDATION_CAMPAIGN_PREPARATION_STALE
VALIDATION_CAMPAIGN_PREPARATION_EXPIRED
VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE
VALIDATION_CAMPAIGN_SOURCE_MISMATCH
VALIDATION_CAMPAIGN_SOURCE_CHANGED
VALIDATION_CAMPAIGN_WORKSPACE_STALE
VALIDATION_CAMPAIGN_REPLAY_CUTOFF_CHANGED
VALIDATION_CAMPAIGN_QUALIFICATION_INVALID
VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED
VALIDATION_CAMPAIGN_OUTCOME_WINDOW_INCOMPLETE
VALIDATION_CAMPAIGN_CASE_STATE_INVALID
VALIDATION_CAMPAIGN_CASE_FINALIZED
VALIDATION_CAMPAIGN_COHORT_INVALID
VALIDATION_CAMPAIGN_ANALYSIS_INPUT_STALE
VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT
VALIDATION_CAMPAIGN_PERSISTENCE_CAS_STALE
VALIDATION_CAMPAIGN_PERSISTENCE_WRITE_FAILED
VALIDATION_CAMPAIGN_ROLLBACK_UNPROVEN
VALIDATION_CAMPAIGN_RESOURCE_LIMIT
VALIDATION_CAMPAIGN_EXPORT_FORBIDDEN_VALUE
VALIDATION_CAMPAIGN_RAW_CONTEXT_UNAVAILABLE
```

Provider/adaptor failures retain the stable outer code plus attributed
provider id and a normalized safe reason. The runtime never converts a missing
source into a generic application or chart-update error.

## Performance And Replay Isolation Budgets

Reference timing is measured after warmup in the existing Chromium/Node
Harness environment and reported rather than used as a flaky single-sample
gate. Deterministic input/operation ceilings remain the hard gate.

| Operation | Representative input | Reference budget |
| --- | --- | ---: |
| pure outcome calculation | 2,000 Bars | <= 10 ms |
| pure metric run | 128 Case revisions | <= 25 ms |
| canonical parse/validate/digest | 1.5 MB total Campaign bytes | <= 100 ms |
| canonical audit build | 1.5 MB output ceiling | <= 100 ms |
| local commit excluding user/provider wait | one bounded Case revision | <= 50 ms |

Campaign work runs outside Replay visible publication and Chart Snapshot
Application transactions. R14.1 adds zero Bar/Replay/Workspace/Chart writer
sites, zero native chart objects, and zero per-Bar Campaign subscription. A
Campaign calculation may yield between bounded chunks in the browser, but it
must never delay candle publication or playback correctness.

## Proposed H121 Automated Evidence

No H121 Harness or registry row exists at specification acceptance. If a later
implementation instruction allocates R14.1/H121, H121 must be executable,
human-review-required, and initially unaccepted. It must prove at least:

1. exact eight-module descriptor graph, lifecycle disposal, public-import
   closure, and optional removal with unchanged FVG/SMA/Replay revisions;
2. strict schema/canonical JSON/digest golden fixtures and rejection of unknown
   fields, hostile objects, forbidden values, bad revisions, and every ceiling;
3. exact long and short no-future SMA/FVG capture with provider, package,
   source, Pane, dataset, timeframe, Session Hours, and cutoff closure;
4. zero accepted write for stale Workspace/cutoff/source, future point, hidden
   or non-ready/wrong-length SMA, archived/wrong-direction FVG, missing or
   incompatible provider, and expired preparation;
5. citation privacy fixture proving absence of raw Bars/series, complete source
   payloads, functions, native/DOM/Canvas objects, paths, URLs, and private
   handles;
6. target-first, invalidation-first, same-Bar ambiguous, horizon-expired,
   incomplete-data, pending-not-revealed, long/short MFE/MAE, and deterministic
   repeat Outcome fixtures;
7. exact Case transition/superseding history, finalized immutability, and frozen
   Cohort references to older retained revisions;
8. deterministic count/rate/median/denominator/drill-down fixtures including
   zero denominator, rejected/ambiguous/incomplete, and unavailable sources;
9. persistence CAS failure at every apply/finalize/rollback phase, exact-byte
   restoration, poison isolation, corrupted/orphan document diagnosis, and no
   source/Session/Replay/Workspace/Bar/Chart revision change;
10. FVG absent, SMA absent, both absent, pending hydration, exact re-enable,
    incompatible return, Artifact archive, and instance removal with no-loss
    historical readability and no automatic rewrite;
11. hard reload and existing server-state-sync capture/apply/conflict/backup/
    rollback behavior with exact allowlist scope and second-device provider
    absence;
12. raw-context intent through existing application commands in both source-
    available and source-unavailable states, with no direct writer call;
13. byte-deterministic audit JSON and verified exclusion of Bars, packages,
    credentials, paths, native state, remote upload, and AI data;
14. real production-route Chromium evidence, accessibility/keyboard/focus,
    1280x800 and 620px responsive fixtures, performance reports, architecture,
    writer-closure, source-quality, state-sync, H114, H118, H119, and H120
    regressions.

The browser fixture uses deterministic Bars and existing deterministic manual
FVG/SMA paths. It must prove that Campaign list/capture/outcome/Cohort/
statistics/drill-down/export work on the production route, FVG/SMA pixels stay
unchanged while Campaign UI opens/closes, ordinary Replay remains usable, and
no console/page errors occur. Positive-only evidence is insufficient: the
fixture must include at least one deliberately stale source, missing provider,
incompatible provider version, same-Bar ambiguous Outcome, state-sync
conflict, and corrupted Campaign document.

H121 must report H117's status without accepting or changing it. No baseline,
fixture fingerprint, or generated Developer Kit artifact may be refreshed as
a side effect.

## Proposed Focused Human Gate

After automated H121 passes, a human must execute and accept all ten checks:

1. remove the full Campaign closure and confirm ordinary FVG, SMA, Replay, and
   Session behavior is unchanged;
2. create one Campaign and confirm it does not auto-enable, add, configure,
   move, hide, or remove either plugin;
3. capture one long and one short observation and confirm the selected sources,
   values, direction, Pane roles, and exclusive cutoff are understandable;
4. retain rejected, ambiguous, and incomplete Cases and confirm none is
   accidentally presented as qualified;
5. advance Replay, record Outcome, and confirm decision-time evidence remains
   byte/visually unchanged;
6. inspect a same-Bar target/invalidation fixture and confirm the product says
   ambiguous rather than guessing OHLC order;
7. freeze a Cohort, run statistics, inspect the exact denominator, and drill
   each aggregate/member to the correct raw chart context;
8. disable FVG, SMA, and both; confirm history/statistics/export remain readable
   while only affected new capture/verification is blocked;
9. re-enable exact providers and confirm explicit verification may append but
   no Case, Cohort, Analysis, or citation is rewritten; and
10. hard reload, inspect a second-device/provider-missing fixture, export JSON,
    and verify both desktop/narrow layouts remain understandable and local-
    first.

Automated passage is not human acceptance. R14.1 remains open until the product
owner explicitly accepts this focused review after implementation.

## Explicit Exclusions

This accepted specification does not authorize or include:

- production implementation, Harness registration, allocation, or acceptance;
- P1c.4, P1b.4, another plugin/algorithm, Community/Worker, Marketplace, or a
  public workflow/Profile/SDK;
- automatic Setup detection, scanning, alerts, signals, source creation,
  plugin enablement, or plugin settings changes;
- Journal trades, orders, fills, positions, broker simulation, P&L, capital,
  fees, slippage, risk sizing, partials, trailing exits, or optimization;
- Dashboard/calendar/capital curves, multi-dataset Chart application, visual
  grammar, text annotations, entry/stop/target rendering, SetupVisualGroup, or
  Setup-free Phenomenon Study from MEMO-V7-005;
- Dataset Builder, import, sharing, collaboration, remote upload, model-ready
  labels, Agent/LLM/AI, recommendation, or autonomous trading;
- raw Bar redistribution, screenshots as evidence truth, source payload copies,
  or claims of profitability/statistical validity;
- direct feature-to-feature control, package-private imports, another state-
  sync client, or a second Bar, Replay, Workspace, Chart, Annotation, or
  calculated-series writer.

## Ten Material Decisions — Accepted Without Amendment

The product owner accepted decisions 1–10 below on 2026-08-19. Their meaning
remains the exact bounded meaning reviewed in the candidate draft.

1. **Proposed allocation:** reserve the unallocated labels R14.1/H121 for this
   exact accepted-parent-spec tracer bullet only after later implementation
   authority; keep P1c.4 separate and unnumbered for now.
2. **Exact removable ownership:** accept the eight-module graph, sole Campaign
   writer, public-only read adapters, optional provider ports, and complete
   removal without changing FVG/SMA/Replay behavior.
3. **Exact bounded records:** accept the strict V1 schemas, immutable full Case
   revisions, one immutable seeded Setup/Outcome pair per Campaign, canonical
   hashes, exact keys, and hard resource ceilings.
4. **Asymmetric evidence capture:** accept the internal generic provider API,
   one 60-second preparation, final source currency fence, no plugin mutation,
   and missing-provider degradation rather than fallback or historical loss.
5. **No-future Case/Outcome semantics:** accept the explicit classifications,
   lifecycle, later first-touch algorithm, same-Bar ambiguity, MFE/MAE and
   one-based time-to-touch definitions, and absence of fill/P&L inference.
6. **Frozen Cohort analytics:** accept exact finalized Case revisions,
   deterministic counts/rate/medians, explicit zero denominator and unavailable
   source disclosure, and complete metric-to-Case drill-down lineage.
7. **Local-first durability:** accept the index/document namespace, reversible
   CAS phases, Campaign-only poison isolation, separately allowlisted reuse of
   existing whole-state sync, tolerant provider hydration, and no silent merge,
   repair, truncation, or deletion.
8. **Bounded UI/drill-down:** accept only Campaign/Case/Outcome/Cohort/fixed-
   stats/export surfaces and immutable raw-context intents through existing
   owners; explicitly leave all MEMO-V7-005 dashboard/chart-application/visual
   questions open.
9. **Acceptance evidence:** accept the proposed H121 negative/positive,
   production-browser, performance, security, optional-removal, regression,
   and ten-step focused-human gates, while keeping H117 unchanged.
10. **Acceptance is not implementation authority:** reviewing or accepting
    decisions 1–10 does not implement or allocate R14.1/H121, edit the Harness
    registry, start P1c.4 or P1b.4, add another plugin, import MEMO-V7-005, or
    authorize Community/Worker/Journal/Dataset/AI; implementation requires a
    separate explicit product-owner instruction.

## Acceptance Record

- deciding authority: product owner;
- accepted: 2026-08-19 03:54 PDT, without amendment to decisions 1–10;
- durable acceptance record:
  `../sessions/session_20260819_fvg_sma_validation_campaign_r14_1_implementation_slice_specification_acceptance.md`;
- allocation: none; R14.1/H121 remain proposed and unregistered;
- implementation: not authorized;
- unchanged: H117 remains executable, human-review-required, and unaccepted;
  P1c.4, P1b.4, another plugin, Community/Worker, Journal, Dataset Builder, AI,
  and MEMO-V7-005 remain outside authority.

## Exact Next Boundary

The next possible action is a separate explicit product-owner instruction to
allocate and implement only this accepted R14.1/H121 slice. Until such an
instruction, no implementation plan, production code, schema/module directory,
state-sync allowlist, route, fixture, or H121 registry entry may be created.
