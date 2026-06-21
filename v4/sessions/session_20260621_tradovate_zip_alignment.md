# Step 306: Tradovate ZIP Import and File Alignment

Date: 2026-06-21

## Goal

Improve Data Maintenance -> Tradovate Live Records import so a user can provide one CSV ZIP package instead of manually selecting six files, and make file alignment issues visible before generating Review JSON.

## Completed

- Added `CSV ZIP package optional` to `data-maintenance.html`.
- ZIP import auto-detects:
  - Performance CSV
  - Orders CSV
  - Fills CSV
  - Position History CSV
  - Cash History CSV
  - Account Balance CSV
- Explicitly selected CSV files override ZIP-detected files of the same type.
- Added importer-level `fileAlignment` report:
  - row counts for all input file types;
  - Performance fill IDs missing from Fills;
  - Fills rows whose Order ID is missing from Orders;
  - Position History pairs not present in Performance;
  - Cash History files without Contract values.
- Preview output now shows ZIP matches, file alignment summary, and existing reconcile summaries.
- Review JSON source metadata now includes `source.fileAlignment`.

## Boundaries

- Warnings do not block Review JSON generation.
- Position/Cash/Account Balance remain reconcile-only and do not change Live Record objects.
- Browser ZIP support handles normal stored/deflated ZIP members; encrypted ZIP entries are rejected with a clear error.

## Verification

- `node --check v4/src/live-record/tradovate-performance-importer.js`
- module script syntax probe for `v4/data-maintenance.html`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `git diff --check`

## Runtime Note

- Existing web server is available at `http://127.0.0.1:8001/data-maintenance.html`.
- API process is running on `127.0.0.1:8766` as `python3 v4_api.py`.
