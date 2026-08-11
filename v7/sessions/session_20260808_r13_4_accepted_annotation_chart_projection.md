# Session — R13.4 Accepted Annotation Chart Projection

Date: 2026-08-08

Status: implemented; automated Chart/Primitive gate

## Trigger And Boundary

The user authorized R13.4 and required every completed step to form its own
commit. The previously accepted architecture principles remain binding:
modular boundaries first, feature modules decoupled, business semantics
plugin-first, and Chart Runtime/Adapter the sole visual writer.

R13.4 therefore implements only accepted Annotation projection. It does not
implement pointer tools, transient preview, selection, hit testing, Property
Inspector, durable history, semantic packages, or production workstation
wiring.

## External Capability Review

The implementation rechecked Lightweight Charts 5.2 official Plugin and Series
Primitive documentation plus the official Trend Line and Rectangle examples.
They establish `attached`/`detached`, `requestUpdate`, `updateAllViews`,
price/time coordinate conversion, and Canvas pane rendering as the appropriate
vendor lifecycle. The awesome-tradingview catalogue adds no transaction or
owner boundary. V7 therefore uses the official primitive mechanism but retains
its own exact revision, receipt, rollback, and finalize protocol.

## Implementation

- Added removable `optional.annotation-chart-projection`, owned by
  `chart-runtime-adapter` and independent of Annotation Runtime/Geometry module
  ports.
- Added branded deeply immutable vendor-neutral projections with opaque entity
  and projection identity, independent positive revision, portable Geometry,
  stable ordering, and revision-collision rejection.
- Added an inert `prepare`, reversible `apply`, exact-receipt `rollback`, exact
  `finalize`, forward reconciliation, stale rejection, local poison, snapshot,
  and disposal lifecycle.
- Added a five-method injected Primitive adapter so the transaction owner can
  never receive candle, Viewport, Replay, Workspace, DOM, or vendor handles.
- Added the bounded Lightweight Charts Series bridge and one non-interactive
  Segment RenderPrimitive. The renderer has no autoscale, labels, interaction,
  hit regions, preview, or business-type branch.
- Expanded production Chart writer detection to inventory primitive attach/
  detach, assigning both modules to the same `chart-runtime-adapter` owner.

## Executable Evidence

The independent H102 Harness proves:

- inert prepare, exact receipt identity, forward initial mount, retain/update/
  attach/detach planning, stale/collision rejection, and phase ordering;
- automatic reverse rollback after attach/update/detach failures, poison when
  rollback is unprovable, finalize cleanup poison, and idempotent disposal;
- 30 declarative negative controls and production source scans excluding
  business ids, Runtime internals, Bars, Replay, Workspace, pointer events, and
  preview behavior;
- real Lightweight Charts 5.2 Chrome Canvas pixels for a static Segment,
  same-handle update, detach/destroy, and exact unchanged candlestick data;
- real ModuleHost public entry and standalone optional removal.

Current machine evidence contains 465 files, 38,855 effective lines, 4,067 functions, and 428 public exports. Architecture evidence contains
59 modules, 131 actual dependency edges, 115 construction sites, 18 declared
writer surfaces, 21 observed writer files, 21 lifecycle modules, twelve
optional-removal cases, and zero blocking findings.

## Visual Gate And Continuation

R13.4 paints only a reviewed test fixture. It changes no production HTML, CSS,
route, control, Chart composition, or user workflow, so no manual product-
visual acceptance window is required. R13.5 remains unauthorized and must
separately define Segment interaction, gesture arbitration, coordinate ports,
bounded preview, cancellation/disposal, pointer-up transaction, and its human
visual gate.

Binding contract:
`../docs/V7_ACCEPTED_ANNOTATION_CHART_PROJECTION_R13_4.md`.
