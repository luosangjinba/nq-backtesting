# Session — R13.8 Pane/Time/Replay Annotation Projection

Date: 2026-08-09

Status: accepted; H106 automated and human gates closed

## Scope

R13.8 adds a removable, source-agnostic projection owner above existing
Chart-owned Annotation projection ports. It adds no production toolbar,
semantic package, evidence detector, accepted Annotation writer, Bar requester,
Replay writer, Workspace participant, or persistence owner.

## Implementation

- exact immutable Session/Annotation/Replay frames supply bounded accepted
  Pane buckets without granting Bar Data access;
- generic projection subjects carry portable Geometry, Drawing presentation,
  exact observation cutoff, versioned policy reference, and optional exact
  source-Bar evidence;
- built-in exact-instant and accepted-containing-bucket policies are registered
  through the same composition-local plugin surface as future policies;
- Point, Segment, and Rectangle traversal remains inside registered Geometry
  definitions, so the projection coordinator contains no concrete Geometry or
  semantic-business branch;
- a separate monotonic reconciliation revision hides/restores shapes when
  Replay moves while preserving the exact accepted Annotation revision and
  canonical Geometry;
- mounted Pane ports prepare and apply in deterministic order, roll back before
  decision, and poison reconstruction after an unprovable rollback or failed
  post-decision cleanup. Unmounted Panes are valid.

## Evidence

H106 passes 15 declared negative controls plus Point/Segment/Rectangle,
ambiguous-source, post-cutoff endpoint, policy-plugin, unmounted-Pane, same-
Annotation-revision, multi-Pane rollback, and post-decision poison paths. The
real Chromium fixture proves `before = [0,0]`, `after = [2,1]`, and return
`[0,0]` for NQ 1m/5m while candlestick data and canonical Geometry remain
byte-identical.

Production assembly contains 61 public modules, 25 lifecycle modules, and 24
optional-removal cases. Architecture evidence contains 61 modules, 132
dependency edges, 115 construction sites, 18 declared writer surfaces, 23
observed writer files, and zero blocking findings. Current source evidence
contains 422 files, 34,566 effective lines, 3,582 functions, and 394 public exports with no accepted exception.

The focused R13.2–R13.7 regressions, source quality, writer closure, standalone
runtime, and complete eight-scenario production regression matrix pass. The
matrix reproduces only its two pre-declared visual known failures.

## Human Acceptance

The user accepted the cache-versioned local fixture on 2026-08-09. The accepted
after-observation state showed the cyan exact Segment only in NQ 1m, the amber
containing-bucket Rectangle in both NQ 1m and 5m, and projection counts `2/1`.
`Before observed` hid both Pane sets atomically as `0/0`; `After observed`
restored them without moving or rewriting candles. H106 is accepted. R13.9 was
not started.
