# V7 Calculated-Series Pure Contract Slice — Accepted Specification

Status: accepted binding pure-contract specification; pure-contract delivery
P1c.1 and H118 accepted on 2026-08-13 after focused human contract/evidence
review; SDK availability and runtime/Chart authority remain unauthorized

Drafted: 2026-08-12

Decision date: 2026-08-12

Decider: V7 product owner

Upstream decisions: accepted `ADR-V7-006` and accepted `ADR-V7-005`

Accepted scope on 2026-08-12: the first required delivery slice in ADR-V7-005;
portable contracts and headless evidence only; acceptance itself authorized no
implementation

Implementation authorization: separately granted 2026-08-13 for the pure
contract slice only

## Product-Owner Direction

The product owner directed:

> 起草 V7 Calculated-Series Pure Contract Slice 候选规格；不实施，不启动P1b.4，不变更 H117 状态。

That instruction authorized the reviewable draft and its documentation records
only. The later acceptance recorded below makes its ten material decisions
binding, while authorizing no production, SDK, schema, catalog, fixture,
migration, Harness, UI, Chart, persistence, or runtime changes.

## Purpose

ADR-V7-005 requires a pure-contract slice before Chart projection, a trusted
MA/SMA vertical slice, generic multi-Plot/layout work, or Community execution.
This specification freezes what that first slice must implement if it is later
separately authorized:

- the first host-governed Contribution Profile registry seam;
- an exact `analysis.calculated-series` Profile reference and descriptor;
- versioned calculated-series definitions, standard Plots, Plot Groups, Scale
  intent, instances, Chart Regions, results, projection frames, provenance,
  diagnostics, limits, and migrations;
- strict reconciliation with the existing P0a contribution `kind` without
  silently treating `indicator` as a Contribution Profile;
- portable, immutable, vendor-neutral values and deterministic headless
  conformance evidence.

The slice creates no formula engine and no visual behavior. Its outcome would
be a contract which later trusted Core and Community execution adapters must
share, not an Indicator feature visible to users.

## Binding Upstream Constraints

This specification preserves all accepted boundaries:

- a Plugin Package is not a Contribution, and a Contribution is not a
  Contribution Profile;
- the Profile set is open but host-governed, namespaced, and versioned;
- one Contribution has one unambiguous primary truth/lifecycle Profile;
- capabilities, Domain Tags, Developer Kit Contract Profiles, Package Contract
  Profiles, and Core Plugin Profiles remain separate concepts;
- Main versus internal Chart Region is user-owned instance placement, not an
  Indicator type;
- Core and future Community Contributions claiming the same calculated-series
  Profile share semantic contracts;
- trust changes admission, executor, isolation, and resources, not definition,
  result, Plot, Scale, instance, or migration meaning;
- only the Chart adapter may later create or mutate native Chart, pane, Series,
  Scale, reference-line, Primitive, Canvas, or DOM resources;
- every result and future visible frame must bind the exact accepted Workspace
  Pane snapshot and Replay cutoff, with no stale values beside newer candles;
- P1b Installed packages remain inactive and non-executing.

The accepted source decisions are
`V7_PLUGIN_CONTRIBUTION_PROFILES_AND_COMPOSITION_SPEC.md` and
`V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md`.

## Existing Repository Boundary

The current repository already has several similarly named but different
contracts:

| Existing concept | Current meaning | This specification must not reinterpret it |
| --- | --- | --- |
| P0a `contributions[].kind` | coarse built-in manifest metadata: `drawing`, `indicator`, `semantic-type`, `tool`, or `workflow` | it is not a Profile id and grants no runtime authority |
| `trusted-built-in-core-v1` | P1a Developer Kit Contract Profile | it describes available tooling/conformance, not contribution truth |
| `local-declarative-package-v1` | P1b Package Contract Profile | it has no executable contribution or activation target |
| `CorePluginProfile` | host-owned package/default settings and enablement state | it is not a Contribution Profile or Scale Profile |
| Workspace Pane | an independent product chart with instrument, timeframe, Viewport, and shared Replay context | it is not an internal calculated-series Chart Region |
| Projected Pane snapshot | accepted candle/provenance input owned by existing projection and Chart-application contracts | it is not an Indicator result and must not be copied into plugin state |

