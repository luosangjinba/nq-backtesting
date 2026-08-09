# V7 Segment Interaction And Preview — R13.5

Status: accepted (2026-08-08)

Harness invariant: `H103`

## Outcome

R13.5 activates one removable, non-semantic Segment interaction slice. A user
can arm one Segment gesture, drag between two market-coordinate anchors, see a
bounded transient preview, cancel without accepted state, or release the
pointer to issue exactly one generic-Drawing command.

This step proves the interaction and visual contracts in an isolated real-
browser acceptance surface. It does not yet wire a production workstation
toolbar, Property Inspector, Rectangle, selection/edit handles, persistence,
undo/redo, cross-timeframe projection, semantic package, or business type.
Production composition remains a later explicitly bounded step.

## Owners And Module Boundary

R13.5 keeps three owners distinct:

```text
test/host tool button
  -> optional.annotation-interaction
       owns transient Segment tool state only
       -> injected Geometry contract
       -> injected ChartAnnotationInteractionPort
       -> injected ChartAnnotationPreviewPort
       -> injected generic-Drawing command port

ChartAnnotationInteractionPort + ChartAnnotationPreviewPort
  -> optional.annotation-chart-projection
       owner: chart-runtime-adapter
       -> DOM/Lightweight Charts/Series Primitive
```

`optional.annotation-interaction` receives no DOM node, Window, Chart, Series,
Canvas, Replay, Bar Data, Workspace, repository, or semantic-package handle.
The Chart-owned module receives no Annotation Runtime or mutable document.
The command port is injected by composition and exposes only one generic
Drawing commit; it cannot be called from pointer move.

The controller module requires the already optional Geometry and Annotation
Chart Projection modules. Removing the controller leaves the accepted Chart,
Replay, Workspace, and both dependencies functional. Removing either required
port removes the controller rather than creating a fallback writer.

## Chart Annotation Interaction Port

The public Chart-owned port is bounded to one exclusive, one-shot gesture:

```text
ChartAnnotationInteractionPort
  acquire({ onStart, onMove, onEnd, onCancel }) -> lease
  snapshot()
  dispose()

lease
  release(reason)
```

Callbacks receive immutable normalized events containing only:

```text
paneId
pointerId
sequence
anchor { instrumentId, epochMs, price }
```

The adapter alone:

- owns PointerEvent/keydown/blur listeners and pointer capture;
- rejects a second exclusive lease;
- verifies a primary pointer begins inside the declared plot Pane;
- applies a configured drag threshold before preview movement is accepted;
- converts horizontal coordinates with `coordinateToTime`, vertical
  coordinates with `coordinateToPrice`, and display time through an injected
  exact display-to-market resolver;
- suppresses vendor pan/zoom while the lease is armed and restores the exact
  prior native options after pointer-up, Escape, pointer cancel, focus loss,
  lease release, or disposal;
- leaves Crosshair configuration unchanged and exposes no vendor handle.

The production workstation is not composed in R13.5. When it is composed, this
Chart-owned port must be the interaction arbitrator; feature/UI code must not
add a parallel pointer-listener set beside native Chart interactions.

## Transient Preview Port

R13.5 adds the previously reserved Chart-owned port:

```text
ChartAnnotationPreviewPort
  replace(previewIdentity, projections)
  clear(previewIdentity)
  snapshot()
  dispose()
```

Rules:

- one branded opaque Preview identity owns one active preview lifetime;
- `replace` accepts a bounded projection list and serializes mutations;
- at most one active and one latest queued replacement exist, so pointer rate
  cannot grow an unbounded promise, DOM, primitive, or transaction queue;
- a newer queued replacement supersedes an older queued replacement;
- preview attach/update/detach uses the same bounded primitive adapter as
  accepted projection but never changes accepted Annotation/projection
  revisions;
- `clear` requires the exact Preview identity and removes every preview
  primitive;
- mutation failure attempts exact reverse cleanup and poisons only the optional
  preview owner when cleanup cannot be proved;
- Preview state is never persisted, replicated, emitted as semantic evidence,
  or included in Workspace state.

R13.5 uses exactly one `geometry.segment` projection in the preview. The
transaction owner remains geometry-type agnostic.

