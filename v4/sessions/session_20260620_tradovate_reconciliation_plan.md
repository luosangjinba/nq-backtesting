# Step 299: Tradovate Import Reconciliation

Date: 2026-06-20

## Goal

Add a reconciliation layer around the existing Tradovate Live Record import without changing the Live Record primary schema.

The import source remains:

- `Performance CSV`
- optional `Orders CSV`
- optional `Fills CSV`

New optional files are used for validation/reporting only:

- `Position_History CSV`
- `Cash_History CSV`
- `Account_Balance_History CSV`

## Step 299.1: Audit Tradovate CSV Shapes

Observed local sample files:

- `tmp/Performance (this month).csv`
- `tmp/Orders(this month).csv`
- `tmp/Fills(this month).csv`
- `tmp/Position_History(this month).csv`
- `tmp/Cash_History(this month).csv`
- `tmp/Account_Balance_History(this month).csv`

Row counts in sample:

- Performance: 71 data rows
- Position History: 71 data rows
- Orders: 237 data rows
- Fills: 141 data rows
- Cash History: 210 data rows
- Account Balance History: 17 data rows

Key findings:

- `Position_History` has the same `(Buy Fill ID, Sell Fill ID)` pair set as `Performance`.
- `Position_History` P/L matches `Performance` P/L for all sample pairs.
- `Position_History` adds useful validation fields: `Position ID`, `Pair ID`, `Paired Qty`, `Buy Price`, `Sell Price`, `P/L`, `Bought Timestamp`, `Sold Timestamp`.
- `Cash_History` is account cash ledger data. In the sample it contains `Commission` and `Trade Paired` rows.
- `Account_Balance_History` is daily account summary with `Total Amount` and `Total Realized PNL`.

Decision:

- Do not replace Performance as the main pair source.
- Do not write Cash/Balance data into each Live Record.
- Add optional reconciliation warnings and summary output.

## Step 299.2: Position History Parser

Tasks:

- Add `parseTradovatePositionHistoryCsv`.
- Index by `(Buy Fill ID, Sell Fill ID)`.
- Compare against Performance rows:
  - missing pairs;
  - extra pairs;
  - qty mismatch;
  - buy/sell price mismatch;
  - P/L mismatch.

Acceptance:

- Missing/extra/mismatched pairs appear in reconciliation output.
- No optional Position History file keeps current import behavior.

## Step 299.3: Cash History Parser

Tasks:

- Add `parseTradovateCashHistoryCsv`.
- Aggregate by `Cash Change Type`, especially:
  - `Commission`;
  - `Trade Paired`.
- Compare:
  - Fills commission sum vs Cash `Commission`;
  - Performance P/L sum vs Cash `Trade Paired`.

Acceptance:

- Cash mismatches are warnings, not import blockers.

## Step 299.4: Account Balance Parser

Tasks:

- Add `parseTradovateAccountBalanceHistoryCsv`.
- Aggregate Performance P/L by trade date.
- Compare with `Total Realized PNL`.

Acceptance:

- Daily differences appear in report.
- Balance rows do not alter `payload.liveRecords`.

## Step 299.5: Reconciliation Report Model

Tasks:

- Add `reconciliation` object to importer result.
- Include report summary in Review JSON `payload.source`.

Acceptance:

- UI can summarize report without reading raw CSV again.

## Step 299.6: Data Maintenance UI Inputs

Tasks:

- Add optional file inputs:
  - Position History CSV;
  - Cash History CSV;
  - Account Balance History CSV.
- Pass file texts into importer.
- Show summary counts/warnings in Preview output.

Acceptance:

- Existing 3-file import remains unchanged if no reconciliation files are selected.

## Step 299.7: Smoke Tests

Tasks:

- Extend importer smoke with reconciliation fixtures.
- Cover:
  - clean Position match;
  - forced Position mismatch;
  - Cash aggregation;
  - Balance daily comparison;
  - optional inputs omitted.

## Step 299.8: Docs

Tasks:

- Update user docs to explain:
  - main source files;
  - reconciliation files;
  - warnings do not block import;
  - Cash/Balance are not written into each Live Record.
