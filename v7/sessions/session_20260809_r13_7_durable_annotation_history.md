# Session — R13.7 Durable Annotation History

Date: 2026-08-09

Status: accepted; H105 automated gate closed

## Scope

R13.7 adds a headless, removable persistence boundary for the accepted generic
Annotation Document. It adds no production drawing toolbar, semantic package,
detector, Replay policy, Chart ownership, or server replication.

## Implementation

- `optional.annotation-runtime` remains the sole accepted document/history
  writer and now owns bounded undo/redo, hard-reload restoration, import, and
  export commands under exact monotonic document revisions.
- `adapter.annotation-persistence` owns only explicit Session-keyed bytes,
  schema migration, opaque envelope sidecars, compare-and-swap checks, and one
  reversible write lifecycle. It selects no browser storage singleton.
- `optional.annotation-geometry-domain` restores portable Geometry through
  registered type definitions; Runtime and persistence contain no concrete
  Point/Segment/Rectangle dispatch branch.
- current durable entries use version 2 with a 100-state history bound; version
  1 migrates deterministically with empty history. Unsupported versions and
  cross-Session data fail closed.
- portable export/import preserves unknown document, Drawing, Geometry-envelope,
  Presentation, provenance, and scope fields through edit, undo/redo, reload,
  and re-export without allowing the adapter to interpret geometry payloads.
- apply repeats the persisted-byte comparison after prepare, so interleaved
  preparations cannot overwrite a newer accepted document.

## Evidence

H105 passes 18 declared negative controls and positive hard-reload, history,
migration, opaque-field, interleaved-CAS, and byte-rollback paths. Geometry and
Runtime Harnesses pass 35 and 39 negative controls. Production assembly contains
56 public modules and 13 optional-removal cases. Architecture evidence contains
56 modules, 129 dependency edges, 115 construction sites, 18 declared writer
surfaces, 23 observed writer files, and zero blocking findings. Current source
evidence contains 393 files, 31,690 effective lines, 3,346 functions, and 378
public exports with no accepted exception.

The standing Module Host, production assembly, architecture, sole-writer,
source-quality, standalone runtime, regression matrix, JSON, and patch-format
gates pass. R13.7 has no visual delta, so no human visual gate is required.

## Disposition

H105 is accepted. R13.7 is committed as one bounded step. R13.8 and every
semantic business package remain unauthorized.
