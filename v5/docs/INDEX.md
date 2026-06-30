# V5 Documentation Index

Read this index before working on V5.

## Required First Reads

- `v5/README.md`: V5 purpose and hard architecture rule.
- `v5/docs/MVP_ARCHITECTURE.md`: architecture review and runtime boundaries.
- `v5/docs/EXECUTION_FRAMEWORK.md`: executable development framework.
- `v5/docs/V5_PHASE_ROADMAP.md`: current phase roadmap and step selection
  rules.
- `v5/TODO.md`: current step plan and manual acceptance standards.
- `v5/sessions/README.md`: session handoff ordering and targeted lookup rules.
- `v5/docs/specs/README.md`: stable spec index and step source map.
- `v5/docs/specs/product-review-loop.md`: product north star for Historical
  Replay Review and Live Execution Review.
- `v5/docs/vendor/lightweight-charts.md`: official Lightweight Charts API links
  and V5 usage rules before chart-engine work.

## Current Direction

V5 is a parallel frontend/runtime rewrite for the FX Replay direction. V4 remains
available as legacy/reference code, but V5 must not inherit V4's old frontend
control flow.

## Reading Rule

Do not load every historical document into context. Read only the documents
needed for the current step, then inspect code directly.
