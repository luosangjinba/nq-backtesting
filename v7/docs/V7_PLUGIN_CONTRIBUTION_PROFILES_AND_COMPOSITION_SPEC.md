# V7 Plugin Contribution Profiles And Composition — Accepted Specification

Decision id: `ADR-V7-006`

Status: accepted binding product and architecture specification; implementation,
SDK/schema/catalog changes, delivery ids, Harness activation, P1b.4, and
external plugin execution remain separately unauthorized

Date drafted: 2026-08-12

Decision date: 2026-08-12

Decider: V7 product owner

## Authority And Current Boundary

The product owner identified that the broad product word **plugin** was being
used as though it classified the nature of a contribution. That would place
calculated studies such as MA or MACD in the same conceptual bucket as FVG,
SMT, Fibonacci, drawings, and every future visual tool merely because all can
be authored in TypeScript, installed as packages, and projected on a Chart.

The product owner directed V7 to draft an explicit Plugin Contribution Profile
and composition model. The model must recognize the five contribution truth
models currently visible in V7's product direction while treating them as an
initial reference set, not a closed enum or permanent exhaustive taxonomy. New
Profiles must remain possible through a versioned, host-governed registry.

The product owner accepted all ten material decisions in this document on
2026-08-12. Acceptance binds the architecture and terminology but does not
change a production or Developer Kit contract, add a schema field, register a
Profile, activate an unavailable contribution, change any Core classification,
start P1b.4, or authorize implementation. Every executable consequence needs a
later accepted specification and separate product-owner authorization.

## Decision Summary

V7 should treat a plugin package as an installation and lifecycle container,
not as a business-semantics type. Each package may publish one or more stable,
typed **Contributions**. Every contribution governed by this model declares
exactly one primary **Contribution Profile**, which defines its authoritative
truth, owner, input/output shape, invalidation, persistence, provenance, and
conformance obligations. Orthogonal **Capabilities** describe negotiated ways
to calculate, interact, project, or integrate. Open **Domain Tags** support
catalog discovery but grant no authority.

The defining accepted architecture rules are:

1. `PluginPackage`, `Contribution`, `ContributionProfile`, `Capability`,
   `DomainTag`, and `Pack` are different concepts;
2. the Contribution Profile set is an open, namespaced, versioned registry
   governed by the host, never a closed `enum` or concrete-feature switch;
3. calculated series, anchored studies, drawings, semantic artifacts, and
   detectors are the initial reference Profiles, not the final list;
4. one package may publish several differently profiled Contributions, while
   each Contribution retains one unambiguous truth/lifecycle Profile;
5. visual shape and location are projection capabilities, not evidence of a
   contribution's truth model;
6. cross-contribution analysis uses declared typed dependencies composed by the
   host into an acyclic exact-version graph; plugins never control each other;
7. co-display, analytical derivation, and human promotion are distinct forms
   of composition and must never be inferred from visual overlap;
8. unknown or unsupported Profiles fail closed for activation while package
   bytes and host-owned unresolved records remain inspectable and recoverable;
9. Core and Community packages use the same base Contribution and same Profile
   contract when they claim the same Profile; trust changes execution and
   resource policy, not semantic meaning;
10. `ADR-V7-005` is a subordinate calculated-series projection decision, not
    a universal plugin or visual-element ABI.

## Why One Plugin Taxonomy Is Insufficient

Several independent questions had been compressed into one word:

- **How is it delivered?** Kernel, built-in Core, local candidate, or future
  Community distribution;
- **what is authoritative?** Formula output, user anchors, geometry, accepted
  market meaning, or a machine candidate;
- **what may it do?** Calculate, request an anchor interaction, emit a
  candidate, contribute standard plots, or project market geometry;
- **how is it displayed?** Line, histogram, band, rectangle, marker, label,
  Main Chart Region, or an internal Chart Region;
- **how do traders find it?** Moving averages, momentum, volatility, price
  action, liquidity, market structure, Fibonacci, or another domain family.

No one answer determines the others. A rectangle is not inherently a semantic
artifact; it may be an ordinary drawing, a projection of accepted FVG meaning,
or a transient detector candidate. A line is not inherently a calculated
indicator; it may project a manual trend line, a Fibonacci level, a semantic
liquidity level, or an MA result. Likewise, using EMA internally does not make
MACD a Moving Averages product capability: MACD is a calculated multi-output
oscillator which may carry momentum/trend Domain Tags.

V7 therefore needs orthogonal contracts instead of one broad plugin kind.

## Relationship To Existing Decisions

This decision preserves and connects existing accepted boundaries:

- `ADR-V7-004` remains authoritative for Kernel/Core/Community distribution,
  Package/Contribution/Pack separation, strict TypeScript authoring,
  host-rendered settings, declared dependencies, and trust tiers;