P1a currently reports Indicator calculation, sub-pane projection, external
execution, and Worker lifecycle as unavailable. This specification preserves that
honesty. A later pure-contract implementation may make schemas inspectable as
contract artifacts, but it must not report an executable or trusted-build
calculated-series capability.

## Official And Ecosystem Capability Check

The repository pins `lightweight-charts@5.2.0`. The 2026-08-12 review checked:

- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://github.com/tradingview/awesome-tradingview>

The official API can create a Series in a pane, move a Series between panes,
move/resize panes, inspect pane Series/price scales, preserve an empty pane, and
remove a pane. An empty native pane may otherwise disappear when its last
Series moves away. The API also exposes custom Series and Pane Primitives.

Those are projection mechanics, not portable product truth. This specification
therefore stores stable V7 ids and declarative intent only. Numeric pane
indices, native pane/Series/PriceScale handles, `HTMLElement`, custom renderers,
Primitive callbacks, and vendor option objects are forbidden. The ecosystem
inventory supplies patterns and calculation-adapter candidates only; this
specification adopts no external dependency or third-party lifecycle owner.

## Accepted Module And Ownership Boundary

A later implementation should establish two focused pure modules rather than
adding another responsibility to the existing package-oriented
`plugin-contract` module:

```text
contribution-profile-contract
  owns: descriptor/ref values, exact host registry resolution, lifecycle
        status, compatibility result, deterministic diagnostics
  imports: no package/runtime/Chart/Workspace owner

calculated-series-contract
  owns: calculated-series definition, Plot/Scale catalogs, instance/document,
        result/frame, provenance, migration-plan values and pure validators
  imports: contribution-profile-contract and existing small value contracts
  imports no: Chart adapter, Bar Data runtime, Replay runtime, ModuleHost,
              persistence adapter, UI, Worker, filesystem, network
```

The existing `plugin-contract` remains the owner of P0a/P1b manifest and
package values. A future orchestration boundary may supply an already validated
package/contribution identity to the Profile resolver. Neither new pure module
loads a manifest, activates a package, requests Bars, reads Replay, writes
storage, or mutates a Chart.

The future public APIs should use branded immutable values for in-process
trust and exact closed wire serializers for persistence/SDK interchange.
Structural lookalikes must fail. Pure readers return deeply frozen canonical
records; canonical serialization sorts unordered identity collections and
preserves ordered semantic collections such as Plot output.

## Contribution Profile Registry Seam

The accepted design uses a generic host artifact, not a package-supplied
extension point. This local pinned contract registry is distinct from the
future P2 remote package/distribution registry:

```text
ContributionProfileRefV1 {
  profileId
  profileContractVersion
}

ContributionProfileDescriptorV1 {
  schemaVersion: 1
  profileId
  profileContractVersion
  compatibilityRange
  lifecycleStatus: active | deprecated | retired
  truthModel
  ownerContract
  definitionSchemaId
  inputContractIds[]
  outputContractIds[]
  permittedCapabilityRanges[]
  persistenceContract
  invalidationContract
  provenanceContract
  migrationContract
  conformanceSuiteId
  resourceClassContract
}
```

The first descriptor defined by this slice is exactly
`analysis.calculated-series@1.0.0`. `active` means that the host recognizes the
contract version; it does **not** mean that any executor, SDK Contract Profile,
package, or user-visible feature is available. Execution availability remains
an orthogonal P1a/P3a decision.

Registry input is a pinned host catalog. Packages cannot supply descriptors,
schemas, lifecycle owners, compatibility ranges, or resource policies. Unknown,
duplicate, package-supplied, incompatible, deprecated-without-policy, and
retired Profile references fail deterministically. Unknown Profile package
metadata and host-owned durable records may remain inspectable/unresolved, but
they cannot calculate, project, or migrate.

## P0a Contribution Reconciliation

The existing P0a `kind` remains byte- and meaning-compatible. A future exact
binding uses identity rather than inference:

```text
CalculatedSeriesContributionBindingV1 {
  schemaVersion: 1
  packageId
  packageVersion
  contributionId
  contributionVersion
  declaredKind
  profile: ContributionProfileRefV1
  definitionId
  definitionVersion
}
```

For a trusted P0a contribution, `declaredKind: indicator` may be a necessary
admission check for this V1 bridge, but it is never sufficient. The exact
host-owned binding must name `analysis.calculated-series@1.0.0` and one exact
definition. The host must reject:

- guessing a Profile from `kind`, package id, display name, Domain Tag, Plot
  shape, or familiar names such as MA/MACD/RSI/ATR;
- one contribution binding to several primary Profiles;
- one exact contribution generation binding to several active definitions;
- a definition claiming another package/contribution identity;
- mutation of Manifest V1/V2 to smuggle a Profile field into this slice.

Existing FVG semantic/tool records remain exactly as accepted. This specification
does not assign them a calculated-series Profile, dummy Profile, or migration.
The P1b local declarative manifest remains empty of contributions and execution
authority.

## Calculated-Series Definition V1

The accepted wire design is declarative and exact:

```text
CalculatedSeriesDefinitionV1 {
  schemaVersion: 1
  identity: {
    packageId
    packageVersion
    contributionId
    contributionVersion
    definitionId
    definitionVersion
  }
  profile: {
    profileId: analysis.calculated-series
    profileContractVersion: 1.0.0
  }
  parameterContract: {
    schemaId
    schemaVersion
    schemaDigest
  }
  executionSemantics: {
    deterministic: true
    noFuture: true
    incrementalMode: none | append-tail-replace
  }
  inputRequirement
  plotGroups[]
  resourceDeclaration
  migrationRefs[]
}

CalculatedSeriesInputRequirementV1 {
  source: current-workspace-pane-bars
  warmupBars
  insufficientWarmup: whitespace | unavailable
  additionalContexts: []
}

CalculatedSeriesResourceDeclarationV1 {
  maximumInputBars
  maximumOutputPoints
  maximumOutputBytes
  maximumIncrementalStateBytes
}
```

One exact package/contribution generation binds one active definition. The
separate `definitionId` remains stable across compatible definition releases;
it cannot be reused for a different formula or truth. A contribution version
change does not silently select another definition version.

`parameterContract` reuses the accepted host-rendered declarative settings
model by exact schema identity and digest. It does not introduce executable
parameter validators or a second settings precedence. Instance values still
override applicable host/package/profile defaults, which override definition
defaults under ADR-V7-004.

V1 `inputRequirement` is deliberately limited to the current Workspace Pane's
accepted Bars, instrument, timeframe, Session Hours, dataset provenance, and
Replay cutoff. It may declare a bounded warmup Bar count. Additional symbols,
timeframes, external datasets, sibling Pane state, arbitrary lookback requests,
and plugin-initiated Bar acquisition are unavailable. A future multi-context
capability requires another accepted contract version. The host supplies up to
the exact requested warmup; the definition must choose either explicit
whitespace or an unavailable result when history is insufficient.

Every resource declaration must be within the Profile ceilings and is a
maximum request, not a reservation or permission. The future executor admits a
lower budget honestly or rejects the definition; it may not silently truncate
input/output or grant more resources because a package is Core.

`incrementalMode` only declares a later conformance obligation. This slice does
not define or run an incremental executor. Any later incremental result must be
byte-equivalent to a full recomputation oracle for the same exact input.

## Standard Plot And Plot Group Contract

`PlotGroupDefinitionV1` is the atomic placement unit:

```text
PlotGroupDefinitionV1 {
  plotGroupId
  displayName
  defaultPlacement: main | own-region
  defaultRegionHeightWeight?
  scaleIntent: ScaleIntentV1
  plots[]
  referenceLines[]
}
```

V1 has one closed, host-rendered standard Plot catalog:

- `line` — one finite value or explicit whitespace per eligible time;
- `histogram` — one finite value or explicit whitespace per eligible time;
- `area` — one finite value or explicit whitespace per eligible time;
- `baseline` — one finite value or explicit whitespace per eligible time plus
  one declarative base value;
- `band` — finite lower/upper values with `lower <= upper`, or explicit
  whitespace, per eligible time;
- `reference-line` — an immutable finite Scale-local value declared separately
  from ordered time-series points.

Every Plot and reference line has a stable id, display label, visibility
default, legend intent, Scale relationship, and host-supported style record.
Style V1 is a discriminated closed portable catalog:

```text
StrokeStyleV1 {
  color: #RRGGBBAA
  width: 1 | 2 | 3 | 4
  pattern: solid | dashed | dotted
}

line      -> { stroke }
histogram -> { positiveColor, negativeColor, baseValue }
area      -> { stroke, topFillColor, bottomFillColor }
baseline  -> { baseValue, topStroke, bottomStroke,
               topFillColor, bottomFillColor }
band      -> { lowerStroke, upperStroke, fillColor }
reference-line -> { stroke, labelVisibility: visible | hidden }
```

