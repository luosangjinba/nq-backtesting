# V7 Drawing And Semantic Annotation Foundation — R13.1

Decision id: `ADR-V7-001`

Status: accepted binding architecture decision

Date: 2026-08-07

Last revised: 2026-08-08 PDT

## Decision Summary

Before Backtesting, Journal, campaign, scoring, or other business workflows are
added, V7 will establish one removable Drawing and Semantic Annotation
foundation. It provides reusable geometry, versioned annotation state, typed
semantic artifacts, declarative chart projections, and a sole Chart-owned
rendering adapter.

The formal contract does not use **asset** for drawings or semantic analysis
objects. V7 already uses Session asset set for tradable instruments, and the
financial domain also commonly uses asset for an instrument. Reusing it for a
line, rectangle, FVG, or OB would make commands, persistence, and plugin
permissions ambiguous.

The accepted terms are:

| Layer | Contract term | Responsibility | Examples |
| --- | --- | --- | --- |
| Geometry | `DrawingGeometry` | immutable market-coordinate shape value | segment, ray, line, rectangle |
| Generic annotation | `DrawingEntity` | editable persisted drawing with no required trading meaning | manually drawn trend line |
| Trading meaning | `SemanticArtifact` | typed domain object with provenance, attributes, relations, and lifecycle evidence | BSL, EQL, FVG, OB, Breaker |
| Chart presentation | `ArtifactProjection` | declarative geometry/style produced for one visible chart context | FVG box plus midpoint line and label |
| Vendor rendering | `RenderPrimitive` | adapter-local Lightweight Charts primitive and interaction renderer | Canvas series primitive |

“Analysis asset” may appear in informal product discussion as an umbrella, but
it is not a public type, module id, command field, persistence key, or wire
schema term.

Visual similarity does not merge ownership. A manually anchored curve may be a
`DrawingGeometry`; a moving average or other data-calculated line is an
Indicator result and never becomes Drawing/Annotation state merely because it
is rendered as a curve.

The foundation supports two user-initiated construction paths: free drawing
from market-coordinate anchors, and evidence-constrained semantic construction
which validates selected visible Bars and derives geometry/parameters through a
registered type package. Both use one host-rendered Property Inspector and one
Annotation transaction owner; neither gives a plugin direct Chart or store
access.

## Core Semantic Decision

A semantic artifact composes zero or more chart projections. It does not extend
or become one geometry type.

```text
SemanticArtifact: imbalance.fvg
  -> RectangleProjection
  -> MidpointLineProjection
  -> LabelProjection
```

Therefore:

- FVG is a `SemanticArtifact`, not a specialized rectangle;
- BSL is a `SemanticArtifact`, not a line color or string tag;
- EQL is a relationship among market anchors/evidence, not merely a horizontal
  segment;
- Breaker can retain a typed `derivedFrom` relation to an earlier OB rather
  than becoming a relabeled rectangle;
- changing projection, style, Pane, theme, or chart vendor does not change the
  artifact's trading meaning.

A free-form label remains valid presentation metadata. It never satisfies a
registered semantic schema. Assigning trading meaning to a generic drawing is
an explicit validated promotion command, not `drawing.semantic = "FVG"`.

## Scope And Non-Goals

R13.1 defines the foundation and delivery gates only. It does not implement:

- drawing controls, menus, keyboard shortcuts, selection visuals, or mobile UI;
- automatic BSL/EQL/FVG/OB/Breaker detection;
- one authoritative SMC/ICT formation rule or tolerance;
- simulated orders, fills, trade management, Journal, or campaign scoring;
- indicator execution or a formula language;
- dynamic third-party package loading, sandboxing, signing, installation,
  Marketplace, entitlement, or arbitrary plugin code execution;
- collaborative editing, sharing, permissions, or general multi-user accounts;
- a second Chart writer, Replay runtime, Bar Data requester, or client cache;
- import/export compatibility with another chart product.

The user accepted this decision on 2026-08-08. Production implementation begins
only through the separately bounded R13.2 Minimal Geometry Contract; acceptance
does not authorize later R13 steps early.

## Geometry Contract

### Market Anchors

Canonical geometry stores market coordinates, never pixels, Canvas coordinates,
Lightweight Charts logical indices, native series handles, or Pane DOM state.

```text
MarketAnchor {
  instrumentId
  epochMs
  price
}
```

Every anchor must use the exact registered instrument identity supplied by its
composition context and a finite price. The pure Geometry domain validates the
canonical identity string but does not gain Instrument Registry lookup
authority. Time is an exact epoch instant. A projection adapter may translate
an anchor into chart coordinates only for the lifetime of one render pass.

### Initial Geometry Registry

The first executable registry is deliberately minimal:

- `geometry.point` — one market anchor;
- `geometry.segment` — two finite anchors;
- `geometry.rectangle` — a normalized time interval and price interval.

The public registry contract must permit later independent registration of
`geometry.ray`, `geometry.infinite-line`, and `geometry.horizontal-level`, but
R13.2 does not implement unused definitions merely to predict later tools.
When added, segment, ray, infinite line, and horizontal level remain separate
definitions. Boolean combinations such as `extendLeft`/`extendRight` must not
turn one loose line record into several incompatible geometries.

