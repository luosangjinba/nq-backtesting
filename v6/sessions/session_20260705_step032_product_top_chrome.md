# V6 Step 32 - Product Top Chrome Consolidation

Date: 2026-07-05

## Scope

Step 32 consolidated the workstation top chrome into a user-facing product
surface. The visible first row now prioritizes product identity, active chart
context, user workflow actions, and a compact readiness message instead of a
standalone diagnostics strip.

## Commits

- `3d3a6f7 feat(v6): consolidate product top chrome`
- `cd73cea docs(v6): document product top chrome`

## Implementation Notes

- Moved readiness markup into `data-v6-workstation-header`.
- Removed the standalone readiness row between workflow panels and chart main.
- Kept readiness controller hooks in place for smoke tests and future developer
  tooling.
- Hid readiness telemetry from the normal reading path while retaining friendly
  visible text such as `System ready` and `Replay workstation is ready`.
- Added app shell browser smoke checks that fail if readiness leaves the header
  or if a standalone readiness row returns.
- Added `v6/docs/V6_PRODUCT_TOP_CHROME.md` and linked it from the V6 docs index.

## Verification

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 33 should refine the opened workflow panels so Sessions, Replay, Journal,
and Settings use user-facing labels and compact product layout while preserving
their command/event boundaries.
