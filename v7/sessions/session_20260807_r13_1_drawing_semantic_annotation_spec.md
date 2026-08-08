# Session — R13.1 Drawing And Semantic Annotation Foundation

Date: 2026-08-07

Status: accepted 2026-08-08; R13.2 separately authorized

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

## Acceptance And Continuation

The user explicitly accepted ADR-V7-001 on 2026-08-08 after the documented
implementation-path audit. The decision authorized only the separately bounded
R13.2 pure Geometry contract. R13.1 itself changes no production code and does
not authorize Chart/UI, persistence, automatic detector, or business workflow.

Binding decision:
`../docs/V7_DRAWING_AND_SEMANTIC_ANNOTATION_FOUNDATION_R13_1.md`.
