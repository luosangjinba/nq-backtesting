# V7 Minimal Annotation Geometry Contract — R13.2

Status: binding headless implementation step

Date: 2026-08-08

Parent decision: `ADR-V7-001`

Harness invariant: `H100`

## Outcome

R13.2 activates the smallest reusable market-coordinate Geometry boundary for
the accepted Drawing and Semantic Annotation foundation. It provides immutable
and branded `MarketAnchor` and `DrawingGeometry` values, three initial Geometry
definitions, and one immutable extensible registry.

The production module is `optional.annotation-geometry-domain`. It is a pure,
static, removable module with no ports or lifecycle resources. Its presence does
not activate Annotation state, UI, Chart projection, persistence, or semantic
meaning.

## Scope

R13.2 implements only:

- exact market-coordinate anchors;
- `geometry.point`;
- `geometry.segment`;
- `geometry.rectangle`;
- versioned trusted-build Geometry type definitions;
- immutable registry construction, lookup, listing, and Geometry creation;
- portable, bounded-by-definition payload validation;
- stable domain failures and structural-lookalike rejection;
- descriptor, manifest inventory, independent harness, negative fixtures, and
  optional-module removal evidence.

R13.2 does not implement:

- `DrawingEntity`, `SemanticArtifact`, or Annotation Document state;
- Chart, Lightweight Charts Primitives, Canvas, DOM, hit testing, or coordinate
  conversion;
- pointer/keyboard tools, previews, selection, or Property Inspector;
- persistence, import/export, undo/redo, or schema migration;
- Replay visibility, entity provenance, or `observedAtReplayCutoffEpochMs`;
- Ray, infinite line, horizontal level, Polyline, Bezier, FVG, BSL, EQL, OB,
  Breaker, Indicator, or detector behavior;
- dynamic package loading or mutable global registration.

## Market Anchor Contract

The canonical input is exact:

```text
MarketAnchor {
  instrumentId
  epochMs
  price
}
```

Rules:

- `instrumentId` is a trimmed non-empty canonical identity string supplied by
  trusted composition; R13.2 performs no Instrument Registry lookup;
- `epochMs` is a non-negative safe integer;
- `price` is a finite number; negative prices remain representable;
- extra fields are rejected rather than ignored;
- values are branded and deeply immutable;
- structural lookalikes are rejected by readers and Geometry constructors;
- pixel, logical-index, Canvas, DOM, Chart, or native Series state cannot enter
  an anchor.

`MarketAnchor` intentionally owns no Pane, timeframe, Replay cutoff, creator,
or persistence identity. Those belong to later entity/provenance contracts.

## Drawing Geometry Envelope

Every accepted Geometry reads as one portable immutable envelope:

```text
DrawingGeometry {
  schemaVersion: 1
  typeId
  typeVersion
  payload
}
```

The branded runtime value prevents an arbitrary object from masquerading as an
accepted Geometry. The public reader returns only the frozen portable envelope,
never the registered normalizer or a vendor object.

### Point

`geometry.point@1.0.0` contains one branded Market Anchor:

```text
payload { anchor }
```

### Segment

`geometry.segment@1.0.0` contains two same-instrument branded anchors:

```text
payload { startAnchor, endAnchor }
```

Vertical and horizontal segments are valid. Two identical time/price anchors
are degenerate and rejected.

### Rectangle

`geometry.rectangle@1.0.0` accepts two same-instrument branded corner anchors
and stores normalized intervals:

```text
payload {
  instrumentId
  startEpochMs
  endEpochMs
  lowPrice
  highPrice
}
```

Input direction has no semantic meaning. Time and price bounds are normalized;
zero-duration or zero-height rectangles are rejected.

## Geometry Type Definition

A trusted-build extension registers a branded definition:

```text
GeometryTypeDefinition {
  typeId
  version
  normalize(input) -> portable payload
}
```

Rules:

- ids use the stable `geometry.<namespace>` form;
- versions use semantic `x.y.z` form;
- the normalizer is synchronous and deterministic;
- returned payloads contain only null, booleans, strings, finite numbers,
  arrays, and plain records;
- cycles, functions, symbols, bigint, `undefined`, class instances, and vendor-
  coordinate/handle fields are rejected;
- the envelope is deep-frozen after normalization;
- calculated-series inputs such as Bars, indicator/formula identity, or cached
  output points cannot be stored as Drawing Geometry;
- registry code branches on no concrete Geometry id.

Definitions are trusted compile-time policy contributions. Dynamic code loading,
sandboxing, permissions, and package installation remain outside R13.2.

## Immutable Registry

`createGeometryRegistry({ definitions })` constructs one isolated immutable
registry. It:

- requires branded definitions;
- rejects duplicate `typeId` values;
- returns deterministic type-id-sorted public metadata;
- returns `null` for an unknown optional lookup;
- rejects creation through an unknown type id;
- invokes only the selected registered definition;
- owns no mutable global registration, subscription, timer, or cache.

`createInitialGeometryRegistry()` composes only Point, Segment, and Rectangle.
A harness-only fourth definition proves extension without editing registry code
or adding a concrete-id branch.

## Public Contract

The module exports:

- `AnnotationGeometryError`;
- `GEOMETRY_TYPE_IDS`;
- `createMarketAnchor` and `readMarketAnchor`;
- `defineGeometryType` and `readGeometryTypeDefinition`;
- `createGeometryRegistry` and `createInitialGeometryRegistry`;
- `createPointGeometry`, `createSegmentGeometry`, and
  `createRectangleGeometry`;
- `readDrawingGeometry`.

Every factory is synchronous and deterministic. No operation performs I/O or
requires cancellation. Stable error codes distinguish malformed anchors,
definitions, registry composition, payloads, and Geometry values.

## Ownership And Module Boundary

```text
trusted composition
  -> optional.annotation-geometry-domain public entry
    -> branded definitions
      -> immutable Geometry Registry
        -> branded DrawingGeometry values
```

The module owns Geometry validation/normalization only. It does not own a
document, accepted entity revision, semantic type, projection, or visible
surface. Later Annotation modules depend only on its public entry. Replay,
Bar Data, Chart, Workspace Transaction, and current application modules acquire
no dependency on R13.2.

## H100 Acceptance Gates

R13.2 closes only when executable evidence proves:

- exact valid anchor round-trip and structural-lookalike rejection;
- extra fields, non-finite price, invalid epoch, and empty instrument rejection;
- Point, Segment, and direction-independent normalized Rectangle values;
- cross-instrument, degenerate Segment, and degenerate Rectangle rejection;
- deep immutability of envelopes, payloads, nested anchors, registry metadata,
  and registry surface;
- deterministic sorted registry listing and duplicate/unknown-type failures;
- a fourth harness definition registers and creates Geometry without changing
  registry production code;
- non-portable, cyclic, vendor-coordinate, Bar-array, and Indicator/formula-
  shaped payloads fail closed;
- module descriptor, public entry, manifest inventory, source-quality policy,
  and production ModuleHost assembly remain conforming;
- the optional module can be omitted while the remaining production descriptor
  graph still boots;
- no imports from V4/V5/V6 and no Chart/DOM/Canvas/persistence dependency;
- `git diff --check` and focused architecture/source-quality Harnesses pass.

This is a headless non-visual delivery. It activates no browser human gate. The
next implementation step remains R13.3 Headless Annotation Runtime and requires
its own binding specification; R13.2 completion does not authorize it.
