# Step 490 - V5 Open Source Local Direction

Date: 2026-07-03

Status: completed

## Goal

Change V5's product direction from SaaS-ready-first to open-source/local-first
deployment while preserving the runtime ownership boundaries already built into
V5.

## Phase

Cross-phase product architecture.

Phase gate advanced: future steps should optimize for a credible open-source
FX Replay workstation deployable on a local machine or terminal server, not for
public auth, billing, entitlement, or hosted multi-tenancy.

## Plan

- [x] Step 490.1: Add an open-source/local-first deployment spec.
- [x] Step 490.2: Update README, MVP architecture, and execution framework to
  make local/terminal-server deployment the product direction.
- [x] Step 490.3: Update phase roadmap and product review loop to demote SaaS
  infrastructure and promote local persistence, backup/restore, import/export,
  deployment, and open-source quality.
- [x] Step 490.4: Mark the old SaaS readiness spec as historical/superseded
  while preserving useful repository/runtime boundary lessons.
- [x] Step 490.5: Update TODO, spec index, session handoff, run `git diff
  --check`, and commit.

## Implementation

- Added `docs/specs/open-source-local-deployment.md`.
- Updated `README.md`, `MVP_ARCHITECTURE.md`, and
  `EXECUTION_FRAMEWORK.md` from SaaS-ready-first language to
  open-source/local-first language.
- Updated `V5_PHASE_ROADMAP.md` so Phase 6 now targets local persistence,
  backup/restore, import/export, terminal-server deployment, and open-source
  contribution maturity instead of hosted SaaS infrastructure.
- Updated `product-review-loop.md` so deployment packaging supports the review
  loop instead of monetizing or redefining it.
- Marked `saas-readiness-strategy.md` as historical/superseded while keeping
  useful repository/runtime boundary lessons.
- Updated `TODO.md`, specs index, docs index, and sessions index.

## Non-goals

- No runtime code changes.
- No persistence implementation.
- No Docker/deployment implementation.
- No README installation rewrite in this step.
- No removal of existing user/workspace code.

## Manual Acceptance

- V5 documentation states open-source/local-first as the current product
  direction.
- Public auth, billing, entitlement, hosted metering, and production
  multi-tenancy are no longer roadmap priorities.
- Profile/workspace/session ownership remains required for durable records.
- Feature modules still use commands/events and repositories/runtimes instead
  of direct persistence.
- Phase 6 is reframed around local persistence, backup/restore, import/export,
  deployment, and open-source contribution maturity.

## Checks

- Passed: `git diff --check`