Colors normalize to uppercase eight-digit hexadecimal values rather than CSS
syntax. Each Plot kind accepts exactly its own style fields. Per-point color,
opacity outside the color alpha channel, gradients, CSS, HTML, formatter
functions, Canvas/DOM callbacks, vendor options, and arbitrary object bags are
unavailable in V1.

Result points are discriminated exact records:

```text
ScalarPointV1 =
  { state: value, displayEpochMs, value }
  | { state: whitespace, displayEpochMs }

BandPointV1 =
  { state: value, displayEpochMs, lower, upper }
  | { state: whitespace, displayEpochMs }
```

Times must be safe integers, strictly increasing, unique within one Plot, and
members of the exact eligible input timeline. Values must be finite; `NaN`,
infinities, `-0`, future points, arbitrary offsets, and mismatched Plot kinds
fail closed. Canonical normalization converts `-0` to `0` only where zero is
otherwise valid.

Markers, candle recoloring, custom Series, Pane Primitives, custom renderers,
market-coordinate Geometry, Semantic Artifact projection, detectors, DOM,
Canvas, and executable formatting remain outside this Profile contract.

## Scale Intent And Compatibility V1

The accepted Scale wire design is structural:

```text
ScaleIntentV1 {
  schemaVersion: 1
  dimension: { dimensionId, dimensionVersion }
  unit: { unitId, unitVersion }
  transform: linear | logarithmic
  domain:
    { kind: auto }
    | { kind: fixed, minimum, maximum }
    | { kind: symmetric-around-zero, magnitude: auto | finite-positive }
  formatter: { formatterId, formatterVersion, options }
  zeroPolicy: not-required | include | forbid-nonpositive
}
```

The first generic host dimension catalog may include instrument price, price
distance, percentage, ratio, volume, and unitless values. Those are value
semantics, not Indicator classifications. Custom dimensions cannot be invented
by packages; each requires a separately accepted host catalog entry and
versioned formatter/conversion contract.

The pure compatibility resolver compares exact dimension/unit versions,
transform, domain constraints, formatter semantics, and zero policy. Fixed
domains must match exactly. `logarithmic` requires
`forbid-nonpositive`. `symmetric-around-zero` is incompatible with logarithmic.
V1 performs no implicit unit conversion, normalization, percentage coercion,
or name-based exception.

Compatibility returns a branded result with a stable code and the exact fields
which conflict. It never chooses a Chart Region, native Scale, side, or pane
index. Placement planning belongs to later instance/layout and projection
owners.

## Host-Owned Instance And Chart Region Document

The pure slice proposes one portable document contract while leaving live
ownership and persistence adapters to later slices:

```text
CalculatedSeriesWorkspaceDocumentV1 {
  schemaVersion: 1
  sessionId
  documentRevision
  workspacePanes[]: CalculatedSeriesWorkspacePaneV1
}

CalculatedSeriesWorkspacePaneV1 {
  workspacePaneId
  chartRegions[]
  scaleGroups[]
  resolvedInstances[]
  unresolvedInstances[]
}

ChartRegionV1 {
  regionId
  kind: main | calculated-series
  order
  heightWeight
  collapsed
}

ScaleGroupV1 {
  scaleGroupId
  regionId
  scaleIntent
  axisIntent: primary | auxiliary
  order
}

ResolvedCalculatedSeriesInstanceV1 {
  instanceId
  instanceRevision
  definitionRef
  parameterOverrides
  styleOverrides
  visibility
  plotGroupPlacements[]
}

PlotGroupPlacementV1 {
  plotGroupId
  regionId
  scaleGroupId
  order
}
```

Each Workspace Pane has exactly one Main Chart Region at order zero. It cannot
be removed, collapsed, or renamed by a definition. Other regions have stable
host ids and relative integer `heightWeight`; no pixel height is persisted.
Region ids, Scale Group ids, and instance ids are opaque host ids, never plugin
ids or native indices.

Every resolved instance references one exact definition and covers every
declared Plot Group exactly once. Placements may share a Scale Group only after
the structural compatibility resolver succeeds. Moving or resizing changes the
host document revision, not definition identity, parameters, input digest, or
calculation result.

