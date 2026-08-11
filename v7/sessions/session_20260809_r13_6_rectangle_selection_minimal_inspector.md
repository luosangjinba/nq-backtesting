# Session — R13.6 Rectangle, Selection, And Minimal Inspector

Date: 2026-08-09

Status: accepted

## Authorization And Boundary

R13.6 was separately authorized after R13.5 acceptance and ADR-V7-002. It adds
only a removable Rectangle/two-anchor interaction path, accepted-Drawing hit
selection, a minimal transient Inspector draft, and one atomic Geometry plus
Presentation revision. It remains test-only: no production toolbar, route,
durable Annotation Repository, semantic package, detector, or undo/redo owner
is activated.

## Implemented Owners

- `optional.annotation-runtime` remains the sole accepted Annotation Document
  writer and atomically revises branded Geometry plus Presentation;
- `optional.annotation-chart-projection` remains the sole Chart primitive
  writer and owns Rectangle/Segment rendering, hit testing, selection handles,
  coordinate conversion, Preview replacement, and native-event arbitration;
- `optional.annotation-interaction` owns only generic two-anchor tool state and
  transient Inspector drafts behind injected ports;
- the fixture binds DOM controls and composes modules but cannot mutate accepted
  Drawing or Chart primitive state directly.

## H104 Evidence

The focused Harness passes 23 declarative negative controls and a real Chromium
path covering click-move-click and drag-release Rectangle creation, Rectangle
and Segment selection, geometry-specific fields, transient Preview, atomic
Save, Cancel, endpoint handles, unchanged candles, restored native navigation,
and disposal. The generic interaction Harness passes 28 negative controls.

The complete production regression matrix passes all eight scenarios while
reproducing only its two registered visual findings. Architecture hardening
passes 104 rules and 15 negative controls. Current source evidence contains 430 files, 35,415 effective lines, 3,674 functions, and 405 public exports, with no
accepted exception. `git diff --check` passes.

## Human Visual Gate

The first review rejected press-drag-only behavior, leaked Segment fill fields,
and missing Segment selection handles. The correction added two-click placement
while retaining drag-release, explicit hidden-field styling, and Chart-owned
endpoint handles.

The second review found that cancellation occurred but the browser menu still
appeared. The final correction consumes secondary `pointerdown` and the related
later `contextmenu` as one bounded cancellation interaction. A real Chromium
right-click regression proves that the menu path is not reached.

The user re-tested the corrected fixture on 2026-08-09 and explicitly accepted
R13.6. H104 is accepted. The user then separately authorized the next bounded
step; this record does not define that step's scope.