`geometry.polyline` and `geometry.bezier-path` are distinct future registered
geometries. Ellipse, Fibonacci tools, text, image, measurement, and freehand
paths are also future types. There is no generic `geometry.curve` whose meaning
changes according to ad-hoc flags. Their absence must not require changing the
initial geometry owners.

### Cross-Timeframe Anchor Projection

`MarketAnchor.epochMs` remains the canonical exact market instant. A Chart
adapter must never silently replace it with the nearest visible logical item.
Each projection policy declares how an anchor is displayed when the target
timeframe does not contain that exact timestamp:

- exact-instant projection may render only when the adapter can map the exact
  instant deterministically;
- Bar-evidence projection may use the containing accepted display bucket only
  through a registered policy which retains the source Bar reference and target
  timeframe identity;
- a projection which cannot satisfy its declared policy is absent or reports a
  stable projection error; it does not mutate canonical Geometry.

R13.8 must select and fixture the policies used by cross-timeframe Segment,
Rectangle, and Semantic Artifact projections before multi-timeframe behavior is
accepted.

### Geometry And Presentation

Geometry contains anchors and shape invariants only. Presentation is separate:

```text
DrawingPresentation {
  stylePolicyId
  styleOverrides
  visibilityPolicyId
  zOrder
}
```

Color, opacity, line width, label, and theme do not prove semantic meaning.
Semantic type definitions may supply default style policies, while user
overrides remain presentation state.

### Curve And Calculated-Series Boundary

A persisted curve geometry is manually/import-defined market-coordinate shape
state. A future polyline stores ordered `MarketAnchor` values. A future Bezier
path stores market-coordinate anchors, control points, and an explicit curve
model. A freehand tool must normalize sampled pointer motion into a bounded,
versioned market-coordinate path before commit; pixels and Canvas paths remain
transient adapter state.

MA, EMA, VWAP, MACD lines, and similar outputs are data-calculated series. They
belong to an adjacent Indicator evaluation contract, not to
`DrawingGeometry`, `DrawingEntity`, `SemanticArtifact`, or the Annotation
Document. Their authoritative inputs include indicator/formula identity and
version, canonical parameters, exact immutable Bar/Pane snapshot identity, and
accepted Replay cutoff. Output points are derived results or caches rather than
manually authored geometry truth.

The later Indicator specification may choose a term such as
`CalculatedSeriesResult`; R13.1 does not bind that public name. It does bind
these invariants:

- changing Bars, parameters, indicator version, Session Hours, instrument,
  timeframe, or Replay cutoff invalidates the calculated result;
- calculated series reach Chart only through a declarative Chart contribution
  port and the sole Chart writer;
- an Annotation or semantic package cannot persist a calculated series as a
  drawing to bypass Indicator ownership, no-future filtering, or invalidation;
- a Semantic Artifact may project to polyline/curve geometry, but its trading
  meaning remains independent from that projection.

## Annotation Document

One optional Annotation Runtime is the sole writer of the versioned Annotation
Document. The document may contain generic drawings and typed semantic
artifacts, but no module receives direct mutable access.

```text
AnnotationDocument {
  schemaVersion
  sessionId
  revision
  drawings[]
  artifacts[]
}
```

The initial registered scope is Session-local. Future workspace-, account-, or
library-level scopes require separate definitions and migration rules; callers
cannot simulate them by omitting `sessionId`.

### Drawing Entity

```text
DrawingEntity {
  drawingId
  revision
  scope
  geometry
  presentation
  provenance
}
```

The entity owns no native chart object. `provenance` identifies manual/imported
origin, creation time, and the mandatory `observedAtReplayCutoffEpochMs` at
which the drawing first became accepted evidence-visible state. It carries no
claim that a free-form drawing is a valid SMC/ICT structure. Wall-clock creation
time cannot substitute for the Replay cutoff.

### Semantic Artifact

```text
SemanticArtifact {
  artifactId
  typeId
  typeVersion
  definition
  revision
  scope
  provenance
  attributes
  relations[]
  presentation
}
```

Required provenance includes:

- exact instrument and source timeframe/capability identity;
- `observedAtReplayCutoffEpochMs`;
- source bar references or explicit manual anchors;
- `recognitionSource` such as `human`, `detector`, or `import`;
- `constructionSource` such as `manual`, `derived`, or `import`;
- construction/definition/detector identity and version when applicable;
- per-attribute source and override provenance for derived/default/manual values;
- creator/state namespace when available, without storing credentials.

R13.9b refines this into Artifact schema 2. `definition` is a host-stamped
package/definition id-and-version identity. The host validates a universal
no-future provenance header, while package-specific profile, detector,
attribute-source, override, and creator evidence is stored as one deeply
portable `packageProvenance` record. Resolution requires the complete recorded
identity to match; schema-1 Artifacts with unknowable construction identity are
preserved as unresolved `legacy-unrecorded` evidence rather than assigned a
modern package version.

Recognition and construction are independent. A user who identifies an FVG
and invokes “create from selected candle” is `recognitionSource: human` plus
`constructionSource: derived`; it is not detector recognition. A detector-found
candidate is `detector` plus `derived`. Free drawing is normally `human` plus
`manual`. This distinction is required for later research, recognition-skill
training, and review truth.

Attributes are validated by the registered semantic type. Relations are typed
and versioned, for example `derivedFrom`, `mitigates`, `sweeps`, or `confirms`.
The foundation does not make every relation legal for every semantic type.

