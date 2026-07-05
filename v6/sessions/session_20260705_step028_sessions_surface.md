# V6 Step 28 - Session Workflow Entry Surface

Date: 2026-07-05

## Scope

Step 28 added a bounded Sessions workflow entry surface. The panel creates and
lists replay sessions through existing session commands only. It does not load
chart bars, replay state, or viewport intent.

## Commits

- `3f5299b feat(v6): add sessions surface controller`
- `4cf30b0 feat(v6): mount sessions workflow surface`
- `f43d8e6 test(v6): enforce sessions surface boundaries`

## Implementation Notes

- Added `v6/src/shell/sessions-surface-model.js` and
  `v6/src/shell/sessions-surface.js`.
- Enabled the existing Sessions button and mounted a compact Sessions panel.
- The controller dispatches `session.getActive`, `session.list`, and
  `session.create` only.
- Browser smoke verifies opening the panel and creating a session through the
  real app shell.
- Boundary tests forbid the Sessions UI from importing chart, replay, bar-data,
  viewport, pane, layout, persistence, journal, settings internals, V4/vendor,
  storage, or network APIs.

## Verification

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

## Next

Step 29 should add a bounded replay workflow entry surface. It should expose
existing replay/default-wall commands without importing replay/chart/data/
viewport internals or creating new ownership paths.
