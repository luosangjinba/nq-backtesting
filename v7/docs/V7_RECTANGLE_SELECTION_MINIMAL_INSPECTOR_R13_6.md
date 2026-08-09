# V7 R13.6 Rectangle, Selection, And Minimal Inspector

Status: accepted; H104 automated and corrected local human visual evidence pass.

Date: 2026-08-09

## Decision

R13.6 extends the generic Drawing foundation with one normalized Rectangle,
non-invasive accepted-Drawing selection, transient edit Preview, and a minimal
typed Property Inspector for Segment and Rectangle. It remains a test-only
integration slice. It does not add a production toolbar, workstation route,
durable Annotation Repository, semantic package, automatic detector, or
undo/redo surface.

The implementation adapts only the lifecycle, view/renderer, coordinate, and
teardown patterns allowed by accepted ADR-V7-002. The reviewed upstream source
is the official Lightweight Charts Rectangle Drawing Tool example pinned at
commit `ef7335a8007236eac38bd50cacddc305c7fcb293`. V7 does not import its toolbar,
drawing-state owner, event owner, or persisted model and adds no community
runtime dependency.

## Owner Boundaries

`optional.annotation-runtime` remains the sole accepted Annotation Document
writer. It now owns a branded minimal Drawing Presentation and one exact-
revision `reviseDrawing` transaction that changes Geometry and Presentation
atomically. Failed repository settlement restores the exact prior document.

`optional.annotation-chart-projection`, under `chart-runtime-adapter`, remains
the sole Chart primitive writer. It projects Segment or Rectangle, converts
market coordinates only at the adapter boundary, owns accepted hit testing,
and keeps pointer listeners and native Chart arbitration closed over.

`optional.annotation-interaction` owns only transient tool, selection, and
Inspector draft state. Its public controller receives bounded Runtime,
Geometry, Presentation, Preview, and projection functions. It receives no DOM,
Chart, Series, Canvas, Replay, Bar Data, Workspace, or persistence handle.

The browser fixture owns only DOM form binding and Module composition. It may
dispatch controller operations and render controller snapshots; it may not
write accepted Drawing state or mutate a Chart primitive directly.

## Minimal Drawing Presentation

The accepted value is branded, deeply immutable, and exact:

```text
schemaVersion: 1
strokeColor: #rrggbb
strokeWidth: 1..12
fillColor: #rrggbb
fillOpacity: 0..1
```

Colors normalize to lower case. Segment uses stroke controls only. Rectangle
uses stroke and fill controls. Presentation is generic Drawing appearance, not
business meaning; names such as FVG, OB, BSL, or EQL remain absent.

Existing Drawings whose `presentation` is `null` remain readable. Inspector
selection materializes the deterministic default Presentation only in its
transient draft; accepted state changes only on Save.

## Rectangle Contract

Rectangle creation reuses the R13.5 one-shot two-anchor controller. Geometry
normalization remains in `optional.annotation-geometry-domain`; dragging in any
direction produces ordered start/end market time and low/high price. R13.6
extends the Chart-owned normalized gesture adapter with two equivalent input
forms while retaining the same `onStart`/`onMove`/`onEnd` controller contract:

- TradingView-style placement: first click fixes the start anchor, released
  pointer movement updates Preview, and the second click fixes the end anchor;
- efficient drag placement: press fixes the start, held movement updates
  Preview, and release fixes the end anchor.

Both forms issue at most one generic create command. The exclusive tool lease
continues suppressing native pan only until completion/cancellation and then
restores the exact prior Chart options. Right-click/context menu and Escape are
equivalent explicit cancellation paths: each prevents the menu/tool side
effect, clears Preview, creates no Drawing, and restores native interaction.
Pointer cancel, focus loss, explicit toolbar cancel, failure, and disposal
retain the same zero-command behavior.

The adapter-local Rectangle Series Primitive:

- consumes only a branded vendor-neutral Annotation Projection;
- paints bounded fill and stroke pixels without autoscale or candle mutation;
- optionally paints four selection handles for Inspector Preview;
- exposes bounded pixel hit testing through the Chart-owned adapter;
- updates the same attached handle for a newer projection;
- detaches before destruction and releases all references on disposal.

## Selection Contract

When no drawing lease is active, a primary-button pointer-down inside the plot
creates only a click candidate. It does not call `preventDefault`, stop
propagation, capture the pointer, or disable native Chart navigation. Movement
beyond the existing drag threshold cancels that candidate, so normal pan/drag
does not select a Drawing. A matching pointer-up asks the accepted projection
owner for the nearest bounded hit and emits only opaque entity/projection
identity.

When a drawing lease is active, R13.5 arbitration remains unchanged: the
adapter suppresses native movement only for that active drawing gesture and
restores native options on every terminal path.

Selection is transient and device-local. It is not part of the Annotation
Document, Session checkpoint, Workspace snapshot, or server-sync payload.

## Minimal Inspector Contract

Selecting one active Segment or Rectangle reads one exact Drawing plus current
document revision and creates one disposable draft. The controller exposes
typed immutable controls:

- Segment: start/end epoch, start/end price, stroke color, stroke width;
- Rectangle: start/end epoch, low/high price, stroke color, stroke width,
  fill color, fill opacity.

