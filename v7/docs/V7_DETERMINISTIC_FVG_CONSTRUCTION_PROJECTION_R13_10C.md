# V7 R13.10c Deterministic FVG Construction And Projection

Status: accepted and closed 2026-08-10

Date: 2026-08-10

Depends on: accepted R13.9b, R13.10a, R13.10b, R13.8, and R13.4

## Outcome

R13.10c activates one removable trusted-build Fair Value Gap Semantic package.
It consumes only an R13.10a branded immutable Evidence Bundle, applies one
versioned strict three-Bar wick-gap definition, and emits one generic Semantic
Artifact draft plus declarative Rectangle, midpoint-Segment, and label
presentation projections.

The step proves the first evidence-derived business type without adding a new
Bar requester, Replay owner, Annotation writer, Chart writer, selection owner,
Inspector framework, override command, detector, or production toolbar.

R13.10d Evidence Inspector/validated override and R13.10e final workflow closure
remain separately unauthorized.

## Upstream Reuse Decision

Lightweight Charts 5.2 Series Primitives already provide the required attached,
detached, pane-view, update, and Canvas rendering lifecycle. The official
Rectangle and Trend Line examples remain the rendering reference. The existing
V7 Rectangle and Segment RenderPrimitives therefore remain the sole drawing
surfaces; R13.10c adds only a bounded optional projection label presentation to
the existing Rectangle primitive.

The awesome-tradingview catalogue and current community drawing runtimes do not
provide V7's evidence identity, no-future contract, reversible multi-Pane
projection, package lifecycle, or sole-writer boundaries. R13.10c adds no new
dependency and does not adopt a foreign drawing or semantic runtime.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesPrimitiveBase>
- <https://tradingview.github.io/lightweight-charts/docs/5.1/plugins/intro>
- <https://github.com/tradingview/lightweight-charts/tree/v5.2.0/plugin-examples/src/plugins/rectangle-drawing-tool>
- <https://github.com/tradingview/lightweight-charts/tree/v5.2.0/plugin-examples/src/plugins/trend-line>
- <https://github.com/tradingview/awesome-tradingview>

## Owner Flow

```text
host composition
  -> optional.annotation-evidence-resolver
       returns one branded immutable Evidence Bundle
  -> optional.semantic-fair-value-gap
       owns only pure FVG definition/construction/projection policies
  -> optional.annotation-semantic-registry
       host-stamps exact package/definition identity
  -> optional.annotation-runtime
       remains the sole accepted Annotation Document writer
  -> optional.annotation-context-projection
       derives source-agnostic Pane/Replay projection sets
  -> optional.annotation-chart-projection
       remains the sole Lightweight Charts primitive writer
```

The FVG package receives no Chart, Series, Canvas, DOM, Bar Data requester,
Replay writer, Workspace writer, Annotation Runtime, repository, storage,
network, or owner-internal handle.

## Strict Three-Bar Definition

The registered type is `imbalance.fvg@1.0.0`. Its exact definition identity is
`imbalance.fvg.strict-three-bar-wick-gap@1.0.0` in package
`first-party.fair-value-gap@1.0.0`.

Construction requires exactly three resolved Bars with relative offsets
`[-1, 0, 1]`. The selected offset-0 Bar is the recognition candle and the
offset-1 Bar is the confirming candle. The bundle must contain no Artifact
references for this definition.

All three Bar references must retain one exact dataset revision, instrument,
source timeframe, display timeframe, accepted Replay cutoff, and ordered
non-overlapping source interval. The preceding Bar end must equal the selected
Bar start and the selected Bar end must equal the confirming Bar start. A
session/time gap is rejected rather than silently treated as formation
evidence.

The strict formation rules are:

- bullish: preceding `high <` confirming `low`;
- bearish: preceding `low >` confirming `high`;
- touching wicks, overlap, malformed Bars, or ambiguous evidence are rejected.

The middle Bar's shape, body size, displacement, volume, mitigation state,
minimum tick size, and tolerance do not alter this versioned definition. Later
profiles may add those rules under new identities; they may not silently change
stored 1.0.0 meaning.