`UnresolvedCalculatedSeriesInstanceV1` retains the original bounded portable
wire, exact digest, last known definition/Profile identity, reason code, and
human-readable display metadata. It is not accepted as a resolved instance and
cannot calculate, project, or migrate except through an exact admitted
migration. Unknown fields are preserved only inside this inert envelope, not
passed into a branded current-version value.

This slice defines serialization and validation only. It does not choose the
Session store schema, write IndexedDB/server state, create a live instance
owner, resolve ModuleHost generations, or add settings/UI commands.

## Exact Input, Result, And Projection Frame

The pure contract separates executor output from visible host state.

`CalculatedSeriesFrameIdentityV1` binds at least:

- Session id and exact Workspace transaction identity;
- Workspace Pane id and accepted Workspace State revision;
- accepted projected-Pane snapshot digest and dataset provenance;
- exact Replay-visible-through cutoff;
- calculated-series document and instance revisions;
- package, contribution, definition, Profile, executor, SDK, and host API
  identities;
- canonical effective-parameter and input digests.

A result cannot supply or alter that identity. The host creates it from branded
accepted inputs and the executor returns output against it.

```text
CalculatedSeriesResultV1 {
  schemaVersion: 1
  frameIdentity
  resultRevision
  state: ready | empty | unavailable | error
  plotGroups[]
  provenance
  resourceUsage
  diagnostics[]
}

CalculatedSeriesProjectionFrameV1 {
  schemaVersion: 1
  frameIdentity
  projectionRevision
  state: pending | ready | empty | unavailable | error
  plotGroups[]
  provenance
  resourceUsage
  diagnostics[]
}
```

Only `ready` carries a complete, exactly declared Plot Group/Plot set. `empty`
carries a valid complete calculation with no eligible values. `pending`,
`unavailable`, and `error` carry no Plot points. `pending` is host-created and
is never an executor result. Missing groups, partial success, extra output,
stale identity, mismatched cutoff, older instance/document revision, or foreign
package generation fail closed.

Provenance is exact and portable: dataset/source identity and revision, input
timeline digest, warmup coverage, formula/definition/package digests,
parameter digest, executor identity, calculation mode, and result ancestry.
Resource usage records admitted/actual Bars, output points/bytes, duration, and
bounded state bytes. It grants no resource authority.

The contract validator can prove identity equality and result closure, but it
does not schedule calculations or publish visible frames. Later Workspace and
projection owners must remove stale values before newer candles become visible.

## Migration And Unresolved Survival

Document-schema migration and definition-semantic migration remain distinct.
Both use exact forward-only declarative plans:

```text
CalculatedSeriesMigrationPlanV1 {
  schemaVersion: 1
  migrationId
  fromProfile
  toProfile
  fromDefinitionRef
  toDefinitionRef
  fromDocumentSchemaVersion
  toDocumentSchemaVersion
  operations[]
  expectedPlanDigest
  expectedFixtureDigests[]
}
```

V1 operations may rename a parameter, set a default only when absent,
quarantine a retired parameter, map a finite enum value, rename a Plot/Plot
Group id, and map a style token under exact preconditions. They cannot execute
code, call a package, change Profile truth, infer a destination, discard an
unmapped placement, or manufacture missing provenance.

Plans form one complete acyclic forward chain between exact versions. Gaps,
downgrades, ambiguous mappings, digest mismatches, partial output, changed
Profile id, or unsupported operations leave the original record unresolved.
The owning persistence transaction must retain original bytes until a future
implementation commits the complete migrated generation. This pure slice may
validate and simulate a migration against fixtures; it writes no durable state.

## Accepted Contract Ceilings

The first contract needs hard structural ceilings even though later executors
and projectors may advertise lower resource budgets:

| Value | Accepted V1 ceiling |
| --- | ---: |
| host Profile descriptors per registry snapshot | 64 |
| Plot Groups per definition | 8 |
| Plots per Plot Group | 8 |
| total Plots per definition | 32 |
| reference lines per Plot Group | 16 |
| Workspace Panes per document | 8 |
| Chart Regions per Workspace Pane, including Main | 8 |
| Scale Groups per Chart Region | 4 |
| calculated-series instances per Workspace Pane | 32 |
| points per Plot | 20,000 |
| total points per result | 100,000 |
| diagnostics per value | 128 |
| migration operations per plan | 32 |
| portable nesting depth / entries per collection | 8 / 128 |
| Profile-registry canonical UTF-8 bytes | 256 KiB |
| Definition canonical UTF-8 bytes | 256 KiB |
| Workspace document canonical UTF-8 bytes | 4 MiB |
| one unresolved-instance canonical wire | 64 KiB |
| one result/projection-frame canonical UTF-8 bytes | 16 MiB |
| one migration plan canonical UTF-8 bytes | 256 KiB |
| id / display label / diagnostic message characters | 128 / 96 / 320 |

Formatter options and style maps use exact catalog-owned schemas and the
portable depth/collection bounds; neither accepts an open property bag. A lower
runtime budget is an honest capability result, while raising a hard wire
ceiling requires a compatible contract revision and evidence.

## Diagnostics And Compatibility

Messages are human help, never program identifiers. Stable append-only codes
within V1 use `CONTRIBUTION_PROFILE_` or `CALCULATED_SERIES_` prefixes and carry
structured locations:

```text
CalculatedSeriesDiagnosticV1 {
  code
  severity: error | warning | info
  phase
  message
  logicalIdentity?
  jsonPointer?
  related[]
}
```

The catalog must distinguish at least:

- unknown/duplicate/incompatible/retired Profile;
- forged or inferred contribution binding;
- unsupported schema/definition/Plot/Scale/formatter/style version;
- duplicate, missing, renamed, or foreign stable identity;
- non-portable, mutable, executable, native, unknown, or oversized value;
- invalid point order/time/value/band/reference line;
- future point, cutoff mismatch, input/provenance mismatch, and stale result;
- Scale dimension/unit/transform/domain/formatter/zero incompatibility;
- incomplete Plot Group placement or invalid Main/region/Scale ownership;
- migration gap, cycle, downgrade, precondition, ambiguity, or digest failure;
- unresolved, unavailable, unsupported capability, and resource-limit state.

Diagnostics sort deterministically by phase, logical identity, location, and
code. Error messages may improve without changing machine meaning.

## Required Headless Conformance Gate

The acceptance decision itself allocated no Harness id. The later implementation
authorization assigned the next available id, H118, to one independent headless
gate covering at least:

1. exact Profile descriptor/ref validation, registry closure, and package-
   supplied descriptor rejection;
2. exact P0a identity binding while proving `kind: indicator` alone cannot
   resolve a Profile or definition;
3. canonical immutable Definition/Plot/Scale/Instance/Region/Result/Frame/
   Migration values and JSON round trips;
4. positive line, histogram, area, baseline, band, reference-line, multi-Plot,
   and multi-PlotGroup synthetic definitions without classifying a product
   Indicator;
5. a Scale compatibility matrix across dimensions, units, transforms, fixed/
   auto/symmetric domains, formatters, and zero policies;
6. exact Main-region invariants, resolved placement closure, compatible sharing,
   unresolved preservation, and zero native/vendor identity;
7. ready/empty/unavailable/error results plus pending frames, exact identity,
   complete Plot coverage, no-future points, and stale rejection;
8. forward migration simulation, original preservation, deterministic digests,
   and fail-closed gaps/downgrades/ambiguity;
9. every accepted structural and byte ceiling with boundary-positive and
   boundary-negative fixtures;
10. negative architecture controls proving no Chart, DOM, Canvas, Bar Data,
    Replay, Workspace runtime, ModuleHost, storage, filesystem, network,
    Worker, timer, or package callback enters either pure module;
11. unchanged P0a/P0b/P1a/P1b schemas, catalogs, receipts, availability,
    Installed behavior, and H117 state;
12. source-quality, production-architecture, complete existing Harness, and
    `git diff --check` regressions.

Because a later pure-contract implementation adds no DOM or pixels, its human
gate is a focused contract/evidence review rather than a visual acceptance
gate. Chart and interaction evidence begins only in the separately authorized
Chart-owned projection slice.

## Explicit Exclusions

This specification does not authorize or include implementation of:

- a formula engine, calculation scheduler, incremental state owner, Worker, or
  trusted calculation adapter;
- MA/SMA, RSI, ATR, MACD, Volume, or any real Indicator package;
- Chart Region materialization, pane/Series/Scale mapping, reference-line
  rendering, rollback, receipts, or disposal;