- `ADR-V7-001` remains authoritative for `DrawingGeometry`, `DrawingEntity`,
  `SemanticArtifact`, `ArtifactProjection`, manual construction, evidence,
  no-future behavior, and durable Annotation ownership;
- `ADR-V7-003` remains authoritative for evidence-grade semantic truth,
  human-governed acceptance, provenance, and raw-context drilldown;
- P0a's manifest and contribution metadata, P0b's Core Plugin Profile, P1a's
  Developer Kit Contract Profiles, and P1b's inert local package profile retain
  their accepted meanings and implementation status;
- accepted `ADR-V7-005` is subordinate to this decision and binds only the
  calculated-series Profile's standard Plot and Chart Region projection;
- Session, Replay, Bar Data, Workspace, Chart, Annotation, persistence, and
  ModuleHost owners remain non-plugin Kernel infrastructure.

This decision promotes only the open Contribution taxonomy,
host-governed Profile registry, typed composition, and visual-capability
separation anticipated by `MEMO-V7-001`. It does not promote that memo's
general-futures scope, complete Setup/AI system, arbitrary renderer, remote
registry, commercialization, paid Marketplace, strategy execution, or broker
authority.

## Qualified Profile Terminology

The unqualified word `profile` is already overloaded. Public contracts and
documentation must use a qualified term:

| Qualified term | Existing or proposed meaning |
| --- | --- |
| `DeveloperKitContractProfile` | existing P1a availability/toolchain envelope such as `trusted-built-in-core-v1`; states which contracts can be validated or executed |
| `PackageContractProfile` | existing P1b package-format/eligibility envelope such as `local-declarative-package-v1` |
| `CorePluginProfile` | existing P0b host-owned user configuration and enabled/default state for built-in Core packages |
| `ContributionProfile` | proposed truth, ownership, lifecycle, and typed I/O contract for one contribution |

None may be shortened to `profile` at a boundary where another meaning is
possible. A Developer Kit Contract Profile may advertise whether a particular
Contribution Profile and version is `static`, `fixture`, `trusted-build`,
`isolated-worker`, or `unavailable`; it does not become that Contribution
Profile.

### Existing Contribution Kind Is Not A Contribution Profile

P0a's accepted `contributions[].kind` is broad trusted-build manifest metadata
which reserves semantic, tool, indicator, drawing, and workflow contribution
kinds. P1a's contribution-contract catalog reports whether each such kind is
static, fixture-backed, trusted-build, or unavailable. Neither accepted value
is retroactively a Contribution Profile.

The existing FVG manifest therefore keeps both its semantic and construction-
tool contribution ids exactly as accepted. A future pure-contract migration
must explicitly decide how those descriptors relate to one or more Profile-
governed Contribution definitions and negotiated construction capabilities.
It must preserve stable ids and compatibility and cannot infer that every
`tool` has one truth model, assign a dummy Profile, or silently merge the two
records. Until that later decision, ADR-V7-006 changes no P0a/P1a
descriptor or catalog meaning.

## Core Terminology

| Term | Meaning | Identity/lifecycle owner |
| --- | --- | --- |
| `PluginPackage` | installation, integrity, update, compatibility, enablement, quarantine, removal, and distribution unit | accepted package lifecycle owners |
| `Contribution` | one stable business/analysis capability published by a package | package declares identity; applicable host owner controls live state |
| `ContributionProfile` | versioned host contract defining the contribution's authoritative truth and lifecycle semantics | host-governed registry |
| `Capability` | versioned, separately negotiated input, output, interaction, projection, or integration surface | capability owner named by its contract |
| `DomainTag` | non-authoritative discovery/category metadata | catalog governance; never runtime authority |
| `ContributionDependency` | exact typed requirement on a host capability or another contribution output | host dependency planner |
| `CompositionPlan` | immutable resolved acyclic graph for one exact activation/snapshot/cutoff | future host composition owner |
| `Pack` | curated enablement/discovery preset over packages or contributions | catalog/preset owner; never collapses identities |

A product UI may continue to call a user-facing package or curated feature a
“plugin.” Architecture documents must qualify whether they mean package,
contribution, Profile, capability, instance, or projection.

## Five Orthogonal Classification Axes

Every future contribution should be describable across independent axes:

| Axis | Question | Candidate examples | May grant authority? |
| --- | --- | --- | --- |
| distribution/trust | who supplied it and where may it execute? | Core/built-in/first-party; future Community/isolated | only through the accepted trust policy |
| Contribution Profile | what is authoritative and who owns its lifecycle? | calculated series; anchored study; drawing; semantic artifact; detector | yes, only through a supported Profile contract |
| capabilities | what bounded contracts does it require or provide? | standard plots; market geometry; anchor interaction; candidate output | only the exact registered capability |
| projection | how may an accepted result become visible? | line, histogram, band, rectangle, label, Main/internal region | no additional domain authority |
| Domain Tags | how is it described and discovered? | moving-average, oscillator, price-action, liquidity | never |

