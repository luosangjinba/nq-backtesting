# V7 Accepted Annotation Chart Projection — R13.4

Status: implemented contract activation (2026-08-08)

Harness invariant: `H102`

## Outcome

R13.4 activates one removable, Chart-owned port for projecting already accepted
Annotation state. It proves that a static market-coordinate Segment can be
attached, updated, detached, and destroyed as a Lightweight Charts 5.2 Series
Primitive without giving Annotation code a Chart/Series handle and without
rewriting candle data, Viewport intent, Replay state, or a Workspace snapshot.

This step contains no pointer interaction, selection, hit testing, preview,
inspector, durable Annotation repository, semantic package, or production
workstation wiring. R13.5 remains a separate decision.

## Owner And Module Boundary

The production module is `optional.annotation-chart-projection`, owned by
`chart-runtime-adapter`. It is removable and has no required or optional module
ports. Construction receives one bounded primitive adapter explicitly:

```text
accepted immutable AnnotationProjection[]
  -> ChartAnnotationProjectionPort
    -> injected AnnotationPrimitiveAdapter
      -> adapter-local RenderPrimitive
        -> Lightweight Charts Series Primitive
```

The port never imports Annotation Runtime, Geometry Domain, Replay, Bar Data,
Workspace Transaction, Workspace State, DOM, or a concrete business package.
Projection assembly remains a later composition concern. The R13.4 Harness may
use R13.2 Geometry to create a fixture, but this is not a production dependency.

## Minimal Projection Value

`AnnotationProjection` is a branded, deeply immutable declaration containing:

```text
schemaVersion: 1
projectionId: opaque caller-allocated identity
revision: positive projection revision
entityId: opaque source-entity identity
geometry: portable Geometry envelope
```

The projection revision belongs to the projected output, not to Chart and not
necessarily to the source entity. Reusing one `projectionId + revision` with
different content is a hard collision. A higher accepted Annotation revision
may retain an identical projection revision; changed projection content must
advance its own revision.

R13.4 deliberately adds no Presentation, label, hit region, selection, or
business-semantic fields. The static Segment renderer receives a fixed Harness
style through adapter-local construction. R13.6 must add typed Presentation via
an explicit contract revision rather than an untyped payload escape hatch.

## Accepted Projection Transaction

The public port is exactly bounded to Annotation primitives:

```text
ChartAnnotationProjectionPort
  prepare(annotationRevision, projections) -> prepared
  apply(prepared) -> exact receipt
  rollback(prepared, receipt?)
  finalize(prepared, receipt)
  snapshot()
  dispose()
```

Rules:

- `prepare` is inert: it allocates no primitive and performs no visible write;
- only one preparation may be active;
- a newly mounted empty port may project any non-negative exact Annotation
  revision, supporting headless Annotation restore before Chart mount;
- after one revision is accepted, stale or repeated Annotation revisions fail;
- `apply` may create/attach, update, or detach only declared Annotation
  primitives and returns one branded receipt bound to the exact preparation;
- `rollback` of an applied preparation requires that exact receipt and restores
  the prior handles, projections, and visible primitive set;
- `finalize` first publishes the new accepted projection revision, then destroys
  detached obsolete handles; cleanup failure poisons only this optional port;
- a failed apply attempts reverse-order exact restoration; unprovable rollback
  poisons the port instead of reporting false success;
- `dispose` rolls back unfinished work and detaches/destroys every accepted
  primitive exactly once.

The accepted revision may jump forward on initial or later reconciliation. It
is a projection of independently accepted Annotation truth, not an alternate
Annotation Document revision owner.

## Primitive Adapter Contract

The injected adapter exposes only:

```text
create(projection) -> handle
attach(handle)
update(handle, projection)
detach(handle)
destroy(handle)
```

The Chart-owned Lightweight Charts bridge maps these operations to
`series.attachPrimitive`, the handle's bounded update operation,
`series.detachPrimitive`, and handle disposal. It does not expose `setData`,
`update` on candlestick series, time-scale mutation, or Chart removal.

The Segment RenderPrimitive is adapter-local. It validates only
`geometry.segment`, converts epoch milliseconds and prices through the supplied
Chart/Series APIs during `updateAllViews`, and draws one Canvas line. It omits
autoscale, labels, interaction, and hit regions, so the fixture cannot change
Viewport policy or claim later Presentation behavior.

## Lightweight Charts And Ecosystem Decision

Lightweight Charts 5.2 documents Series Primitives as the extension surface for
drawing tools and price/time anchored annotations. Its lifecycle provides
`attached`, `detached`, `requestUpdate`, `updateAllViews`, pane views, and
optional autoscale information. The official Trend Line and Rectangle examples
confirm the coordinate-conversion and renderer pattern. Neither the library nor
the awesome-tradingview catalogue provides V7's exact projection revision,
receipt, reversible apply, or owner boundary, so those remain V7 contracts.

References:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/trend-line>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool>
- <https://github.com/tradingview/awesome-tradingview>

## H102 Acceptance Gates

The independent Harness must prove:

- branded immutable projection values, exact fields, portable Geometry, unique
  identities, ordered candidates, and revision-collision rejection;
- inert prepare, single active preparation, exact receipt matching, phase
  ordering, stale Annotation revision rejection, and forward reconciliation;
- attach/update/retain/detach planning without geometry-type branching in the
  transaction owner;
- reverse rollback after each mutation phase and poison on failed restoration;
- finalize/dispose destruction and idempotent disposal;
- a real Lightweight Charts 5.2 browser fixture paints a static Segment, updates
  the same primitive handle, removes it, runs `attached`/`detached`, and leaves
  exact candlestick data unchanged;
- production source contains no business ids, Annotation Runtime internals,
  Replay/Bar/Workspace imports, pointer events, preview API, or Workspace
  snapshot mutation;
- ModuleHost, optional removal, architecture writer inventory, source-quality,
  standalone, and regression gates pass.

The real browser fixture is test-only and changes no production workstation
pixels, route, CSS, or control. Therefore R13.4 has no manual product-visual
acceptance gate.

## Exit Boundary

R13.4 authorizes no R13.5 code. Segment pointer interaction still requires a
separate disposable Interaction Controller, native-gesture arbitration,
coordinate-conversion port, bounded preview port, cancellation, and one
pointer-up Annotation transaction.