- a calculated-series instance runtime, persistence adapter, Session schema
  migration, settings command, Add Indicator surface, legend, or UI;
- Manifest V1/V2 Profile fields, Installed activation, Community loading,
  remote registry, signing, P2, P3a, P3b, Pine migration, or Marketplace;
- custom Series, Pane Primitives, custom renderers, markers, candle recoloring,
  Drawings, FVG/SMT/Fibonacci semantics, Semantic Artifacts, or detectors;
- a second SDK, Community-only ABI, vendor-specific persisted state, or an
  external dependency;
- P1b.4 MCP work or H117 acceptance/reclassification.

## Accepted Material Decisions

The product owner accepted these ten decisions without amendment on
2026-08-12:

1. the first slice establishes separate pure `contribution-profile-contract`
   and `calculated-series-contract` ownership boundaries; it does not add
   calculated-series logic to `plugin-contract`, route, Workspace runtime, or
   the Chart adapter;
2. the future host registry recognizes exactly
   `analysis.calculated-series@1.0.0` as an active contract descriptor while
   execution remains unavailable; P0a `kind: indicator` is never a Profile,
   and only an exact host-owned Contribution binding can select the descriptor
   and definition;
3. Definition V1 uses exact package/contribution/definition/Profile identity,
   the existing declarative parameter-contract model, deterministic/no-future
   semantics, current-Workspace-Pane Bars only, bounded warmup, and no
   additional data contexts;
4. Plot V1 is a closed host-rendered catalog of line, histogram, area,
   baseline, band, and reference-line semantics with stable ids, exact ordered
   points, closed style tokens, and no renderer/native/vendor value;
5. Scale V1 compatibility is a pure structural comparison of exact
   dimension/unit versions, transform, domain, formatter, and zero policy,
   with no name-based exception, implicit conversion, normalization, or
   placement side effect;
6. the host-owned Workspace document uses stable instance, Chart Region, Scale
   Group, and placement ids; exactly one non-removable Main region exists per
   Workspace Pane, and no pixel/native index/handle is portable state;
7. result and projection-frame contracts bind exact Workspace transaction,
   accepted Pane snapshot, Replay cutoff, document/instance revision,
   definition generation, parameters, input, and provenance; non-ready frames
   contain no stale Plot points and partial Plot output is invalid;
8. schema and definition migrations are exact, forward-only, declarative,
   digest-bound, simulated without durable writes, and failure preserves the
   original record as inert unresolved state rather than guessing or dropping
   meaning;
9. all values are closed, bounded, deeply immutable, canonically serialized,
   deterministically diagnosed, and protected by the accepted V1 ceilings plus
   a new independent headless gate whose id is allocated only after separate
   implementation authorization;
10. accepting this specification authorizes no implementation, SDK
    execution availability, Chart/UI/persistence work, real Indicator,
    Community/Worker tier, P1b.4, or H117 state change; the Chart-owned
    projection slice remains the separately specified second dependency.

## Acceptance Record

The product owner stated:

> 接受十项决策，下一步计划做什么？

This acceptance makes the ten material decisions and their pure-contract
boundaries binding. The accepted tenth decision explicitly withholds all
implementation authority.

## P1c.1 Implementation Record And Later Sequence

The product owner separately authorized implementation on 2026-08-13. P1c.1
therefore adds the two pure modules, pinned host schemas/catalogs, synthetic
fixtures, and H118 headless evidence described by this specification. H118 is
`accepted`, `humanReviewRequired: true`, and carries the focused product-owner
review in its durable `acceptanceEvidence`. The review was a contract/evidence
review rather than visual review. The implementation and acceptance record is
`../sessions/session_20260813_p1c_1_calculated_series_pure_contract_implementation.md`.

That authorization did not extend to a calculation executor, SDK availability,
live instance/persistence owner, Chart-owned projection, MA/SMA, generic layout
UI, Community/Worker execution, or P1b.4. The Chart-owned projection slice
remains the separately specified next dependency after P1c.1 acceptance, and
the trusted Core MA/SMA vertical slice cannot begin before both dependencies
are closed. Neither dependency is authorized to start by the H118 acceptance.

P1b.4 remains paused. The complete H117 record remains unchanged at
`executable`, `humanReviewRequired: true`, and `acceptanceEvidence: null`.
