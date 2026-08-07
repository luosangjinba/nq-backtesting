# V7 Drawing And Semantic Annotation Foundation — R13.1

Decision id: `ADR-V7-001`

Status: proposed binding pre-implementation specification; human review pending

Date: 2026-08-07

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
- collaborative editing, sharing, permissions, or general multi-user accounts;
- a second Chart writer, Replay runtime, Bar Data requester, or client cache;
- import/export compatibility with another chart product.

The first implementation step may begin only after this decision receives
explicit human acceptance and a new bounded delivery id.

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

Every anchor must use the exact registered instrument identity and a finite
price. Time is an exact epoch instant. A projection adapter may translate an
anchor into chart coordinates only for the lifetime of one render pass.

### Initial Geometry Registry

The first registry should contain these distinct types:

- `geometry.point` — one market anchor;
- `geometry.segment` — two finite anchors;
- `geometry.ray` — one origin plus a second anchor defining direction;
- `geometry.infinite-line` — two anchors defining an unbounded line;
- `geometry.horizontal-level` — one price plus bounded or open time policy;
- `geometry.rectangle` — a normalized time interval and price interval.

Segment, ray, infinite line, and horizontal level are separate definitions.
Boolean combinations such as `extendLeft`/`extendRight` must not turn one loose
line record into several incompatible geometries.

Polyline, path, ellipse, Fibonacci tools, text, image, and measurement tools are
future registered geometries. Their absence must not require changing the
initial geometry owners.

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
origin and creation time but carries no claim that a free-form drawing is a
valid SMC/ICT structure.

### Semantic Artifact

```text
SemanticArtifact {
  artifactId
  typeId
  typeVersion
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
- creation mode such as `manual`, `detector`, or `import`;
- detector/definition version when not purely manual;
- creator/state namespace when available, without storing credentials.

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

V7 uses Lightweight Charts 5.2.0. Its official plugin contract describes
Primitives as the extension mechanism for drawing tools and annotations, and
its official examples include Rectangle Drawing Tool and Trend Line:

- <https://tradingview.github.io/lightweight-charts/docs/5.1/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/pane-primitives>
- <https://tradingview.github.io/lightweight-charts/plugin-examples/>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/trend-line>

Those examples are implementation references, not V7 state, persistence,
semantic, transaction, or ownership contracts.

## Owner Boundaries

```text
Annotation UI
  -> public Annotation commands
    -> Annotation Runtime (sole Annotation Document writer)
      -> pure Geometry and Semantic Type registries
      -> prepared Annotation persistence port
      -> immutable Annotation snapshot notification
        -> Annotation Projection assembly
          -> public Chart annotation-projection port
            -> Chart Runtime / Lightweight Chart Adapter (sole visual writer)
```

Rules:

- UI owns transient tool choice, focus, hover, and drag preview intent only;
- Annotation Runtime owns accepted entity revisions, undo/redo history, and
  canonical Annotation Document state;
- persistence adapter owns stored bytes and schema migration, not product
  meaning;
- semantic type packages validate and project but own no mutable document;
- Chart Runtime/Adapter remains the only owner allowed to attach, detach, or
  update Lightweight Charts primitives;
- Annotation modules consume accepted immutable Pane/Replay snapshots and
  cannot request or cache bars;
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
3. apply the complete declarative Chart projection and obtain an exact receipt;
4. decide once;
5. finalize persistence and accepted Annotation state, or restore the prior
   bytes, state, and visual projection exactly.

This may reuse V7's prepared-commit/reversible-application mechanisms, but it
does not join or become an alternate Workspace Transaction owner. A command
that cannot prove rollback poisons/reconstructs only the optional Annotation
capability and must not corrupt Replay, bars, Session, or Chart series.

Pointer-move previews are transient and bounded. Pointer-up or keyboard commit
creates at most one accepted transaction. Preview state is never persisted,
replicated, or treated as semantic evidence.

## Public Contract Shape

The detailed API is deferred to the implementation step, but it must cover:

Commands:

- create generic drawing;
- replace geometry by exact revision;
- replace presentation by exact revision;
- archive/restore entity;
- promote drawing to semantic artifact;
- update artifact attributes/relations through its registered schema;
- undo/redo one Annotation transaction.

Queries:

- read complete immutable document by Session id;
- read one entity by opaque id;
- list available geometry and semantic type definitions;
- derive visible projections for an exact Pane/Replay context;
- export a versioned document without vendor objects.

Notifications:

- accepted document revision changed;
- projection invalidation requested for an exact Session/Pane context;
- optional capability entered recoverable or terminal failure state.

Notifications never form a business workflow and never become required for the
publisher's correctness.

## First Delivery Sequence

After R13.1 human acceptance, allocate new steps rather than implementing the
whole foundation in one change:

1. pure market-anchor, geometry registry, and negative-contract fixtures;
2. removable Annotation Runtime, document revisions, fake persistence, and
   independent harness;
3. Chart projection port plus an official-example-based Segment vertical slice;
4. Rectangle vertical slice, hit testing, transient edit preview, and rollback;
5. Session-local persistence, hard reload, undo/redo, import/export, and schema
   migration;
6. multi-Pane/timeframe projection and Replay/no-future acceptance;
7. semantic registry and manual BSL/EQL promotion with focused type specs;
8. manual FVG artifact with rectangle/midpoint/label projections;
9. focused OB and Breaker specs with typed derivation relations;
10. automatic detection only after manual semantics and evidence drill-down are
    accepted.

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
- one accepted writer for the Annotation Document and one Chart visual writer;
- optional-module removal boot with unchanged Replay/Chart core;
- exact create/edit/delete/undo/redo rollback under persistence and render
  failures;
- hard reload and schema migration;
- multi-Pane/timeframe reprojection from one canonical entity;
- no entity visibility or lifecycle evidence before the Replay cutoff;
- unregistered semantic ids and incomplete provenance rejected;
- FVG semantics surviving rectangle style/projection replacement;
- Breaker-to-OB relation retaining source identity;
- zero direct Bar Data requests and zero direct Replay mutation;
- bounded pointer preview and no leaked listeners/primitives after disposal;
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
5. implementation begins with generic Segment/Rectangle behavior before any
   automatic trading-semantic detector.

Until that confirmation, R13.1 remains a proposed specification and authorizes
no production implementation.
