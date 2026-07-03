# Step 492 - V5 Runtime Lifecycle And Cleanup

Date: 2026-07-03

Status: completed

## Goal

Define and audit lifecycle cleanup ownership before V5 adds more panes,
Settings surfaces, overlays, replay controls, or local deployment
infrastructure.

## Plan

- [x] Step 492a: add lifecycle cleanup contract and update documentation
      indexes.
- [x] Step 492b: audit existing runtime/controller/adapter resource creation
      points and record a cleanup backlog.
- [x] Step 492c: add a lightweight static lifecycle smoke so future high-risk
      resource additions are visible during review.

## Step 492a Result

- Added `v5/docs/specs/runtime-lifecycle-cleanup.md`.
- Updated the executable framework with explicit lifecycle ownership rules.
- Updated V5 docs index, specs index, TODO, and session handoff.

## Step 492b Result

- Added `v5/docs/harness/lifecycle-cleanup-audit.md`.
- Confirmed current safe cleanup paths for router, command/event bus, chart
  runtime, Lightweight adapter, fallback adapter, replay playback timer,
  viewport-demand bridge, and chart route teardown.
- Recorded cleanup backlog for pane shell controller dispose, replay controls
  controller dispose, standardized controller dispose shape, pane-local chart
  display state release, and bar-data cache retention tests.

## Step 492c Result

- Added `v5/tests/lifecycle-cleanup-static-smoke.js`.
- The smoke verifies the lifecycle contract exists, key cleanup paths remain
  present, and known controller cleanup risks stay documented until fixed.
- Added the smoke to `v5/docs/harness/README.md`.

## Non-Goals

- No runtime behavior changes in Step 492a.
- No dependency changes.
- No attempt to fix every cleanup issue before the audit is complete.

## Checks

- Step 492a passed: `git diff --check`
- Step 492b passed: `git diff --check`
- Step 492c passed: `node v5/tests/lifecycle-cleanup-static-smoke.js`
- Step 492c passed: `git diff --check`
