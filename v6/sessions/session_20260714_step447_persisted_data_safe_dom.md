# Session — Step 447 Persisted Data Safe DOM

Date: 2026-07-14

## Outcome

Session Dashboard, Sessions, and Journal dynamic records now use the Step 446
safe-DOM boundary. Persisted/user-derived values are assigned through
`textContent`, dataset fields, form properties, and ARIA attributes; none are
parsed as markup.

The affected controller fakes were upgraded to model `replaceChildren` and
element creation, preserving DOM-free unit coverage. A static gate prevents
these three record paths from reintroducing `innerHTML`.

## Verification

- `node v6/tests/persisted-data-safe-dom-static-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