### Promotion From A Drawing

The UI may let a user start with a segment or rectangle and later assign a
semantic type. The command must:

1. read an exact Drawing revision;
2. select one registered semantic type and version;
3. collect and validate all required market evidence and attributes;
4. create a new Semantic Artifact atomically;
5. retain `promotedFromDrawingId` provenance;
6. archive or retain the generic drawing according to an explicit command
   choice, never silently duplicate it;
7. preserve the visible projection or roll back the complete operation.

Geometry alone is insufficient evidence. A rectangle cannot be promoted to FVG
without the required source-bar or explicit manual evidence defined by the FVG
type package.

## Creation Paths And Evidence-Constrained Derivation

### Free Drawing — Geometry First

The user chooses a Segment, Rectangle, Polyline, Bezier, or future drawing tool
and supplies market-coordinate anchors through host-owned pointer/keyboard
commands. Commit creates a generic `DrawingEntity`. It may remain free-form or
later be promoted through the exact-revision semantic command above.

Free drawing is not weaker state; it is state without a registered trading
claim. Style, labels, and visual resemblance cannot silently assign semantic
meaning.

### Drawing Interaction Arbitration

Free drawing must not add an independent set of pointer listeners beside the
existing native Chart drag, wheel, Crosshair, truncation-selection, and history-
boundary interactions. One disposable `AnnotationInteractionController` owns
transient tool state and coordinates through a public Chart-owned interaction
port without receiving vendor Chart, Series, Canvas, or DOM internals.

The controller must define and fixture:

- ordinary navigation versus active drawing/edit modes;
- active Pane identity and coordinate-to-market-anchor translation;
- pointer capture, drag threshold, hover/hit-test intent, and one final
  pointer-up commit;
- bounded transient preview replacement rather than a transaction per pointer
  move;
- restoration of native pan/zoom/Crosshair behavior after commit, Escape,
  pointer cancel, focus loss, Pane removal, module disablement, or disposal;
- keyboard focus and selection behavior without making UI state canonical
  Annotation state.

Only the Chart adapter may suppress or restore vendor-native interaction. The
Annotation UI requests an interaction mode through the port; it does not call
Lightweight Charts directly.

### Evidence-Constrained Semantic Construction — Meaning First

The user chooses a semantic construction command, such as “FVG from candle”,
then selects one or more Replay-visible Bars or existing Artifacts. The host:

1. resolves exact immutable evidence references at the accepted Replay cutoff;
2. supplies only the bounded evidence shape declared by the active type package;
3. invokes the package's pure construction/validation policy;
4. produces a deterministic preview containing derived attributes, provenance,
   relations, and declarative projections;
5. opens the host Property Inspector for review and permitted overrides;
6. commits one Semantic Artifact transaction only after explicit confirmation;
7. rolls back the preview and every prepared effect on cancel or failure.

The package never requests Bars. The host may satisfy a declared neighbor
requirement, such as the three exact candles needed by one FVG definition, only
through the accepted Bar Data/Replay snapshot owners. If the confirming candle
is not visible at the cutoff, construction fails without previewing future
evidence.

Given identical evidence references, cutoff, type/definition/package versions,
and canonical inputs, derivation must produce the same baseline parameters. The
Artifact stores stable evidence and derivation provenance; its rectangle, line,
curve, midpoint, and labels remain projections rather than a second semantic
truth.

### Evidence Resolution Boundary

“The host resolves evidence” is implemented through one explicit pure boundary,
not through UI, package, or Annotation Runtime access to Bar Data:

```text
AnnotationEvidenceResolver
  input:
    accepted immutable Pane snapshot
    accepted Replay cutoff
    exact user selection
    bounded EvidenceRequirement
  output:
    immutable EvidenceBundle
```

Canonical Bar references retain dataset revision, instrument, source/display
timeframe identity, Bar start epoch, and the exact accepted cutoff. Existing
Artifact references retain artifact id and exact revision. The resolver may
select and validate only evidence already present in the supplied accepted
snapshot. It owns no cache, provider, request queue, Replay cursor, or mutable
selection.

If required neighbor evidence is not present, resolution fails with a stable
reason. Composition may separately use the existing Bar Data/Workspace command
path to produce a new accepted Pane snapshot and retry the user command; the
resolver and semantic package never pull missing Bars themselves.

### Detector Suggestions Remain A Separate Later Path

A future detector may scan allowed evidence and propose a candidate. That path
is neither free drawing nor user-recognized evidence-constrained creation.
Accepting it must preserve detector recognition provenance and cannot be counted
as unaided human recognition. R13.1 still authorizes no detector implementation.

### Derived Parameters And Human Overrides

Parameter definition policy and one Artifact's effective parameter value are
separate contracts:

```text
ParameterDefinition {
  parameterId
  valueKind
  derivationPolicyId?
  allowedSources[]
  overridePolicy: locked | presentation-only | allowed-with-validation
}

ParameterValue {
  baselineValue
  effectiveValue
  effectiveSource: derived | manual | default | override
  overrideProvenance?
}
```

`ParameterDefinition` belongs to a versioned type/definition or presentation
schema. `ParameterValue` belongs to one Artifact revision. When an automatically
derived value is overridden, the Artifact retains the derived baseline, the
human override, definition/package version, editor, and revision. A later
recomputation cannot erase or silently replace the override.

