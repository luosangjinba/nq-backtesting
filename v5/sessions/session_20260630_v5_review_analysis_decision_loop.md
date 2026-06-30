# V5 Review Analysis Decision Loop

Date: 2026-06-30

Context:

- The user clarified that the most important work after review is data
  statistics, analysis, and decision-making.
- AI-assisted analysis is a possible future direction, but only if the product
  first captures reliable structured review data and evidence.

Decision:

- V5 should treat review as the input layer for a larger learning loop:
  review artifacts -> statistics -> analysis -> decision support -> next
  practice focus.
- Statistics and analysis should consume canonical artifacts such as replay
  decisions, actual orders/fills, execution notes, annotations, evidence refs,
  tags, outcomes, and process-quality labels.
- AI assistance should be downstream of this structured evidence. It can
  summarize, classify, explain, compare patterns, and suggest practice focus,
  but it should not replace the review model or become a detached generic chat
  surface.

Implication:

- Phase 5 should include statistics, analysis, and decision-support summaries
  over shared review artifacts.
- Phase 6 can consider AI-assisted review analysis after artifact, evidence,
  tag, and statistics foundations exist.
- Earlier phases should keep object identity, canonical time, tags, and refs
  strong enough to support later analysis.

Updated docs:

- `v5/docs/specs/product-review-loop.md`
- `v5/docs/V5_PHASE_ROADMAP.md`
- `v5/TODO.md`
