# Step 300: Live Record Execution Flow UX

Date: 2026-06-20

## Goal

Make imported Tradovate orders understandable in Live Record Detail.

Current UI shows raw `execution.orders[]` as a flat list. This preserves data, but users must infer the trade story manually:

- entry market order;
- canceled stop bracket;
- canceled target bracket;
- exit market order.

Step 300 keeps the raw order data unchanged and adds a derived Execution Flow view:

- Entry;
- Protection;
- Exit;
- Outcome.

Raw Tradovate Orders remain available as a collapsed diagnostic section.

## Plan

1. Add an Execution Flow helper that derives flow rows from `execution.orders[]`, `execution.fills[]`, `execution.entry`, `execution.stopLoss`, `execution.targets`, and `result`.
2. Render the derived flow in Live Record Detail before raw orders.
3. Move lesson checkboxes to the flow row that most closely matches the reviewed order.
4. Collapse raw orders by default and remove repeated lesson controls from raw rows.
5. Cover the behavior with focused smoke tests.

## Non-Goals

- Do not change Review JSON schema.
- Do not drop raw Tradovate order data.
- Do not infer strategy quality automatically.
- Do not make Live Record dependent on Order Setup.

## Completed

- Added `live-record/live-record-execution-flow.js`.
- Live Record Detail now renders `Execution Flow` before raw orders.
- Flow rows derive:
  - Entry;
  - Protection / Stop Loss;
  - Protection / Target;
  - Exit;
  - Outcome.
- Market filled exit takes precedence over loss/profit labels, so a losing market exit renders as `Manual/Market exit` rather than `Stop filled`.
- Raw Tradovate orders are kept as `Raw Tradovate Orders (n)` and are collapsed by default.
- Lesson checkboxes now render on matched flow rows.
- Orders that cannot be classified but already carry `lessonIds` render as `Review Order`, preserving old/simplified data editability.

## Verification

- `node --check v4/src/live-record/live-record-execution-flow.js`
- `node --check v4/src/ui/inspector/live-record-panel.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/entry-context-catalog-integration-smoke.js`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `node v4/tests/live-record-browser-smoke.js`
- `git diff --check`