Formation tolerances and other rules which determine whether an Artifact is a
valid member of a type belong to a versioned Definition/Profile. An Artifact
stores the exact profile reference and any permitted effective override; editing
one Artifact never silently changes the shared definition used by other
Artifacts.

Presentation-only edits such as color or label visibility do not alter semantic
truth. An override to an FVG bound, relation, or other semantic parameter must
revalidate the complete Artifact. If it no longer satisfies the selected type,
the host rejects the transaction or offers an explicit conversion to a generic
drawing or separately defined manual-assertion type; it never leaves an invalid
object labeled as a strict FVG.

## Semantic Type Registry

Semantic meaning is extension-driven. A `SemanticTypeDefinition` declares:

```text
SemanticTypeDefinition {
  typeId
  version
  displayMetadata
  attributeSchema
  provenanceRequirements
  relationPolicy
  constructionPolicyIds[]
  propertySurfaceSchemaId
  projectionPolicyId
  lifecyclePolicyId
}
```

Candidate ids use stable namespaces:

- `liquidity.bsl` and `liquidity.ssl`;
- `liquidity.eqh` and `liquidity.eql`;
- `imbalance.fvg`;
- `structure.order-block`;
- `structure.breaker`.

These ids reserve vocabulary only. Each type's exact formation, tolerance,
state transition, invalidation, and projection behavior requires a focused
follow-up specification and conformance fixtures. No hard-coded branch for one
of these ids may enter Replay, Bar Data, Chart, Workspace Transaction, or the
generic Annotation Runtime.

Type packages are pure definitions/policies. They do not own a second document,
request bars, mutate Chart, schedule Replay, or write persistence directly.

### First-Party Semantic Packages And Plugin Boundary

R13 uses **plugin-first boundaries, loader-later delivery**. From the first
semantic vertical slice, every first-party BSL/EQL/FVG/OB/Breaker definition
must enter through the same host-owned extension port rather than a core
`switch (typeId)` branch. A candidate manifest is:

```text
SemanticTypePackageManifest {
  packageId
  packageVersion
  hostContractRange
  semanticTypeDefinitions[]
  geometryDependencies[]
  projectionPolicyIds[]
  toolDescriptors[]
  requiredCapabilities[]
}
```

The exact wire schema is deferred, but identity/version compatibility,
declarative dependencies, lifecycle, and host validation are mandatory. The
host owns package discovery within the trusted build, registration, activation,
suspension, disposal, and failure isolation. Package-provided validators and
projectors are pure/bounded policies invoked by the host; they receive no
native Chart, Replay, Bar Data, DOM, Canvas, persistence, Journal, or private
owner handle.

The first implementation proves compile-time first-party package composition
and runtime enable/disable. It does not dynamically import community JavaScript
or establish a public SDK. A package loader, external installation, signature,
sandbox, permission UI, registry, and Marketplace remain separate decisions
preserved in `MEMO-V7-001`.

Package absence or disablement must not corrupt stored evidence:

- the core preserves artifact id, type id/version, attributes, relations, and
  provenance as an unresolved read-only artifact;
- package-owned tools and projections disappear atomically;
- workers, listeners, requests, caches, and adapter contributions are disposed;
- Replay, Chart, Session, generic drawings, and other packages continue;
- re-enabling a compatible package restores validated projections without
  rewriting the historical Artifact revision;
- incompatible upgrades fail closed and preserve the last readable bytes for
  explicit migration, downgrade, or quarantine handling.

The Obsidian-like product goal is easy enable/disable and independent extension
of the host. It is not permission equivalence: future third-party trading
plugins require stricter capability, no-future, data-access, resource, and
failure boundaries than trusted first-party packages.

## Host-Rendered Property Inspector

V7 provides one schema-driven Property Inspector for selected Drawings and
Semantic Artifacts. It is an Annotation UI surface, not a state owner. Type
packages declare property schemas and host-mediated pickers; they do not render
arbitrary DOM, hold drafts after disposal, or write accepted state.

The candidate surface groups are:

| Group | Responsibility |
| --- | --- |
| Semantic | type-specific attributes, roles, lifecycle state, referenced Definition/Profile, effective overrides, and status |
| Evidence | source Bars/Artifacts, typed relations, confidence, and definition version |
| Style | colors, width, fill, labels, and projection presentation |
| Visibility | Pane/timeframe/Session Hours and scale visibility policies |
| History | provenance, baseline/override sources, revisions, and package version; read-only |

The host control schema must support bounded text/number/enumeration controls,
conditional groups, validation messages, read-only derived values, and
host-owned Bar/Artifact/relation pickers. Every visible parameter is marked as
`AUTO`, `MANUAL`, `OVERRIDDEN`, or `LOCKED` from accepted provenance rather than
UI guesswork.

Inspector flow is:

```text
exact selected entity revision
  -> host reads active package/property schema
  -> transient local draft and preview
  -> host/schema validation
  -> exact-revision Annotation command
  -> prepared persistence + projection transaction
  -> accepted new revision or complete rollback
```

The Inspector may reuse a generic schema-form renderer with future Indicator
Settings, but ownership remains separate: Indicator inputs submit Indicator
commands; Drawing/Semantic properties submit Annotation commands. There is no
universal settings store.

