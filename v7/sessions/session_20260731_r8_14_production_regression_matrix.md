# Session — R8.14 Full Production Regression Matrix

Date: 2026-07-31

## Scope

Started from the clean R8.13 commit `37db33bb`. This step executed only the
R8.14 production failure, concurrency, cache, persistence, restart, and
capability matrix. It did not enter R8.15 or grant R7.3n/R7.3o human acceptance.

## Delivered

- Added a fail-closed 11-axis production matrix with eight real browser or
  production-owner scenarios and four mandatory high-risk compounds.
- Added five negative controls rejecting missing coverage, inventory-only
  claims, missing compound scenarios, static BUG-V7-0001 claims, and missing
  executable Harnesses.
- Injected a real Session persistence failure after the complete ETH candidate
  had painted, then proved exact RTH Chart/Replay/Workspace restoration and a
  byte-for-byte unchanged durable Session record.
- Added visible-candidate/restoration traces around all five production-owner
  participant failure boundaries.
- Bound restored mixed-Pane warm-cache latency, delayed/reordered/stale work,
  Calendar ETH/RTH, all Replay actions, layouts, instruments, Viewports,
  persistence, reopen, and restart into one executable disposition.
- Restored H021 and H025 to `executable`, restored H069 to `accepted`, and
  activated H079 as `executable`. No `regressed` rule remains; recovery mode
  remains active for R8.15 human and zero-debt closure.

## Verification

- `node v7/tests/production-regression-matrix-harness.js`
- `node v7/tests/workspace-global-atomic-commit-harness.js`
- `node v7/tests/replay-multi-pane-rth-history-browser-harness.js`
- complete `v7/tests/*-harness.js` inventory with the configured V4
  market-data database
- architecture boundary, architecture hardening, production architecture,
  source quality, ModuleHost, restore/performance, Calendar, Layout, Replay,
  and Workspace Transaction Harnesses
- `git diff --check` immediately before commit

All 78 top-level Harnesses passed sequentially. The restored mixed-Pane
100-sample result was p95 77.4 ms, p99 100.0 ms, maximum 100.2 ms, and zero warm
provider requests. The ordinary real Workspace 100-sample result was p95 68.0
ms, p99 73.9 ms, and maximum 74.2 ms. Production architecture remained clean
at 48 modules, 125 dependency edges, 115 construction sites, seven writer
sites, and zero findings; production source remained 303 files and 304 public
exports with no source-quality violation.

## Acceptance Boundary

Automated evidence is complete for R8.14. H021, H025, H079, and the other
human-review-required recovery rules remain merely executable. R8.15 must run
the exact hard-reloaded dense two-Pane ETH/RTH drag-and-Locate sequence under
human review before recovery mode or the R7.3n/R7.3o gates may close.
