# V5 Review Visualization Dashboard

Date: 2026-06-30

Context:

- The user clarified that after review, the product should also provide visual
  data demonstration and dashboard-style analytics.
- This follows the review analysis decision loop: review data should become
  visible and actionable.

Decision:

- V5 should include a review-grounded analytics dashboard layer in later phases.
- Dashboards should show statistics, distributions, timelines, tables, and
  drilldowns derived from structured review artifacts.
- Visualizations should help the trader inspect patterns and decide what to
  practice or change next.
- Dashboards must be grounded in source artifacts: chart moments, replay
  decisions, simulated orders, actual orders/fills, notes, evidence, tags, and
  process-quality labels.

Non-goal:

- Do not build detached KPI walls or generic SaaS dashboards that cannot drill
  back into the review evidence.
- Do not prioritize dashboard UI before the underlying review artifact and
  statistics models exist.

Updated docs:

- `v5/docs/specs/product-review-loop.md`
- `v5/docs/V5_PHASE_ROADMAP.md`
- `v5/TODO.md`