The existing Workstation Settings dialog is a lifecycle reference for disposable
draft/preview/cancel/save behavior, not the implementation of this schema host.
Its current form is feature-specific. R13 first ships the minimum typed
Geometry/Style controls required by Segment and Rectangle, then extracts the
bounded schema renderer when the first semantic package supplies an independent
real schema. Bar, Artifact, and relation pickers are added only with a package
whose accepted workflow requires them; they are not built speculatively as an
empty platform.

If a semantic package is unavailable, the Inspector displays preserved raw
attributes, type/package versions, provenance, and history in read-only form.
It must not discard unknown fields or offer edits without the validating
definition. Desktop may use a docked panel or dialog and compact layouts may use
a modal/sheet; these presentations share one draft/command contract.

## Projection Contract

Artifact projection is deterministic over:

```text
artifact + accepted replay cutoff + immutable pane snapshot + pane context
  -> zero or more ArtifactProjection values
```

An `ArtifactProjection` declares geometry, presentation, labels, hit regions,
and interaction policy without exposing vendor objects. One artifact may
project differently by Pane or timeframe while preserving one semantic
identity. A projection may be absent when its instrument, visibility policy,
Replay cutoff, or registered capability does not apply.

Price/time-anchored projections should adapt to Lightweight Charts Series
Primitives. Pane Primitives remain appropriate for Pane-wide masks, watermarks,
or decorations that do not need price/time scale labels. This is an adapter
decision, not a persisted domain distinction.

V7 uses Lightweight Charts 5.2.0. Its official plugin contract separates Custom
Series for data-driven series from Primitives for drawing tools, annotations,
and other layered visuals. The official Custom Series lifecycle includes
`destroy`; Series Primitives include `attached`/`detached`. V7 must still own
their creation and teardown through its sole adapter:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/custom_series>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/pane-primitives>
- <https://tradingview.github.io/lightweight-charts/plugin-examples/>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/trend-line>

Those examples are implementation references, not V7 state, persistence,
semantic, transaction, or ownership contracts.

### Accepted Projection And Transient Preview Ports

Annotation must not reuse the existing whole-Workspace Chart Snapshot
Application for an entity edit. Chart exposes dedicated bounded ports while
retaining sole vendor-write ownership:

```text
ChartAnnotationPreviewPort
  replace(previewIdentity, projections)
  clear(previewIdentity)
  dispose()

ChartAnnotationProjectionPort
  prepare(annotationRevision, projections)
  apply(prepared) -> exact receipt
  rollback(prepared, receipt?)
  finalize(prepared, receipt)
```

Preview replacement is transient, latest-wins, bounded, and cannot update
accepted Chart/Annotation revisions. The accepted projection port attaches,
updates, and detaches only Annotation primitives; it never stages or rewrites
candlestick data, Viewport intent, Replay state, or the complete Workspace
snapshot.

When an affected Pane is mounted, an interactive Annotation command requires an
exact dedicated projection receipt before success is reported and rolls back
the prepared Annotation operation on projection failure. An absent/offscreen
Chart is not a persistence failure: headless restore, import, migration, and
Session loading may accept valid Annotation state without a mounted surface,
and the next mounted Chart projects the exact accepted Annotation revision.
This rule prevents the optional durable domain from depending on vendor-view
availability while preserving exact visible confirmation for interactive edits.

## Owner Boundaries

```text
Annotation UI
  -> Annotation Interaction Controller (transient tool/selection intent)
    -> public Chart annotation-interaction/preview ports
    -> public Annotation commands
      -> Annotation Runtime (sole Annotation Document writer)
        -> pure Geometry Registry
        -> host-owned Semantic Package/Type Registry
          -> active first-party definitions and bounded policies
        -> prepared Annotation persistence port
        -> immutable Annotation snapshot notification
          -> Annotation Projection assembly
            -> public Chart annotation-projection port
              -> Chart Runtime / Lightweight Chart Adapter (sole visual writer)

accepted immutable Pane/Replay snapshot + exact user selection
  -> pure Annotation Evidence Resolver
    -> bounded immutable EvidenceBundle
      -> host-invoked semantic construction policy
```

Rules:

- UI owns transient tool choice, focus, hover, and drag preview intent only;
- Annotation Interaction Controller arbitrates drawing/edit gestures with native
  Chart interaction and releases every capture/mode/listener on cancellation or
  disposal;
- Annotation Runtime owns accepted entity revisions, undo/redo history, and
  canonical Annotation Document state;
- persistence adapter owns stored bytes and schema migration, not product
  meaning;
- semantic type packages validate and project but own no mutable document;
- first-party semantic packages use the same registration/lifecycle port and
  no SMC type id is hard-coded into a core owner;
- Chart Runtime/Adapter remains the only owner allowed to attach, detach, or
  update Lightweight Charts primitives;
- Annotation modules consume accepted immutable Pane/Replay snapshots and
  cannot request or cache bars;
- Evidence Resolver is pure, reads only one supplied accepted snapshot, and
  cannot trigger Bar Data or Replay work;
- Workspace Transaction and Replay own no Annotation entity state;
- composition wires the optional capability and must boot unchanged without it.

No feature module may directly control another feature module. A future
Backtesting, Journal, or Campaign workflow uses public Annotation commands and
artifact queries, or a separate workflow module, never owner internals.

