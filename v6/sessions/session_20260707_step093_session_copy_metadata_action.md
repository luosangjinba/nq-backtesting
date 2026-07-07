# V6 Step 93 - Session Copy Metadata Action

Date: 2026-07-07

## Summary

Step 93 implemented the first metadata-only Copy action through the
`session-repository` owner contract.

Changed:

- added repository-owned `copyMetadata`;
- exposed `SESSION_COMMANDS.COPY` and `SESSION_EVENTS.COPIED`;
- enabled the Recent Sessions Copy row action;
- wired dashboard Copy clicks to dispatch `session.copy` and refresh sessions;
- added browser coverage proving Copy creates only a metadata duplicate and does
  not mutate chart, replay, bar-data, or viewport runtime state;
- updated Summary, Stats, and Recent Sessions browser expectations now that
  Copy is enabled.

## Boundary

Copy remains metadata-only. The dashboard does not clone session objects or
persist copied records directly; it dispatches `session.copy`.

The repository creates a new session id, appends the Copy suffix, and copies
only fields allowed by `session-copy-contract`. Copy does not copy bars, chart
state, replay state, viewport state, orders, journal entries, or calendar data.

## Commits

- `eb6c3f2d feat(v6): copy session metadata in repository`
- `64582c7b feat(v6): expose session copy command`
- `50b54920 feat(v6): enable session copy action`

## Verification

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

## Next

Step 94 should define the Orders owner contract before exposing any Recent
Sessions Order row action.