## Deterministic Artifact

Identical branded evidence, Session identity, creation time, package version,
and definition version must produce byte-equivalent construction output.

The Artifact records:

- direction: `bullish` or `bearish`;
- lower, upper, and midpoint price parameters with equal derived baseline and
  effective values, `effectiveSource: derived`, and no override provenance;
- exact preceding, selected, and confirming Bar starts;
- all three canonical source-Bar references;
- human recognition plus derived construction provenance;
- accepted Workspace revision, Pane identity, serialized Session identity,
  selected Bar start, and the strict profile identity in package provenance;
- the exact accepted Replay cutoff as observation time.

R13.10c defines no editable parameter. R13.10d must retain these baselines and
revalidate the complete Artifact if it later authorizes an effective override.

## Projection Contract

The package emits two source-agnostic projection subjects from the unchanged
Artifact revision:

1. one Rectangle covering the exact gap price range from the preceding Bar
   start to the confirming Bar start;
2. one midpoint Segment across the same market-time range.

The Rectangle carries a projection-only `Bullish FVG` or `Bearish FVG` label.
Label text/color/size/visibility are portable presentation data and are not
stored semantic truth. The existing Chart-owned Rectangle primitive renders the
label; no package code receives Canvas authority.

Both subjects use
`projection.anchor.accepted-containing-bucket@1.0.0` with all three exact
source-Bar references. A Pane with missing/ambiguous accepted buckets, another
instrument, a pre-observation Replay cutoff, or endpoints which collapse into
one projected bucket receives no shape. Nothing snaps to a nearby Bar or
requests missing history.

Package disable/failure removes both projections while retaining the unchanged
unresolved Artifact. Compatible re-enable reproduces the same projections at
the same Artifact/document revision.

## H111 Automated Gate

H111 must prove:

- branded Evidence Bundle and branded Session identity are mandatory;
- exact `[-1, 0, 1]` evidence, source identity, adjacency, and zero Artifact
  references;
- deterministic bullish and bearish construction plus strict rejection of
  touching, overlapping, gapped, future, malformed, lookalike, and cross-
  Session evidence;
- exact host-stamped package/definition identity and durable unresolved
  survival without a persistence migration;
- derived baseline/effective parameter provenance with no override surface;
- Rectangle, midpoint, and label projection data with no business-id branch in
  the generic Runtime, context projector, or Chart transaction owner;
- before/after Replay no-future behavior, compatible package disable/re-enable,
  multi-Pane projection, and byte-identical candlestick data;
- real Lightweight Charts pixels for bullish and bearish fixtures, native
  drag/wheel continuity, and complete primitive teardown;
- no Bar request, Replay/Workspace/Annotation write, DOM, storage, or network
  authority in the package;
- production module assembly, optional removal, architecture, writer,
  hardening, source-quality, standalone, JSON, and patch-format gates.

## Human Acceptance

R13.10c requires a focused local visual gate because it adds a new visible
Rectangle/midpoint/label composition. The gate must confirm:

1. strict bullish and bearish three-Bar fixtures create the correct price gap;
2. the Rectangle, midpoint, and label remain aligned while dragging/zooming;
3. before-observation Replay hides the complete FVG and after-observation
   restores it without changing candles;
4. package disable/re-enable removes/restores the same visual Artifact;
5. native Chart drag and wheel remain unchanged.

Accepted 2026-08-10: the user confirmed the strict bullish/bearish fixtures,
Rectangle/midpoint/label alignment, Replay hide/restore, package
disable/re-enable, unchanged candles, and native Chart navigation at the
focused local fixture. H111 is accepted and R13.10c may close as one separate
commit.

## Excluded

- Evidence Inspector groups or generic schema-form extraction;
- editable bounds, validated overrides, override commands, or preview drafts;
- production Picker/FVG toolbar composition;
- automatic detection, displacement/volume/tolerance profiles, mitigation or
  lifecycle inference;
- label editing, relation picking, AI, analytics, Dataset Builder, Journal,
  Backtesting, or shared-data workflows;
- dynamic third-party packages or Marketplace behavior;
- R13.10d, R13.10e, or later work.
