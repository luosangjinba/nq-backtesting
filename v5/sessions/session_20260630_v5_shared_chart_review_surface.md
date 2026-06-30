# V5 Shared Chart Review Surface

Date: 2026-06-30

Context:

- The product north star now treats Historical Replay Review and Live Execution
  Review as two review lenses that can coexist on one chart surface.
- The user clarified that no-future historical replay and study of actual
  executed orders should be able to appear together on the same chart.

Decision:

- V5 should not model the two review workflows as isolated chart products.
- Replay decisions, simulated orders, actual orders/fills, execution notes,
  annotations, evidence, process-quality tags, and later corrections should be
  able to reference the same chart context, canonical time, instrument, and
  session ownership path.
- Workflow-specific behavior should be represented by artifact type, source,
  visibility, and review semantics, not by separate chart runtimes or separate
  chart ownership paths.

Implication:

- Before Phase 4 order/journal work grows large, add a bounded review-foundation
  step that defines shared artifact/ref/tag contracts usable by both Historical
  Replay Review and Live Execution Review.
- Phase 3 remains focused on real chart interaction. This decision is a
  modeling guardrail for Phase 4 and later, not a request to add overlays early.

Updated docs:

- `v5/docs/specs/product-review-loop.md`
- `v5/docs/V5_PHASE_ROADMAP.md`
- `v5/TODO.md`
