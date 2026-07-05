# V6 Step 31 - Workflow Surfaces Readiness Audit

Date: 2026-07-05

## Scope

Step 31 audited the workflow entry surfaces and corrected the default readiness
surface so regular users no longer see engineering gate names or test filenames
in the main workstation UI.

## Commits

- `675e69c feat(v6): hide engineering gates from readiness surface`
- `8f9d078 docs(v6): audit workflow surfaces`

## Implementation Notes

- Changed readiness surface copy from engineering wording to user-facing status:
  `System ready`, `Commands ready`, and `Core checks passed`.
- Stopped rendering readiness gate rows in the default shell.
- Added browser smoke protection so `boundary-smoke.js`, `Cache-hit latency`, and
  `mixed-timeframe-visible-latency-browser-smoke.js` cannot appear in the normal
  page text.
- Added `v6/docs/V6_WORKFLOW_SURFACES_AUDIT.md`.
- Carried forward the V5 UI reference rule: `shadcn/ui` and the previously
  provided GitHub UI design references such as `ui-ux-pro-max` are design
  references, not dependencies.

## Verification

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 32 should consolidate the product top chrome so user-facing controls and
chart context have priority while diagnostics stay hidden or summarized.
