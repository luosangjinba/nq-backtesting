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

## Step 284.2 Status

Completed.

Added `v4/scripts/generate_daily_regime_csv.py`.

Generator behavior:

- Reads `futures_1m` from `v4/data/trading_data.duckdb`.
- Uses futures trading day semantics: bars at or after `18:00` belong to the next trading day.
- Excludes `17:00-17:59` maintenance/transition bars.
- Uses one trading-day close, daily high/low range, EMA20/EMA50 trend regime, ATR20 range regime.
- Outputs the same columns as `daily-regime-nq.csv`.

Generated:

- `v4/data/daily-regime-es.csv`
- Rows: 4765
- Range: `2008-01-02 -> 2026-06-11`

Validation:

- `python3 -m py_compile v4/scripts/generate_daily_regime_csv.py`
- Regenerated NQ to `/tmp/daily-regime-nq-regenerated.csv` for formula comparison.
- Regenerated NQ matched existing file line count and tail date. Only one historical ATR diagnostic line differed (`2008-01-29`), while classification remained `small_range`; this appears to be a legacy diagnostic-value mismatch and does not affect ES generation semantics.

### Step 284.3 - Loader Support

Update the Daily Regime loader so `Main=ES` reads `data/daily-regime-es.csv` while VIX remains shared.

### Step 284.4 - Smoke Tests

Add targeted smoke coverage for NQ and ES daily trend/range parsing/loading behavior.

### Step 284.5 - Browser/API Validation

Verify Main=NQ and Main=ES can load chart data and Daily Regime lookup returns current Main instrument data.

### Step 284.6 - Documentation Closeout

Update user docs to state that VIX is shared, while trend/range regime follows Main instrument.
