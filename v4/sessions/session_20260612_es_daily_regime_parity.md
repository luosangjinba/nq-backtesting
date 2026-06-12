# 2026-06-12 - Step 284 ES Daily Regime Parity

## Objective

Make `Main=ES` daily regime behavior match `Main=NQ` for normal review workflows.

This step is about the Calendar / Archive background layer, not SMT pair logic.

## Boundary

- VIX is a shared market background series. NQ and ES both use `v4/data/vix-daily.csv`.
- Trend/range regime is instrument-specific and must be generated per Main instrument.
- Existing NQ data remains `v4/data/daily-regime-nq.csv`.
- ES data will be generated as `v4/data/daily-regime-es.csv` with the same columns:
  `date,instrument,trendClose,trendEma20,trendEma50,trendRegime,dayRange,atr20,rangeAtrRatio,rangeRegime`.
- `Main=NQ` must not regress.
- `Main=ES` should load ES trend/range plus shared VIX.
- Missing instrument regime files should not block chart loading.
- SMT remains explicitly out of scope and stays `Main=NQ, Sub=ES, same TF` only.

## Substeps

### Step 284.1 - Freeze Boundary

Document the scope and acceptance criteria in session/TODO.

### Step 284.2 - ES Daily Regime Generator

Add a script that reads ES daily bars from `v4/data/trading_data.duckdb` and writes `v4/data/daily-regime-es.csv` using the same formula/columns as NQ.

### Step 284.3 - Loader Support

Update the Daily Regime loader so `Main=ES` reads `data/daily-regime-es.csv` while VIX remains shared.

### Step 284.4 - Smoke Tests

Add targeted smoke coverage for NQ and ES daily trend/range parsing/loading behavior.

### Step 284.5 - Browser/API Validation

Verify Main=NQ and Main=ES can load chart data and Daily Regime lookup returns current Main instrument data.

### Step 284.6 - Documentation Closeout

Update user docs to state that VIX is shared, while trend/range regime follows Main instrument.