Code must not derive one axis from another. In particular:

- `distributionTier: core` does not imply calculated-series behavior;
- `projection.standard-plots` does not imply an Indicator truth model;
- `price-action` does not imply a Semantic Artifact or detector;
- Main versus internal Chart Region does not select a Profile;
- a package name, publisher, contribution id, or Domain Tag cannot select a
  private owner or native renderer.

## Base Contribution Envelope

The future SDK should expose one small base envelope shared by every supported
Contribution Profile. The following is illustrative, not an authorized wire
schema:

```text
ContributionDefinitionV1 {
  contributionId
  contributionVersion
  contributionProfile: {
    profileId
    profileContractVersion
  }
  displayMetadata
  domainTags[]
  capabilities: {
    requires[]
    provides[]
  }
  dependencies[]
  settingsSchemaId?
  definitionBody
}
```

The base envelope carries identity and negotiation. `definitionBody` is
validated only by the exact resolved Contribution Profile schema. A package
cannot place fields from several Profile bodies into one object and ask the
host to guess its lifecycle. Executable functions, native handles, DOM/Canvas
objects, private owner references, and undeclared output remain prohibited.

Package identity and Contribution identity are different. Renaming, splitting,
merging, or changing a Contribution's primary Profile requires an explicit
versioned migration or leaves the former record unresolved. A package-version
change does not silently rewrite a Contribution's durable semantic identity.

## Open Contribution Profile Registry

The Profile set is an **open set under host governance**. It is not an
application-wide closed TypeScript union, JSON Schema enum, or Kernel switch.
It is also not an arbitrary string extension point through which package code
can invent authority.

A future registry entry should describe at least:

```text
ContributionProfileDescriptorV1 {
  profileId
  profileContractVersion
  compatibilityRange
  status
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

Registry descriptors are pinned host artifacts, not package executable code.
The host resolves one exact descriptor before validating or activating a
contribution. An implementation should use a registry/composition boundary and
Profile adapters rather than adding concrete MA/FVG/Fib/SMT branches to Kernel,
Workspace, Chart, route, or package-store code.

### Adding A Future Profile

A new Profile requires a separately reviewed contract which specifies:

1. stable namespaced id, versioning, compatibility, and deprecation policy;
2. authoritative truth and the sole owner of live and durable state;
3. immutable inputs, outputs, provenance, invalidation, and no-future rules;
4. required and permitted capabilities plus explicit forbidden authority;
5. persistence, migration, unresolved survival, uninstall, and recovery;
6. transaction, stale-result, cancellation, failure, and resource semantics;
7. SDK/schema/catalog availability and an honest execution tier;
8. positive reference contribution, negative fixtures, architecture evidence,
   and applicable human review.

Adding a descriptor to a registry is therefore a platform change. A package
manifest cannot self-register a Profile, supply its schema or adapter, loosen
its permissions, or cause an unavailable Profile to execute.

### Unknown, Unsupported, And Retired Profiles

Unknown or incompatible Profile claims fail closed before activation. The host
may still inspect and retain safe package bytes and metadata under the package
contract applicable at that time. Existing host-owned instances, drawings,
artifacts, anchors, settings, and provenance remain readable as opaque
unresolved records when their exact Profile contract is absent.

No projection, calculation, detector, gesture, migration, or package callback
runs for an unresolved Profile. Reinstalling an exact compatible host/Profile
contract may resolve and revalidate state; the host never guesses that another
Profile is “close enough.” Retirement must preserve a read/export path and may
not rewrite historical truth into a different Profile.

Partial activation of a multi-Contribution package is never inferred. A future
contract may support explicitly declared independent optional groups, but its
transaction and failure semantics require separate acceptance. Until then, the
resolved required Contribution graph is atomic.

## Initial Reference Profile Set — Open, Not Exhaustive

The following five Profiles explain current V7 needs. Their ids are accepted
architecture labels for this decision, not registered SDK/schema values or
implementation authority.

| Architecture Profile id | Authoritative truth | Typical outputs | Examples |
| --- | --- | --- | --- |
| `analysis.calculated-series` | exact definition/formula version, parameters, immutable input snapshot, and cutoff; points are reproducible derived output | time-indexed numeric plots, bands, histograms, reference values | MA, MACD, RSI, ATR, Bollinger Bands |
| `analysis.anchored-study` | user/import-authored market anchors plus exact formula/parameter version; projected values are derived | levels, rays, bands, curves, labels | Fibonacci, Anchored VWAP |
| `drawing.geometry` | bounded user/import-authored market-coordinate geometry and presentation intent | lines, segments, rectangles, paths, labels | trend line, free rectangle |
| `semantic.artifact` | accepted market meaning, evidence, relations, provenance, and revision history | Artifact projections such as regions, levels, relationships, labels | manual/accepted FVG, BSL/SSL, SMT relationship |
| `analysis.detector` | exact detector version/input/cutoff and machine-source result; output is a candidate, never implicit human truth | computed/suggested candidates and candidate projections | automatic FVG, swing, SMT, crossover or confluence detector |

This table does not mean there will always be exactly five Profiles. Workflow,
AI analysis, dataset transformation, order-flow, portfolio analysis, data
adapters, execution, or other future needs may require new Profiles or may
remain non-plugin host systems. Naming them here would neither register nor
authorize them. The registry's extension process, not an “other” catch-all,
handles genuinely new truth models.

### Calculated-Series Profile

A calculated-series Contribution receives declared immutable inputs and
canonical parameters, then produces deterministic typed numeric output. Its
result is invalidated by relevant input, parameter, definition, executor,
Session Hours, instrument, timeframe, dataset, or Replay-cutoff change. Output
points are reproducible results/caches, not durable Drawing or Semantic truth.

One definition may emit multiple Plot Groups. MACD can therefore emit primary,
signal, histogram, and zero-reference output without becoming a hybrid
Semantic Contribution. A separate crossover or divergence detector is another
Contribution, even when distributed in the same package.

`ADR-V7-005` defines the accepted standard-Plot, Scale, Chart Region,
placement, exact-frame, and Chart-writer behavior for this Profile.

### Anchored-Study Profile

An anchored study is neither a free Drawing nor a Bar-only calculated series.
Its durable authoritative input is a bounded set of explicit market anchors,
settings, and an exact study/formula definition. Displayed levels or curves are
recomputed projections and must retain anchor/formula provenance.

Fibonacci belongs here at its accepted baseline: the user supplies anchors and
a versioned ratio set derives levels and labels. Automatic swing selection is
a separate detector. OTE interpretation, premium/discount meaning, targets,
and trade decisions are separate Semantic, Detector, Workflow, or later
strategy Contributions rather than fields added to the anchored-study truth.

### Drawing-Geometry Profile

A Drawing Contribution creates or imports bounded market-coordinate geometry
without asserting trading meaning. The existing Drawing/Annotation owner
retains pointer arbitration, selection, hit testing, history, persistence, and
projection. Geometry cannot masquerade as calculated output to bypass
invalidation, nor as a Semantic Artifact to bypass evidence and provenance.

Semantic promotion from a Drawing remains the explicit ADR-V7-001 operation;
it creates or relates a distinct Semantic Artifact while preserving source
provenance. Styling a Drawing like an FVG does not make it an FVG.

### Semantic-Artifact Profile

A Semantic Artifact records accepted meaning, evidence, relations, source,
no-future eligibility, and revision history independently from its visual
projection. FVG, BSL/SSL, and an SMT relationship are examples only when their
exact definitions and accepted construction paths apply.

Artifact projections may use rectangles, segments, levels, markers, labels, or
later negotiated surfaces. Those shapes remain derived presentation. Package
absence removes live tools/policies/projection while host-owned historical
records survive unresolved and readable under ADR-V7-001.

### Detector Profile

A detector consumes declared immutable evidence or typed upstream outputs and
produces reproducible machine candidates. Every candidate retains exact
definition, dependency, data, parameter, cutoff, and generator provenance plus
`computed` or `suggested` source. A candidate may be displayed, rejected,
ignored, expired, or explicitly accepted according to a separate construction
policy.

Acceptance does not mutate the candidate into `human`. It creates a distinct
host-owned Semantic Artifact or other admitted record with a provenance
reference to the candidate and the human decision. AI-generated suggestions
remain subject to the stricter non-deterministic AI boundary and do not become
ordinary deterministic detector results merely because both are suggestions.

## Capabilities Are Orthogonal And Negotiated

A Contribution Profile determines truth and lifecycle. Capabilities determine
bounded surfaces which the Profile may use. Illustrative capability families
include:

- immutable Bar or typed-derived-input envelopes;
- standard time/value Plot output;
- market-coordinate geometry projection;
- host-mediated market-anchor selection;
- detector-candidate output;
- host-rendered settings and Inspector groups;
- exact crosshair readout or legend metadata;
- declared persistence/migration assistance through the owning host.

Capability ids and versions require their own registry, schema, owner,
availability, resource, and conformance rules. A Profile descriptor lists
permitted capability ranges; a Contribution requests only the subset it needs;
the active Developer Kit/host Contract Profile resolves whether each request is
available.

Possessing a projection capability never grants native Chart, Series, Pane,
Scale, DOM, Canvas, WebGL, pointer-listener, Replay, Bar Data, Workspace,
Annotation-store, Journal, persistence, filesystem, network, credential, or
ModuleHost access. Host owners materialize declarative values.

## Domain Tags Are Open Metadata

Domain Tags support search, filters, documentation, and learning. Candidate
tags may include moving-average, trend, momentum, oscillator, volatility,
volume, price-action, imbalance, liquidity, structure, Fibonacci, and
multi-instrument.

Tags may be multi-valued and extended through catalog governance. They are not
Profile ids, capabilities, dependencies, permissions, execution tiers, scale
identities, or proof of Core classification. Unknown tags may be displayed as
sanitized metadata; they cannot select code paths or unlock host surfaces.

## Multi-Contribution Packages

One user-facing package may publish several Contributions when one product
feature spans several truth models. It must not collapse them into an ambiguous
object merely to offer one Plugin Center card.

For example:

```text
FVG Toolkit PluginPackage
  semantic FVG definition       -> semantic.artifact
  manual construction tool      -> declared tool/anchor capabilities
  automatic FVG detector        -> analysis.detector
  standard Artifact projection  -> geometry/label capabilities