Every field change must cite the current draft revision. Accepted Geometry and
Presentation constructors validate the candidate before Preview replacement.
Stale draft revisions, unsupported fields, invalid typed values, missing
Drawings, archived Drawings, and malformed ports fail closed with stable codes.

Draft changes update only the transient Inspector Preview. Cancel clears that
Preview and discards the draft. Save submits one exact document/Drawing
revision command that atomically replaces Geometry and Presentation; only
successful Runtime settlement is synchronized to accepted Chart projection.
The controller does not mutate the Runtime query result and has no implicit
retry against newer accepted state.

R13.6 deliberately does not implement schema-driven semantic parameters,
evidence editing, validation packages, history, visibility scope, automatic
anchor calculation, or semantic override provenance. Those remain later R13
slices behind the Property Inspector host boundary from ADR-V7-001.

## Module Shape

The existing interaction module is extended instead of introducing a second
selection or Inspector owner. Its descriptor now declares Runtime, Geometry,
and Chart Projection as required public ports. Focused internal boundaries
separate:

- generic two-anchor gesture orchestration;
- one transient Drawing Preview session;
- Segment and Rectangle configuration wrappers;
- Inspector field/Geometry/Presentation conversion;
- Inspector selection, draft revision, Preview, Save, Cancel, and disposal.

The Chart projection module separately owns Segment and Rectangle primitive
implementations, accepted projection transactions, Preview transactions, the
Series mutation adapter, and the normalized pointer bridge. These files share
public projections but never import Runtime internals.

## H104 Evidence

`tests/annotation-rectangle-inspector-harness.js` proves:

- Presentation branding, normalization, bounds, and lookalike rejection;
- atomic Geometry plus Presentation revision and rollback;
- Rectangle Primitive attach, coordinate projection, bounded hit, detach, and
  destroy;
- one-shot Rectangle Preview and exactly one accepted command;
- click selection without native-event consumption and drag non-selection;
- Inspector selection, typed draft, transient Preview, stale rejection,
  Segment/Rectangle field separation, Save, and Preview cleanup;
- real Lightweight Charts click-move-click Rectangle drawing, accepted
  Rectangle and Segment selection, Rectangle parameter edit, atomic save,
  Segment-only fields and endpoint handles, right-click cancellation, unchanged
  candlestick data, restored native navigation, and isolated disposal;
- 23 declarative negative controls.

The full gates additionally require ModuleHost dependency resolution, the
12-case optional-removal matrix, production assembly, architecture/writer and
source-quality baselines, standalone runtime, regression matrix, JSON parsing,
and `git diff --check`.

## Human Visual Gate — Accepted 2026-08-09

Acceptance fixture:

```text
http://127.0.0.1:8013/v7/tests/fixtures/annotation-rectangle-inspector/
```

Confirm:

1. `Arm Rectangle`, click once to fix the start, release the button, move the
   pointer, and click again; a cyan Preview becomes one accepted blue Rectangle
   without moving the whole Canvas. Repeat once with press-drag-release and
   confirm the faster form also creates exactly one Rectangle.
2. Click inside the Rectangle; the Inspector appears and four light handles
   identify the selected transient Preview.
3. Change fill opacity, fill/stroke color, width, or market coordinates; the
   chart Preview updates while accepted state remains unchanged until Save.
4. Press Cancel and verify the accepted Drawing is unchanged; repeat and Save,
   then reselect to verify the saved values.
5. Click the seeded Segment and verify only Segment geometry and stroke fields
   appear: no Fill/Opacity fields are visible, and two light endpoint handles
   make the selected line visually distinguishable.
6. With no tool armed, drag and wheel the chart; native navigation still works
   and a drag does not accidentally select a Drawing.
7. Start a new two-click Rectangle, move until Preview is visible, then
   right-click; the browser menu does not appear, Preview clears, and no
   Rectangle is added. Repeat with Escape and confirm the same result.

The first local human review on 2026-08-09 rejected the original fixture: it
offered only press-drag-release instead of the expected two-click placement,
Segment selection still displayed Fill controls because author CSS overrode the
HTML `hidden` state, and Segment Preview rendered no endpoint handles. The
corrective implementation adds hybrid two-anchor placement plus right-click
cancellation, an explicit `[hidden]` CSS rule, and Chart-owned Segment endpoint
handles. A second local review found that a real secondary-button sequence could
cancel the lease before the later `contextmenu` event, allowing the native menu
to appear. The port now consumes secondary `pointerdown`, retains a bounded
one-shot suppression window for the corresponding `contextmenu`, and tests the
real browser event sequence. H104 automated evidence passed again. The user
re-tested the corrected fixture on 2026-08-09 and explicitly accepted the full
R13.6 visual gate, including native-menu suppression. H104 is accepted.

## Non-Authorization

R13.6 does not authorize R13.7, production workstation composition, durable
Drawing persistence, undo/redo, Ray/Line/Curve Geometry, calculated Indicator
series, semantic packages, FVG/OB/BSL/EQL behavior, detectors, AI Agent tools,
or dynamic third-party plugin loading.