## Replay And No-Future Contract

Annotations must not reveal future knowledge.

- an entity is not visible before its `observedAtReplayCutoffEpochMs`;
- future mitigation, fill, sweep, invalidation, or confirmation cannot appear
  while the accepted Replay cutoff precedes that evidence;
- current lifecycle presentation is derived at an exact accepted cutoff from
  no-future evidence, rather than overwriting the historical artifact with its
  latest-known final status;
- a detector receives immutable no-future Pane/bar snapshots and never queries
  Bar Data directly;
- source bar references retain dataset revision and timeframe/projection
  provenance;
- moving Replay causes a read-only reprojection, not a mutation of canonical
  Annotation state.

Artifact lifecycle may later use append-only evidence events. R13.1 does not
select an event-store implementation, but any representation must reproduce
`stateAt(cutoff)` deterministically.

## Persistence, Transactions, And History

The Annotation repository uses its own versioned, Session-keyed namespace. It
must not place vendor coordinates or large bar arrays in Session checkpoints.
Cross-device replication is a later explicit allowlist extension and cannot be
assumed from local persistence.

Every accepted create, edit, promotion, delete/archive, undo, or redo is one
revision-checked Annotation transaction:

1. validate the command and construct an immutable candidate;
2. prepare persistence without publishing it;
3. when an affected Chart surface is mounted, prepare and apply only the
   dedicated Annotation projection contribution and obtain an exact receipt;
4. decide the Annotation operation once;
5. finalize persistence, accepted Annotation state, and any mounted projection,
   or restore the prior bytes, state, and affected visual contribution exactly;
6. when no affected Chart surface is mounted, commit valid durable state without
   inventing a visual participant; a later mount projects the accepted revision.

This may reuse V7's generic prepared-commit/reversible-application mechanisms,
but it must not reuse the whole-Workspace Chart Snapshot Application, join the
Workspace Transaction, or become an alternate Workspace Transaction owner. A
command that cannot prove rollback poisons/reconstructs only the optional
Annotation capability and must not corrupt Replay, bars, Session, candlestick
series, or Viewport state.

Pointer-move previews are transient and bounded. Pointer-up or keyboard commit
creates at most one accepted transaction. Preview state is never persisted,
replicated, or treated as semantic evidence.

## Public Contract Shape

The detailed API is deferred to the implementation step, but it must cover:

Commands:

- create generic drawing;
- prepare/cancel/commit evidence-constrained semantic construction;
- replace geometry by exact revision;
- replace presentation by exact revision;
- archive/restore entity;
- promote drawing to semantic artifact;
- update artifact attributes/relations/overrides through its registered schema;
- undo/redo one Annotation transaction.

Queries:

- read complete immutable document by Session id;
- read one entity by opaque id;
- list available geometry and semantic type definitions;
- read the exact Property Inspector schema and accepted parameter provenance for
  one entity revision;
- derive visible projections for an exact Pane/Replay context;
- export a versioned document without vendor objects.

Notifications:

- accepted document revision changed;
- projection invalidation requested for an exact Session/Pane context;
- optional capability entered recoverable or terminal failure state.

Notifications never form a business workflow and never become required for the
publisher's correctness.

Host integration ports:

- resolve bounded evidence from one exact accepted Pane/Replay snapshot without
  requesting Bars;
- arbitrate Annotation tool mode against Chart-native interaction;
- replace/clear one bounded transient projection preview;
- prepare/apply/rollback/finalize one accepted Annotation projection revision;
- report whether an affected Chart surface is currently mounted without
  exposing a vendor handle.

## First Delivery Sequence

After R13.1 human acceptance, activate one bounded delivery id at a time. The
ids below are the audited candidate order, not authorization to implement later
steps early:

1. **R13.2 — Minimal Geometry Contract:** pure Market Anchor plus Point,
   Segment, and Rectangle registry definitions; prove later registration without
   implementing Ray/Line/Polyline/Bezier; reject calculated Indicator series as
   Drawing Geometry;
2. **R13.3 — Headless Annotation Runtime:** removable sole document writer,
   exact revisions, fake repository, public commands/queries, independent
   harness, zero-package boot, and no Chart/UI dependency;
3. **R13.4 — Accepted Chart Projection Port:** dedicated Annotation projection
   prepare/apply/rollback/finalize contract plus a static Segment fixture and
   primitive lifecycle proof; no pointer UI or Workspace snapshot mutation;
4. **R13.5 — Segment Interaction:** disposable Interaction Controller,
   Chart-native gesture arbitration, coordinate conversion, one bounded Segment
   preview, cancel/dispose, and one pointer-up transaction;
5. **R13.6 — Rectangle And Minimal Inspector:** Rectangle projection, hit
   testing/selection, transient edit preview, and only the typed Geometry/Style
   controls required by the two implemented shapes;
6. **R13.7 — Durable Annotation History:** Session-local repository, hard reload,
   exact-revision undo/redo, import/export, opaque-field preservation, and schema
   migration without requiring a mounted Chart;
7. **R13.8 — Pane/Time/Replay Projection:** explicit cross-timeframe anchor
   policy, multi-Pane projection, generic Drawing cutoff provenance, and complete
   Replay/no-future acceptance;
