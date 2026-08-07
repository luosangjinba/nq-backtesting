# Session — R13.1 Drawing And Semantic Annotation Foundation

Date: 2026-08-07

Status: specification drafted; human decision pending

## Outcome

ADR-V7-001 records the proposed post-V7.0.0 foundation that must precede new
business modules. Formal code and wire contracts reserve `asset` for tradable
instruments and use `DrawingGeometry`, `DrawingEntity`, `SemanticArtifact`,
`ArtifactProjection`, and adapter-local `RenderPrimitive`.

FVG, OB, Breaker, BSL, and EQL are typed semantic artifacts. They may produce
one or several line/rectangle/label projections but are not geometry subtypes or
free-form tags. One optional Annotation Runtime owns the versioned document;
the existing Chart Runtime/Adapter remains the sole visual writer.

## Research And Boundaries

The review checked the Lightweight Charts 5.2 Primitive documentation and its
official Rectangle Drawing Tool and Trend Line examples. They validate the
rendering mechanism but do not supply V7 persistence, semantics, no-future,
transaction, or module ownership.

The specification also binds market-coordinate storage, Session-local initial
scope, Replay-cutoff provenance, deterministic `stateAt(cutoff)`, semantic type
registration, atomic promotion from generic drawing, reversible persistence/
render decisions, undo/redo, optional-module removal, and staged delivery.

## Continuation

The user must accept ADR-V7-001 before R13.2 is allocated. R13.1 changes no
production code and authorizes no automatic detector or business workflow.

Binding proposal:
`../docs/V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`.
