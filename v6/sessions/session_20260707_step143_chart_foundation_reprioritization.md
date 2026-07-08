# V6 Session - Step 143 Chart Foundation Re-prioritization

Date: 2026-07-07

## Outcome

Step 143 superseded the Step 142 Comparison Symbol Owner Contract direction and
re-prioritized V6 toward chart foundation work.

Completed in commit:

- `5ca385bb docs(v6): reprioritize chart foundation`

## Decision

The next phase should prioritize:

1. database-backed bounded K-line import through bar-data ownership;
2. replay K-line chart flow;
3. reset view through chart-viewport ownership;
4. multi-pane chart flow through the existing pane model.

Step 144 should establish the database K-line import boundary for V6.

## Boundaries

- Comparison symbols remain deferred.
- Simulated trading remains deferred.
- Bottom trading controls remain disabled and inert.
- No chart series writes, chart overlays, replay cursor mutation, viewport
  mutation, multi-pane UI, simulated trading, comparison symbols, or additional
  workstation chrome behavior were added.
- Bar-data remains the only owner that requests and caches bars.
- Chart-engine remains the only owner that writes chart series.
- Replay runtime remains the only owner of replay cursor and reveal state.

## Verification

- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 144 should establish the database K-line import boundary for V6.
