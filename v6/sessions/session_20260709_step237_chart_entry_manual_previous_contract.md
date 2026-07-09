# V6 Session - 2026-07-09 - Step 237 Chart Entry Manual Previous Replacement Contract

## Scope

Step 237 defined the chart-entry owner contract for manual Previous replay chart
updates.

## Changes

- Added `v6/docs/V6_CHART_ENTRY_MANUAL_PREVIOUS_REPLACEMENT_CONTRACT_STEP237.md`.
- Added `v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`.
- Updated `v6/TODO.md` to mark Step 237 complete and select Step 238.

## Decision

Manual Previous should be implemented as a chart-entry owned replacement flow:
dispatch replay previous, resolve target panes, build pane-local visible bars
for the new cursor, then call chart-data `REPLACE_BARS`.

The first implementation should prefer current chart-data filtering and use
bounded bar-data loading only when filtering cannot prove no-future visibility.

## Non-Goals

- Did not implement chart-entry manual previous behavior.
- Did not enable the transport Previous button.
- Did not add chart-data rollback/remove commands.
- Did not change viewport, bar-data, pane, indicator, trading, or journal
  behavior.

