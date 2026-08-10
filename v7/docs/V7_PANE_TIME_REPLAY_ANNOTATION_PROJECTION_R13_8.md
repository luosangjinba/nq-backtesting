# V7 R13.8 Pane/Time/Replay Annotation Projection

Status: accepted

Date: 2026-08-09

Depends on: accepted R13.2–R13.7

## Decision

R13.8 adds one removable, source-agnostic projection owner between accepted
Annotation state and the existing per-Chart Annotation projection ports. It
selects explicit cross-timeframe anchor policies, derives a bounded projection
set for every exact Pane/Replay context, and settles all mounted Pane ports as
one reversible visual operation.

This step adds no semantic type/package, evidence resolver, detector, business
workflow, production toolbar, Annotation document writer, Bar requester, Replay
cursor writer, or Workspace transaction participant. R13.9 remains separately
unauthorized.

## Owner Boundaries

`optional.annotation-context-projection` owns only:

- immutable Pane/Replay projection frames and source-agnostic subjects;
- composition-local anchor-policy registration and dispatch;
- pure geometry projection through the registered Geometry public port;
- no-future visibility and instrument/Pane eligibility;
- a reversible multi-Pane reconciliation coordinator.

`optional.annotation-runtime` remains the sole accepted Annotation Document and
history writer. `optional.annotation-geometry-domain` remains the sole Geometry
type/anchor traversal owner. `optional.annotation-chart-projection`, under the
Chart owner, remains the sole primitive attach/update/detach writer. Replay,
Bar Data, Pane Workspace, and Workspace Transaction state are read-only inputs
or remain completely absent.

The new module receives the Geometry projection operation, branded Chart
projection factory, and mounted Pane ports explicitly. It receives no Chart,
Series, Canvas, DOM, Bar Data, Replay Runtime, or storage handle.

## Exact Projection Frame

One frame contains:

```text
sessionId
annotationRevision
reconciliationRevision
replayCutoffEpochMs
panes[] {
  paneId
  instrumentId
  timeframeId
  acceptedBuckets[] { startEpochMs, endEpochMs }
}
```

All Panes share the exact Session, accepted Annotation revision, Replay cutoff,
and monotonically increasing reconciliation revision. Accepted buckets are
bounded immutable evidence already supplied by the host. The projection owner
does not request, cache, aggregate, or manufacture Bars.

Moving Replay changes only the projection frame. It never edits canonical
Geometry, Drawing provenance, Annotation revision, history, or persistence.

## Source-Agnostic Projection Subject

A subject contains an opaque entity/projection identity, entity revision,
portable Geometry, optional Drawing Presentation, exact
`observedAtReplayCutoffEpochMs`, a registered anchor-policy reference, and any
source-Bar references required by that policy.

The contract deliberately contains no `drawing` versus `artifact` branch and
no FVG/BSL/SSL/EQL/OB/Breaker id. A future Semantic package may emit the same
subject without gaining Chart or projection-owner authority.

## Selected Anchor Policies

R13.8 registers exactly two versioned built-in policies through the same public
definition/registry API available to future packages:

1. `projection.anchor.exact-instant@1.0.0`
   - an anchor is eligible only when the target Pane has an accepted bucket
     whose start equals the canonical anchor instant;
   - it never snaps to a nearby Bar;
   - missing exact target evidence makes that projection absent.
2. `projection.anchor.accepted-containing-bucket@1.0.0`
   - every source anchor requires an exact supplied source-Bar reference that
     contains the canonical instant and matches its instrument;
   - the target anchor maps to the start of the exact supplied accepted target
     bucket containing that instant;
   - the mapping provenance retains canonical source instant, source Bar,
     target timeframe, target bucket, policy id, and policy version;
   - missing/ambiguous evidence or degenerate projected Geometry makes the
     projection absent, never guessed or silently normalized.