8. **R13.9 — Semantic Package Registry And Liquidity Level Slice:** trusted
   compile-time package registration, runtime disable/re-enable/disposal,
   unresolved-artifact survival, minimal Semantic/History Inspector schema, and
   BSL/SSL manual creation or Drawing promotion only;
9. **R13.10 — Evidence Resolver And FVG Slice:** pure accepted-snapshot evidence
   resolution, the exact Bar picker required by the workflow, deterministic
   three-candle FVG construction, Evidence Inspector, baseline/effective-source
   badges, validated override, and rectangle/midpoint/label projections;
10. **R13.11 — Equality Relation Slice:** EQL/EQH multi-anchor relations,
    versioned tolerance Definition/Profile, relation picker, validation, and
    conformance fixtures rather than bundling equality semantics into R13.9;
11. **R13.12 — Structure Packages:** focused first-party OB and Breaker packages
    with typed evidence and derivation relations;
12. **R13.13 — Detector Suggestions:** automatic detection only after free
    drawing, promotion, evidence-constrained semantics, evidence drill-down, and
    no-future behavior are accepted.

Implementation note, 2026-08-09: the former R13.10 candidate is deliberately
split so it does not combine a new pure owner boundary, Chart interaction, the
first evidence-derived business package, Inspector behavior, and overrides.
R13.10a activates only the pure accepted-snapshot Evidence Resolver. R13.10b
through R13.10e retain exact Bar picking, FVG construction/projection,
Inspector override, and final closure as separately authorized steps.

No delivery step may combine a new owner boundary, a new interaction state
machine, a generic UI framework, persistence migration, and the first business
type in one commit. Each step receives its own focused specification, descriptor
and manifest inventory, independent harness, architecture gate, and—when
browser-visible—human acceptance.

Business workflows must consume the accepted foundation rather than ship their
own drawing stores or Chart renderers.

## Related Unresolved Product Memo

`MEMO-V7-003` in
`V7_CHART_RESEARCH_SEMANTIC_CASE_AGENT_PREDECISION_MEMO.md` describes a possible
AI-Agent-participatory Research, Training, and Trading Review system which could
reference accepted Semantic Artifact revisions as Study Case, drill, and review
evidence. That memo neither accepts this ADR nor authorizes Research, Training,
Review, analytics, Agent, detector, persistence, or UI work.

If both directions later proceed, the three learning loops must consume
Annotation-owned artifact references and the accepted no-future provenance
contract. They must not create a second semantic store, Chart writer, Replay
owner, or Bar Data requester. Research/Training/Review ownership and the
relationship among Study Case, Journal Setup Case, Session, and plugin contracts
remain separate future decisions.

## Acceptance And Harness Gates

R13 implementation cannot close without executable evidence for:

- geometry normalization and invalid-anchor negative controls;
- no pixels, logical coordinates, Canvas objects, or vendor handles in stored
  schemas;
- persisted polyline/Bezier curves use bounded market-coordinate shape state,
  while MA/EMA/VWAP/other calculated series are rejected from Annotation state;
- one accepted writer for the Annotation Document and one Chart visual writer;
- optional-module removal boot with unchanged Replay/Chart core;
- core boot and generic drawing behavior with zero semantic packages;
- every first-party semantic type registered through one extension port, with
  zero core branches for BSL/EQL/FVG/OB/Breaker ids;
- disabling one semantic package atomically removes its tools/projections and
  disposes lifecycle resources while preserving unresolved artifacts; compatible
  re-enable restores projections without rewriting evidence;
- package failure, incompatible version, or missing definition leaves other
  packages, generic drawings, Session, Replay, and Chart usable;
- free drawing creates Geometry-first state with no implicit semantic claim;
- evidence-constrained construction requests no Bars directly, rejects evidence
  beyond the Replay cutoff, and deterministically derives the same baseline from
  identical evidence/definition/package inputs;
- Evidence Resolver accepts only one supplied accepted Pane/Replay snapshot,
  returns exact versioned Bar/Artifact references, and fails rather than pulling
  missing neighbor evidence;
- human recognition plus derived construction remains distinguishable from
  detector recognition in persisted provenance and later research queries;
- Inspector drafts/previews never become accepted evidence, and cancel,
  validation failure, stale revision, persistence failure, or mounted-surface
  render failure restores exact prior state;
- every parameter separates versioned definition/override policy from one
  Artifact's baseline/effective value, displays the effective source, and
  preserves derived/manual/default/override provenance, with invalid semantic
  overrides rejected or explicitly converted rather than silently retaining the
  original type;
- package-unavailable Inspector mode preserves and displays unknown attributes
  and provenance read-only;
- exact create/edit/delete/undo/redo rollback under persistence failures and,
  when an affected Chart is mounted, dedicated Annotation render failures;
- headless restore/import/migration and later exact-revision projection without
  requiring a mounted Chart or rewriting the Workspace/candlestick snapshot;
- hard reload and schema migration;
- multi-Pane/timeframe reprojection from one canonical entity through an
  explicit exact-instant or containing-display-bucket anchor policy, with no
  silent nearest-item fallback;
- no generic Drawing, Semantic Artifact, or lifecycle evidence visible before
  its mandatory accepted Replay cutoff;
