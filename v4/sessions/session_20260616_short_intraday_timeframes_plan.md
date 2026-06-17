# Session 2026-06-16 - Step 295 Short Intraday Timeframes

## Goal

Add `2M`, `3M`, `4M`, and `10M` chart timeframes to V4 without adding new raw data, changing the DuckDB schema, or changing the existing 1m authority model.

## Boundary

- Use existing `futures_1m` data and backend aggregation.
- Do not import separate 2m/3m/4m/10m data.
- Keep NQ/ES instrument behavior unchanged.
- Make the new timeframes available everywhere a normal chart timeframe is expected: Main/Sub toolbar selectors, labels, Order Setup, Live Record, archive/replay metadata, and inspector dropdowns generated from shared config.
- Keep load windows conservative to avoid unexpectedly large frontend render payloads.

## Plan

### Step 295.1: Audit timeframe entry points

- Inspect shared frontend timeframe config.
- Inspect toolbar selector generation.
- Inspect backend load-range validation.
- Inspect Order Setup and Live Record timeframe validation/normalization.

Acceptance:

- Confirm the backend aggregation can accept arbitrary positive minute values.
- Identify every place that must explicitly recognize `2M/3M/4M/10M`.

### Step 295.2: Add chart timeframe mappings

- Add `2`, `3`, `4`, and `10` to `TIMEFRAME_MAP`.
- Add `2M`, `3M`, `4M`, and `10M` to `TIMEFRAME_TO_SECONDS`.

Acceptance:

- Main TF and Sub TF selectors can show the new labels through existing shared rendering.
- Labels and PDA extension helpers can resolve the new durations.

### Step 295.3: Add load-range limits

- Add matching frontend and backend limits:
  - `2m`: 45 days
  - `3m`: 45 days
  - `4m`: 45 days
  - `10m`: 180 days

Acceptance:

- Frontend validation and backend validation agree.
- Single-request bar counts stay in the same risk envelope as existing short intraday loads.

### Step 295.4: Add Journal timeframe compatibility

- Add Order Setup timeframe definitions and aliases.
- Add Live Record timeframe definitions and aliases.
- Treat `2M/3M/4M/10M` as low-timeframe values for Order Setup derived warnings.

Acceptance:

- New labels do not fall back to `manual` or unknown during normalize/load/save.
- Imported or manually typed lowercase aliases such as `2m` and `10m` normalize correctly.

### Step 295.5: Focused verification

- Update smoke tests for:
  - load-range policy;
  - order timeframe enum/alias;
  - Order Setup low-timeframe detection;
  - Live Record normalization and persistence;
  - time projection bucket mapping;
  - backend helper limits.

Acceptance:

- Targeted Node and Python tests pass.
- `git diff --check` passes.

## Implementation Notes

- `v4/src/config.js` now includes `2M`, `3M`, `4M`, and `10M`; toolbar options are generated from this shared map.
- `v4/src/data/load-range-policy.js` and `v4/v4_api.py` now share the same new limits.
- `v4/src/order/order-review-types.js` and `v4/src/live-record/live-record-types.js` now normalize the new labels and lowercase aliases.
- `isLowTimeframe()` now treats `1M/2M/3M/4M/5M/10M` as short intraday timeframes.

## Verification

- `node v4/tests/load-range-policy-smoke.js`
- `node v4/tests/order-review-types-smoke.js`
- `node v4/tests/time-projection-smoke.js`
- `node v4/tests/order-setup-smoke.js`
- `node v4/tests/live-record-smoke.js`
- `python3 -m unittest v4.tests.test_architecture_review_fixes`

