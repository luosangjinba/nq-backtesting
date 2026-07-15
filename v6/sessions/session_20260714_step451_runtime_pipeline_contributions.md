# Session — Step 451 Runtime Pipeline Contributions

Date: 2026-07-14

## Outcome

The former 40-runtime import/composition file is split into two explicit
boundaries: 18 core state/data runtimes and 22 Replay/projection runtimes. The
public `core-runtime-manifest.js` only composes the frozen groups.

Runtime count, IDs, registration order, repository injection, Replay timer
policy, command/event injection, and ownership are unchanged.

## Verification

- `node v6/tests/runtime-pipeline-contributions-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/static-architecture-audit-step394.js`
- `git diff --check`