```

The package is installed, updated, disabled, quarantined, or removed through
one package lifecycle. Its Contributions retain distinct ids, Profile versions,
dependencies, state owners, settings scopes, outputs, migrations, and
conformance. Disabling the package removes live contributions atomically while
host-owned historical Artifacts remain unresolved; it does not convert them to
drawings or delete evidence.

If two responsibilities have different authoritative truth or durable
lifecycle, they are separate Contributions even when they share source files,
settings, release version, and UI grouping. One Contribution never declares
two primary Profiles.

## Composition Semantics

V7 must distinguish five composition operations.

### Visual Co-Presence

Several accepted outputs may be visible in the same Workspace Pane or Chart
Region. The Chart adapter composes their declarative projections under
coordinate, Scale, z-order, interaction, and resource rules. Co-presence
creates no data dependency, confluence claim, semantic relationship, or shared
lifecycle.

An MA line crossing an FVG rectangle is only a visual event until a separate
typed Contribution defines and computes a relationship.

### Multi-Contribution Package Composition

A package may group related contributions and shared defaults. Package-level
enablement does not merge their ids or authority. Contribution-specific
settings and durable state remain with the relevant owner; package settings
cannot overwrite accepted Annotation or calculated-instance state.

### Declared Dependency Composition

A Contribution may require a stable host capability or typed output contract
from another Contribution. Dependencies identify exact contribution/profile/
output contract ranges and are resolved before activation. Plugin code receives
only immutable, host-normalized input values; it never imports an upstream
package privately or calls its lifecycle/state object.

The host produces a deterministic acyclic plan with collision, missing,
incompatible, cycle, privilege-increase, and resource diagnostics. Activation
and reverse disposal follow that accepted graph.

### Derived Or Composite Analysis

When analysis needs MA, FVG, and SMT together, a separate derived Contribution
declares those typed dependencies. A deterministic confluence implementation
normally uses the Detector Profile and emits computed/suggested candidates. It
does not merge the upstream series, Artifact, and relation into one hybrid
record or claim their provenance as its own.

Every derived result binds the exact upstream definition/output revisions,
input snapshot, dataset, parameters, and Replay cutoff. A stale, unavailable,
or unresolved required input prevents a ready derived result. Optional input
semantics, partial results, and fallback rules require explicit Profile-level
contracts; the plugin cannot invent them at runtime.

### Human Promotion Or Construction

A detector candidate or Drawing may inform a Semantic Artifact only through an
explicit host-owned construction/promotion command which validates evidence,
eligibility, definition, current cutoff, and user intent. The new Artifact has
its own identity and provenance relation. Visual selection, enabling a package,
or accepting default settings is never semantic acceptance.

## Exact Snapshot, Cutoff, And Dependency Rules

Composition must preserve Replay-visible truth across Profiles:

- every computed output or candidate binds its exact eligible input snapshot
  and visible-through cutoff;
- every dependency edge binds an exact accepted upstream output revision, not
  a mutable “latest” handle;
- derived work cannot request future Bars, hidden sibling state, or undeclared
  symbol/timeframe inputs;
- late results apply only if package generation, Contribution definition,
  instance/Artifact/anchor revision, Workspace Pane snapshot, dependencies, and
  cutoff remain current;
- a new snapshot removes or honestly marks stale derived projection pending;
  old values cannot remain beside newer candles;
- human-authored durable records retain their historical cutoff/provenance even
  when current projections become ineligible or unresolved.

Cross-instrument or cross-timeframe composition requires a separately supported
input capability with exact alignment, dataset, Session Hours, and no-future
semantics. A `multi-instrument` Domain Tag grants none of that authority.

## Projection Is A Shared Sink, Not A Shared Truth Model

Different Profiles may eventually reuse host projection primitives, but they
must arrive through Profile-correct owners and frames:

- calculated-series output becomes standard Plot/Scale/ChartRegion projection;
- anchored-study output becomes derived anchor/formula projection;
- Drawing geometry becomes Drawing projection;
- Semantic Artifacts become Artifact projection;
- detector output becomes explicitly styled candidate projection.

The Chart adapter may share low-level native materialization helpers after
validation. There must not be one universal “visual result” object which erases
source, truth, lifecycle, eligibility, interaction, or persistence. Reusing a
line/rectangle renderer is implementation reuse, not domain convergence.

Only the Chart adapter creates, updates, orders, moves, or removes native Chart
resources. Profile adapters and plugins return declarative host values and
receive exact receipts or attributed failures.

## Initial Product Mapping

This mapping tests the model; it changes no accepted Core catalog and does not
classify illustrative packages as Core.

| Product concept | Primary Contribution(s) | Orthogonal projection/capability | Explicitly separate behavior |
| --- | --- | --- | --- |
| MA/SMA/EMA | calculated series | price line; Main or compatible internal Chart Region | crossover, ribbon regime, strategy signal |
| MACD | calculated series with multiple Plots | lines, histogram, zero reference; usually internal region | crossover/divergence detector and accepted semantic meaning |
| RSI / ATR | calculated series | bounded oscillator or price-distance Plot | threshold/event detector |
| Bollinger Bands | calculated series | lines plus host-rendered band | squeeze/breakout detector or strategy |
| Fibonacci | anchored study | market-price levels, labels, optional band | auto swing detector, OTE interpretation, trade targets |
| manual FVG | semantic artifact plus construction capabilities | rectangle, midpoint, label | automatic detection, mitigation/ranking/confluence |
| automatic FVG | detector candidate | candidate rectangle/label | human acceptance creates a distinct Artifact |
| BSL / SSL | semantic artifact | anchored level/label | automatic swing/sweep detector |
| SMT | semantic relation Artifact and/or detector candidate | cross-instrument relation projection | oscillator series or trade decision, if any |
| ordinary trend line | Drawing geometry | line and handles | semantic structure assertion |
| MA + FVG + SMT confluence | derived detector with typed dependencies | candidate marker/region/Inspector evidence | automatic human truth, order, or validated Setup |

FVG, Liquidity Levels, Moving Averages, and Fibonacci retain their accepted
ADR-V7-004 Core classification and exact accepted baselines. This table only
clarifies that one user-facing Core Plugin may map to one or several Profile-
typed Contributions.

## Host Ownership Matrix

| Owner | Owns | Must not own |
| --- | --- | --- |
| Profile registry | supported Profile descriptors, compatibility, schemas, conformance identities | package activation, user data, native rendering |
| package lifecycle owner | package bytes/identity/source/trust/state and atomic generation | contribution truth, Chart, Annotation, Replay |
| composition planner | exact typed dependency graph, capability resolution, activation order | plugin business meaning or private imports |
| Profile-specific host owner | accepted instance/document/result revisions required by that truth model | unrelated Profile state or package bytes |
| ModuleHost | exact active module/package generation and reverse disposal | domain documents, calculations, Chart state |
| existing Replay/Bar Data/Workspace owners | exact cutoff, eligible data, Pane snapshots, transactions | plugin formula, semantic truth, projections |
| existing Drawing/Annotation owners | Geometry, Artifact, evidence, history, promotion transactions | calculated-series caches, package lifecycle |
| existing Chart adapter | native resource lifecycle and exact visible receipts | formula, Artifact meaning, package trust, durable state |
| host UI | accessible commands and host-rendered surfaces | direct owner, Chart, storage, or plugin-to-plugin mutation |

An implementation may split Profile-specific owners further. It may not create
one `PluginRuntime` which accumulates package storage, calculation, semantic
documents, dependency planning, Chart mutation, UI, and persistence.

## Core And Community Compatibility

Core and future Community packages share:

- the same base Contribution envelope;
- the same exact Contribution Profile schema and semantic contract when they
  claim the same Profile id/version;
- the same capability ids, declarative result contracts, settings shapes,
  provenance, migration, unresolved, and projection meaning;
- the same profile-specific conformance fixtures wherever trust-independent.

Trust tier may change admission, executor, budgets, signing/source evidence,
quarantine, and additional isolation fixtures. Trusted Core code may use a
first-party adapter; future Community calculation code may execute only in an
authorized isolated Worker tier. Neither receives direct owner/native handles,
and Community does not get a semantically reduced “almost compatible” Profile.

A Profile can be supported for trusted-build contributions and unavailable for
Community execution until its Worker/capability boundary exists. Honest
availability is expressed by the Developer Kit Contract Profile and host
catalog, not by changing the Contribution Profile's meaning.

## Current Developer Kit And P1b Compatibility

This draft changes no current artifact:

- P1a's `trusted-built-in-core-v1` Developer Kit Contract Profile and its
  contribution-contract availability catalog remain unchanged;
- Indicator calculation, sub-Pane rendering, arbitrary Drawing gestures,
  Community execution, and Worker lifecycle remain unavailable;
- P1b's `local-declarative-package-v1` Package Contract Profile still requires
  empty contributions/capabilities/permissions and no execution entrypoint;
- Installed packages remain inactive and non-executing;
- no Contribution Profile field is added to Manifest V1/V2, SDK values, JSON
  Schemas, catalogs, receipts, archives, storage records, or UI;
- P1b.4 remains paused and H117 remains executable but unaccepted.

Although this architecture decision is accepted, a separately authorized pure-
contract slice must reconcile P0a's broad contribution `kind` metadata with the
open Profile registry without silently reinterpreting accepted manifests.
Exact schema versions, migrations, and compatibility reports belong to that
later slice. Its accepted binding specification is
`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md`; all ten material decisions
are accepted and authorize no implementation.

## Lifecycle, Migration, And Unresolved Survival

Package, Contribution, instance/document, result/candidate, projection, and
native resources have different lifecycles. A package activation generation
resolves exact Contribution definitions and Profile descriptors before any
Profile-specific owner creates live state.

Profile changes are semantic migrations, not presentation edits. An upgrade
which changes Profile id, truth model, stable output identities, anchors,
Artifact schema, detector source classification, or dependency meaning must
provide an explicit migration accepted by the applicable host owner. Failure
leaves old bytes and references unresolved; it never coerces data into the new
Profile.

Disabling, quarantining, incompatibility, uninstall, or missing dependencies
removes live tools, calculations, candidates, and projections in reverse graph
order. Host-owned durable Drawings, Artifacts, anchors, settings, and historical
provenance survive according to their owner contracts. Re-enable/reinstall
revalidates against the exact current package/Profile/dependency generation and
current Replay/Workspace truth before restoring output.

## Security, Failure, And Resource Rules

The open registry cannot become an escape hatch. Every Profile and capability
must preserve least privilege, bounded immutable inputs, deterministic or
explicitly classified nondeterminism, exact no-future behavior, cancellation,
resource accounting, stale rejection, failure attribution, and complete
disposal.

The host rejects:

- unknown/self-registered Profile descriptors or package-supplied schemas;
- a Contribution with zero or multiple primary Profiles;
- capability requests outside the Profile's permitted ranges;
- direct imports, calls, mutable handles, or state reads across Contributions;
- missing, incompatible, colliding, cyclic, or privilege-escalating dependency
  graphs;
- output which changes its declared truth/source class at runtime;
- projection values carrying native handles, executable callbacks, DOM/CSS/
  Canvas content, private owner references, or future-ineligible evidence;
- resource, output, recursion, dependency-depth, cancellation, or retained-
  state breaches;
- Domain Tags, display metadata, package trust claims, or visual kinds used as
  permissions.

One failed Contribution is attributed to its exact package, definition,
Profile, instance/input, dependency graph, and generation. Isolation does not
permit partial truth: required downstream Contributions become explicit
pending/unavailable/error, never ready on stale upstream output.

## Required Future Conformance And Human Evidence

No Harness id is registered by this draft. A later accepted implementation
contract should prove at least:

1. an open registry model rejects a deliberately closed-enum implementation
   and concrete MA/FVG/SMT/Fib branches outside Profile adapters;
2. exact Profile id/version/schema/compatibility resolution and unknown/
   incompatible/retired unresolved behavior;
3. base-envelope closure, exactly one primary Profile, and independent
   capability/Domain-Tag validation;
4. one synthetic reference for each initially implemented Profile without
   making illustrative product concepts Core;
5. one multi-Contribution package with separate ids, owners, settings,
   lifecycle, and atomic dependency planning;
6. visual co-presence with no inferred dependency or semantic relationship;
7. a typed derived detector over calculated and Semantic inputs with exact
   cutoff/provenance, cycle rejection, stale cancellation, and no direct calls;
8. candidate-to-Artifact promotion preserving machine and human provenance as
   distinct records;
9. disable/quarantine/uninstall/missing-Profile/missing-dependency survival and
   exact re-resolution without stale native resources;
10. Core/trusted and future Community/isolated references passing the same
    Profile semantics plus tier-specific isolation/resource evidence;
11. unchanged Replay, Bar Data, Workspace, Chart, Annotation, persistence, and
    ModuleHost writer ownership;
12. accessible Plugin Center, settings, unresolved, dependency, provenance,
    and failure explanations when a future UI slice exists.

Human review should test whether users can understand one package containing
several Contributions, distinguish calculated output from accepted market
meaning, see why visual overlap is not confluence, understand candidate versus
human provenance, and recover an unavailable Profile without data loss.

## Relationship To ADR-V7-005

`ADR-V7-005` is the focused accepted decision for the
`analysis.calculated-series` Profile and its standard Chart projection. Its
generic properties remain valuable within that boundary:

- Main and internal Chart Regions are placement targets, not Indicator types;
- Plot Groups, standard Plots, Scale compatibility, exact projection frames,
  host-owned instances/layout, and the sole Chart writer remain applicable;
- MA may default to Main and still move to a compatible internal region;
- a calculated-series definition may emit multiple Plot Groups;
- Core and future Community Contributions claiming the same calculated-series
  Profile use the same semantic/profile ABI while trust changes the executor.

ADR-V7-005 must not be read as:

- defining all plugins as Indicators;
- reducing Drawings, Semantic Artifacts, anchored studies, or detectors to
  standard Plot output;
- creating one universal visual-result lifecycle;
- authorizing another Profile to use Chart Regions or standard Plots without
  that Profile's own negotiated capability contract;
- classifying FVG, SMT, Fibonacci, RSI, ATR, MACD, or any combination merely
  because examples can be projected.

The product owner accepted this upstream Profile/composition model first and
then accepted ADR-V7-005's revised calculated-series projection decisions.
Acceptance of neither decision authorized implementation.

## Explicitly Rejected Alternatives

This decision rejects:

- one `pluginKind` enum containing every current and future feature;
- permanently freezing exactly five Contribution Profiles;
- an unrestricted `other`/`custom` Profile which bypasses host review;
- letting package code register a Profile, schema, adapter, renderer, owner, or
  permission;
- treating Core/Community, Main/sub-Pane, line/rectangle, or price-action/
  moving-average tags as truth/lifecycle types;
- assigning two primary Profiles to one Contribution;
- combining differently owned truth into one ambiguous hybrid result;
- treating visual overlap as analytical dependency or semantic evidence;
- direct plugin-to-plugin calls, imports, mutable handles, or private state;
- silently converting candidates to human Artifacts or Drawings into semantics;
- erasing Profile/source/provenance in one universal Chart contribution;
- using this draft to change P1a/P1b schemas, activate external packages, start
  P1b.4, accept H117, or authorize an implementation slice.

## Accepted Material Decisions

The product owner accepted these ten decisions without amendment on
2026-08-12:

1. `PluginPackage`, `Contribution`, `ContributionProfile`, `Capability`,
   `DomainTag`, and `Pack` are independent concepts; “plugin” alone is not a
   business-semantics type.
2. every Profile-governed Contribution has exactly one primary Profile which
   defines authoritative truth, owner, typed I/O, persistence, invalidation,
   provenance, migration, and conformance.
3. Contribution Profiles form an open, namespaced, versioned, host-governed
   registry; the initial five are reference Profiles, not a closed enum or
   exhaustive roadmap.
4. adding a Profile is a separately specified platform change with schemas,
   capabilities, owners, permissions, limits, migration, references, Harness,
   and review; packages cannot self-register one.
5. capabilities and Domain Tags are orthogonal: capabilities are negotiated
   bounded host surfaces, while tags are open non-authoritative metadata.
6. one package may contain multiple differently profiled Contributions, but
   different truth/lifecycle responsibilities retain separate stable ids and
   cannot be collapsed into a hybrid object.
7. visual co-presence, package grouping, typed dependency, derived analysis,
   and human promotion are distinct composition operations; only the host
   resolves dependencies and applies owner-correct transactions.
8. unknown/incompatible Profiles and required dependencies fail closed for
   activation while safe package metadata and host-owned durable records
   survive unresolved; no implicit Profile conversion or partial activation
   occurs.
9. Core and future Community Contributions share the base envelope and, when
   claiming the same Profile id/version, its exact semantics; trust tier
   changes admission/executor/resource policy, and current P1a/P1b availability
   remains unchanged.
10. ADR-V7-005 becomes the subordinate calculated-series projection decision;
    accepting either decision authorizes no implementation, and P1b.4/H117/
    Community execution remain separately gated.

## Acceptance Record

The product owner stated:

> ADR-V7-006 十项决策全部接受；继续审阅 ADR-V7-005 修订后的八项决策，不实施。

This acceptance makes the open host-governed Profile model, the non-exhaustive
initial five Profiles, the Package/Contribution/Profile/Capability/Domain-Tag/
Pack separation, typed host composition, unresolved survival, and same-Profile
Core/Community semantics binding architecture. It explicitly leaves
ADR-V7-005 to a separate review and grants no implementation authority.

## Current Non-Authorization Boundary

Acceptance of `ADR-V7-006` does not cross these boundaries:

- no Contribution Profile Registry exists in production or the SDK;
- the five reference Profiles are accepted architecture classifications, not
  registered values or an exhaustive product commitment;
- no delivery id or Harness id is allocated;
- no production, SDK, schema, catalog, manifest, fixture, adapter, UI,
  persistence, test, archive, receipt, or dependency code may be added;
- existing ADR-V7-001/003/004 decisions and P0a/P0b/P1a/P1b contracts retain
  their exact accepted meanings and states;
- accepted ADR-V7-005 authorizes no calculated-series implementation work;
- no example gains Core classification or implementation authority;
- P1b.4 remains paused and H117 remains executable but unaccepted;
- P2 registry, P3a Worker, P3b Pine migration, AI, strategy/execution,
  privileged renderers, Marketplace, and product-scope changes remain gated.
