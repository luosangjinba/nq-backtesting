# Step 492 - V5 Runtime Lifecycle And Cleanup

Date: 2026-07-03

Status: in progress

## Goal

Define and audit lifecycle cleanup ownership before V5 adds more panes,
Settings surfaces, overlays, replay controls, or local deployment
infrastructure.

## Plan

- [x] Step 492a: add lifecycle cleanup contract and update documentation
      indexes.
- [ ] Step 492b: audit existing runtime/controller/adapter resource creation
      points and record a cleanup backlog.
- [ ] Step 492c: add a lightweight static lifecycle smoke so future high-risk
      resource additions are visible during review.

## Step 492a Result

- Added `v5/docs/specs/runtime-lifecycle-cleanup.md`.
- Updated the executable framework with explicit lifecycle ownership rules.
- Updated V5 docs index, specs index, TODO, and session handoff.

## Non-Goals

- No runtime behavior changes in Step 492a.
- No dependency changes.
- No attempt to fix every cleanup issue before the audit is complete.

## Checks

- Pending per substep.