## Segment Interaction Controller

The removable controller exposes:

```text
SegmentInteractionController
  arm({ interactionId })
  cancel(reason)
  settle()
  snapshot()
  dispose()
```

`interactionId` is an opaque caller-allocated correlation identity, not a
Drawing id allocator or persistence key. One arm is one-shot:

1. `onStart` brands the normalized start Market Anchor;
2. each eligible `onMove` creates immutable Segment Geometry and requests a
   newer preview projection;
3. duplicate/stale callback sequence is ignored or rejected without commit;
4. `onEnd` creates the final Geometry, waits for the latest preview, and calls
   the injected generic-Drawing command exactly once;
5. accepted command completion clears Preview and returns to idle;
6. command/preview failure, Escape, pointer cancel, focus loss, explicit
   cancel, or disposal clears Preview and issues zero additional commands.

The controller never creates a transaction per move. It does not allocate a
Drawing id, inspect Bars, assign FVG/BSL/EQL/OB meaning, or mutate accepted
Annotation state directly. The injected command owner is responsible for the
R13.1 exact mounted/headless Annotation transaction contract; R13.5 only proves
that the gesture invokes it at most once.

## Official Capability Decision

Lightweight Charts 5.2 exposes `chartElement()` for adapter-owned event
listeners, `coordinateToTime()` and `coordinateToPrice()` for inverse
coordinate conversion, Chart interaction options for native gesture
arbitration, and Series Primitives for transient rendering. Its official
Rectangle Drawing Tool uses click/crosshair subscriptions plus a separate
Preview Primitive. V7 uses the documented vendor mechanisms but does not copy
the example's combined toolbar/state/Chart owner.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool>
- <https://github.com/tradingview/awesome-tradingview>

## H103 Automated Gates

The independent Harness must prove:

- exact port shapes, immutable normalized anchors, one exclusive lease, primary
  pointer filtering, plot bounds, drag threshold, coordinate failures, and
  display-to-market mapping;
- native pan/zoom suppression plus exact restoration after commit, Escape,
  pointer cancel, focus loss, explicit cancel, and disposal, with Crosshair
  options unchanged;
- active primary-pointer events are consumed at the Chart adapter boundary so
  vendor Canvas drag handlers cannot race the armed drawing gesture;
- latest-wins bounded Preview queue, same-handle Segment update, exact clear,
  supersession, failure cleanup/poison, and no accepted-revision mutation;
- one pointer-up command after many moves and zero commands after every cancel
  path, duplicate end, stale callback, failure, or disposal;
- no DOM/vendor/Replay/Bar/Workspace/repository/semantic imports in the
  Interaction Controller and no Annotation Runtime/semantic imports in the
  Chart-owned ports;
- real Lightweight Charts Chrome evidence for arm, drag preview, commit,
  Escape cleanup, native drag restoration, unchanged candlestick data, and no
  leaked listeners/primitives after disposal;
- ModuleHost dependency/removal, production assembly, architecture writer,
  source-quality, standalone, and regression gates.

## Human Visual Gate

Before the R13.5 commit, the local acceptance surface must remain open for the
user to confirm:

1. arming Segment visibly changes only the fixture tool state;
2. dragging paints one responsive preview from the initial anchor;
3. pointer-up leaves one accepted Segment and reports one commit;
4. Escape/cancel removes the preview and leaves no accepted Segment;
5. ordinary Chart drag/zoom works again after commit or cancel;
6. no duplicate line, stuck drawing mode, stale preview, or white/blurred UI is
   visible.

The fixture must display the press-hold-drag-release instruction and an armed/
drawing crosshair cursor; Canvas movement during an active drawing gesture is
a failed gate even when native option flags report disabled.

Human visual acceptance completed on 2026-08-08 after the Chart adapter added
explicit active-PointerEvent isolation. The user confirmed responsive Segment
creation, three accepted fixture lines, and no competing Canvas movement.

## Exit Boundary

R13.5 authorizes no R13.6 code. Rectangle projection, hit testing, selection,
edit handles, style controls, and the minimal host Property Inspector require a
separate contract and authorization.