- unregistered semantic ids and incomplete provenance rejected;
- FVG semantics surviving rectangle style/projection replacement;
- Breaker-to-OB relation retaining source identity;
- zero direct Bar Data requests and zero direct Replay mutation;
- zero direct Chart/DOM/Canvas/persistence handles exposed to semantic packages;
- one interaction arbitrator between drawing tools and native Chart gestures,
  bounded latest-wins pointer preview, and no leaked captures, modes, listeners,
  or primitives after cancel/disposal;
- real-browser visual, keyboard, focus, selection, zoom, drag, and resize review.

## Human Decision Gate

Human review must explicitly confirm:

1. “Drawing and Semantic Annotation foundation” is the accepted layer name;
2. `DrawingGeometry`, `DrawingEntity`, `SemanticArtifact`,
   `ArtifactProjection`, and adapter-local `RenderPrimitive` are the accepted
   terms;
3. FVG/OB/Breaker/BSL/EQL are semantic artifacts rather than geometry subtypes;
4. one removable Annotation Runtime owns both generic and semantic document
   state;
5. implementation begins with the minimal Point/Segment/Rectangle contract and
   bounded generic Segment/Rectangle behavior before unused geometry types or
   any automatic trading-semantic detector;
6. manually anchored polyline/Bezier paths may be Drawing Geometry, while MA
   and other calculated series remain outside Annotation ownership;
7. first-party semantic types use removable packages from the first semantic
   slice, while dynamic third-party loading/SDK/Marketplace remain later
   decisions;
8. free drawing and user-recognized evidence-constrained semantic construction
   are separate supported creation paths, with detector suggestion remaining a
   later third source;
9. one host-rendered Property Inspector owns schema-driven drafts, validation,
   preview, parameter-source visibility, and command submission without owning
   accepted Annotation state;
10. one pure Evidence Resolver consumes only supplied accepted Pane/Replay
    snapshots, while packages, UI, and Annotation Runtime remain unable to
    request or cache Bars;
11. definition policy is separate from per-Artifact baseline/effective value and
    override provenance;
12. transient preview and accepted Annotation projection use dedicated Chart-
    owned ports and never reuse the complete Workspace Chart Snapshot
    Application;
13. one disposable interaction controller arbitrates drawing tools with native
    Chart gestures without exposing vendor handles;
14. BSL/SSL proves the minimal semantic package boundary, FVG separately proves
    evidence-constrained derivation, and EQL/EQH follows only after versioned
    equality/tolerance relations are defined.

The user explicitly confirmed this gate on 2026-08-08 and authorized only the
separately specified R13.2 delivery. Later R13 steps retain their own bounded
specification and acceptance requirements.

## Revision History

### 2026-08-07 — Initial Proposal

Defined the Drawing Geometry, Drawing Entity, Semantic Artifact,
Artifact Projection, Annotation ownership, persistence, no-future, and initial
delivery boundaries.

### 2026-08-07 20:26 PDT — Curve And Plugin-Boundary Refinement

Clarified that manually anchored curves are registered Geometry while MA and
other data-calculated curves remain Indicator results. Required every
first-party semantic type to use a removable host-owned package interface from
the first semantic slice, with compile-time composition and runtime
enable/disable before any later dynamic third-party loader. Added artifact
survival, disposal, failure-isolation, zero-package boot, and re-enable gates.

### 2026-08-07 21:51 PDT — Construction And Property-Inspector Refinement

Added Geometry-first free drawing and user-recognized evidence-constrained
semantic construction as separate creation paths, while retaining detector
suggestion as a later provenance-distinct path. Replaced one-dimensional
creation mode with recognition/construction sources, defined deterministic
evidence derivation and validated human overrides, and bound one host-rendered
Property Inspector for semantic, evidence, style, visibility, and history
schemas without creating a new state owner.

### 2026-08-08 — Implementation-Path Audit

Narrowed the first executable Geometry registry, made Replay cutoff provenance
mandatory for generic Drawings, and added explicit cross-timeframe anchor
projection policy. Added the pure accepted-snapshot Evidence Resolver, separated
parameter definitions from per-Artifact baseline/effective values, and required
one drawing/native-Chart interaction arbitrator. Split transient previews from
accepted Annotation projection through dedicated Chart-owned ports, prohibited
reuse of the complete Workspace Chart Snapshot Application, defined mounted and
headless transaction behavior, and decomposed the first delivery sequence into
bounded R13.2–R13.13 candidate steps. BSL/SSL, FVG, and EQL/EQH now prove
different extension concerns rather than one bundled first semantic slice.

### 2026-08-08 — Human Acceptance

The user explicitly accepted ADR-V7-001 after the implementation-path audit and
authorized the separately bounded R13.2 Minimal Geometry Contract. This closes
the R13.1 decision gate but does not authorize Chart, interaction, persistence,
Property Inspector, semantic package, FVG/OB/EQL, or detector implementation.

### 2026-08-08 — Community-Reuse Preflight Addendum

Accepted ADR-V7-002 applies the ecosystem-review requirement before R13.6.
Official Lightweight Charts Series Primitive implementation patterns may be
adapted behind the accepted V7 ports. Reviewed community drawing/toolkit
runtimes cannot replace or duplicate Chart, interaction, Annotation document,
Replay, persistence, or semantic-package owners and were not added as
dependencies. Indicator calculation remains a separate future adapter
decision. See `V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md`; this addendum does not
authorize R13.6.
