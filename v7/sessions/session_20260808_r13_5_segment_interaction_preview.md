# Session — R13.5 Segment Interaction And Preview

Date: 2026-08-08

Status: accepted

## Authorization And Boundary

The user authorized R13.5 after separately accepting R13.1 and completing
R13.2–R13.4. The standing architecture requirement remains modular,
decoupled, and plugin-friendly, and every completed step must form its own
commit.

R13.5 therefore adds only a removable generic Segment interaction controller,
one Chart-owned normalized gesture adapter, and one Chart-owned transient
Preview owner. It deliberately does not compose a production toolbar, create a
semantic type, add selection/editing, or authorize R13.6.

## Implemented Owners

- `optional.annotation-interaction` owns only one-shot Segment tool state and
  talks through injected Geometry, Preview, normalized gesture, and generic-
  Drawing command ports;
- `optional.annotation-chart-projection` remains under
  `chart-runtime-adapter` and alone closes over DOM, Lightweight Charts,
  Series, pointer capture, primitive mutation, and native interaction options;
- pointer moves replace bounded transient Preview state and never call the
  accepted Drawing command;
- pointer-up issues at most one generic-Drawing command, while Escape, pointer
  cancellation, focus loss, explicit cancellation, and disposal issue none;
- R13.5 remains a fixture-only visual slice, so no production route, toolbar,
  Session composition, or persistence behavior changes.

## H103 Evidence

The independent Harness covers 28 negative controls, latest-wins preview
coalescing, exact rollback/poison behavior, same-handle updates, duplicate/stale
callback rejection, one-commit behavior, every cancellation path, command
failure, disposal, ModuleHost dependencies, source-boundary scans, and a real
Lightweight Charts Chrome scenario.

The browser scenario proves visible cyan transient Preview, one lime accepted
Segment after release, zero accepted work after Escape, restored native chart
scrolling, unchanged candlestick data, and complete listener/primitive cleanup.

Current machine evidence contains 582 files, 52,593 effective lines, 5,470 functions, and 558 public exports. Architecture evidence contains 62 modules,
131 actual dependency edges, 115 construction sites, 18 declared writer
surfaces, 21 observed writer files, 21 lifecycle modules, twelve
optional-removal cases, and zero accepted baseline findings.

## Human Visual Gate

The user completed the local visual gate and confirmed responsive drawing with
three accepted fixture Segments. Arm, press-hold-drag-release, Preview-to-
accepted transition, and restored native interaction were visible without
duplicate or stale lines.

The first manual attempt exposed that disabling vendor interaction options was
not sufficient to prevent the complete Canvas from following the pointer in
the user's browser. The Chart-owned adapter now explicitly consumes active
primary PointerEvents before vendor Canvas handlers, while still restoring all
native behavior after completion/cancellation. The fixture now also displays
the press-hold-drag-release instruction and crosshair cursor. This correction
passed the deterministic event-isolation assertions and real-Chrome Harness;
The user re-reviewed the corrected fixture and accepted it. H103 is accepted
and this record authorizes the single R13.5 delivery commit; it authorizes no
R13.6 implementation or production drawing toolbar.