Point, Segment, and Rectangle anchor traversal stays inside registered Geometry
definitions. Neither the projection registry nor coordinator branches on a
concrete Geometry id. The same policy surface is suitable for later
source-agnostic Semantic Artifact projections.

## Replay And No-Future Rules

- a subject is absent while `replayCutoffEpochMs` is earlier than its exact
  `observedAtReplayCutoffEpochMs`;
- an instrument-mismatched Pane is absent;
- a canonical endpoint later than the Replay cutoff is unavailable and hides
  the complete Geometry; it is never clamped, snapped, or partially drawn;
- moving Replay backward hides and moving it forward restores projections by a
  read-only reconciliation with the same Annotation revision;
- source evidence outside the supplied accepted frame is unavailable rather
  than fetched;
- canonical Annotation/Geometry snapshots remain byte-identical across every
  reconcile.

## Multi-Pane Reconciliation

The coordinator derives all Pane sets before calling a mounted surface. It
prepares every surface inertly, applies in deterministic Pane order, and obtains
one exact receipt per Pane. Any prepare/apply failure rolls back every applied
Pane in reverse order and cancels every remaining preparation.

After all applies succeed, the reconciliation decision is accepted once and
all Pane ports finalize. A post-decision cleanup failure poisons the optional
coordinator/surface and requires reconstruction; it does not claim that already
accepted visual state was rolled back. Unmounted Panes are valid and receive
the latest accepted frame when later reconciled.

The Chart projection port gains a separate monotonic reconciliation revision so
Replay can reproject the same Annotation document revision. Its legacy R13.4
`prepare(annotationRevision, projections)` contract remains compatible.

## H106 Acceptance

H106 must prove:

- exact frame/subject/policy contracts, immutable outputs, bounded buckets, and
  composition-local plugin registration;
- Point/Segment/Rectangle traversal only through registered Geometry policies;
- exact-instant absence and containing-bucket mapping with complete provenance;
- missing/ambiguous/source-mismatched evidence fails absent or with a stable
  validation error and never mutates canonical Geometry;
- multi-Pane deterministic derivation, instrument filtering, and unmounted-Pane
  tolerance;
- read-only Replay backward/forward visibility at one unchanged Annotation
  revision using increasing reconciliation revisions;
- reverse rollback of every mounted Pane on prepare/apply failure and poison on
  post-decision finalization failure;
- a real Lightweight Charts 5.2 fixture with NQ 1m and 5m Panes: before the
  observation cutoff neither shape is visible; after it, exact Segment appears
  only on 1m while containing-bucket Rectangle appears correctly on both;
- candlestick data, canonical document/Geometry, Replay state, Viewport, and
  native chart navigation remain unchanged;
- independent module, optional removal, architecture/writer/source-quality,
  standalone, regression, JSON, and patch-format gates.

The fixture is a visible product-behavior acceptance surface, so H106 remains
executable until the user completes the local visual gate. No R13.8 commit is
formed before that acceptance.

Automated evidence on 2026-08-09 passes 15 declared negative controls, exact
Point/Segment/Rectangle traversal, before/after/before Replay reconciliation at
one unchanged Annotation revision, multi-Pane rollback, post-decision poison,
real NQ 1m/5m Chromium pixels, 16 optional-removal cases, and every standing
architecture, writer, source-quality, standalone, regression, JSON, and patch-
format gate.

## Human Acceptance

The user accepted the local two-Pane fixture on 2026-08-09 after verifying the
cache-versioned page. In the after-observation state, NQ 1m showed the cyan
exact Segment plus amber containing-bucket Rectangle and NQ 5m showed only the
amber Rectangle. The before-observation action removed both Pane sets together;
the after-observation action restored them without moving or rewriting candles.
H106 is accepted.

## Non-Authorization

R13.8 does not authorize semantic package registration, BSL/SSL/FVG/EQL/OB or
Breaker behavior, source evidence resolution from Bars, automatic detection,
production drawing controls, Journal/Backtesting workflows, cross-device sync,
or R13.9 implementation.
