# V6 Step 37 - Workflow Shell Audit

Date: 2026-07-05

## Scope

Step 37 audited the workflow shell changes from Steps 32-36 before adding more
UI behavior. The audit accepts the current workflow shell behavior as shell-owned
UI and recommends returning to replay/chart readiness rather than continuing
incidental polish.

## Commits

- `28a6666 docs(v6): audit workflow shell behavior`
- `ff2a499 test(v6): protect workflow shell audit`

## Implementation Notes

- Added `v6/docs/V6_WORKFLOW_SHELL_AUDIT.md`.
- Linked the audit from `v6/docs/INDEX.md`.
- Documented top chrome, workflow panels, active state, close behavior, and
  mutual exclusivity as shell-owned behavior.
- Documented allowed and forbidden imports for workflow UI.
- Added `v6/tests/workflow-shell-audit-smoke.js` so key audit guardrails and
  test names remain referenced.

## Verification

- `node v6/tests/workflow-shell-audit-smoke.js`
- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 38 should re-audit replay/chart readiness gates and choose the next
chart-facing executable step from the result.
