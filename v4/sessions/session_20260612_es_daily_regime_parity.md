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

## Step 284.3 Status

Completed.

Implemented:

- `bar-store.setBars()` now includes current Main instrument in the `bars:loaded` payload.
- `daily-regime-vix-loader.js` maps `ES` to `data/daily-regime-es.csv`.
- Missing instrument trend/range CSV files return an empty map and do not block shared VIX loading.
- Main instrument changes clear the in-memory Daily Regime layer so stale NQ/ES regimes are not shown while a new Main reload is pending.

Boundary:

- VIX stays shared through `data/vix-daily.csv`.
- Trend/range remains instrument-specific by CSV file.

### Step 284.4 - Smoke Tests

Add targeted smoke coverage for NQ and ES daily trend/range parsing/loading behavior.

## Step 284.4 Status

Completed.

Added `v4/tests/daily-regime-loader-smoke.js`.

Coverage:

- Mocks browser `fetch()` by reading local V4 data files.
- Emits `bars:loaded` with `instrument: ES`.
- Verifies ES receives shared VIX from `vix-daily.csv`.
- Verifies ES receives trend/range from `daily-regime-es.csv`.
- Verifies Main instrument change clears stale Daily Regime records.
- Emits `bars:loaded` for an instrument without a trend/range CSV and verifies VIX still loads while trend/range remain `unknown`.

Validation:

- `node v4/tests/daily-regime-loader-smoke.js`
- `node v4/tests/primary-instrument-compat-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`

Note:

- Node reports the existing module-type warning for ES module smoke files; smoke exits successfully.

### Step 284.5 - Browser/API Validation

Verify Main=NQ and Main=ES can load chart data and Daily Regime lookup returns current Main instrument data.

## Step 284.5 Status

Completed.

Updated `v4/tests/primary-instrument-browser-smoke.js`.

Browser/API coverage:

- Uses a fresh temporary Chrome profile per run and disables browser cache.
- Loads the real V4 page.
- Switches Main to `ES`.
- Fetches NQ and ES bars through the frontend API.
- Sets ES bars into the primary bar store and emits `bars:loaded`.
- Verifies ES Daily Regime has shared VIX from `vix-daily.csv`.
- Verifies ES Daily Regime has trend/range from `daily-regime-es.csv`.
- Confirms primary chart canvas still renders.

Validation:

- `node v4/tests/primary-instrument-browser-smoke.js`
- `node v4/tests/daily-regime-loader-smoke.js`
- `find v4/src v4/tests -name '*.js' -print0 | xargs -0 -n1 node --check`

### Step 284.6 - Documentation Closeout

Update user docs to state that VIX is shared, while trend/range regime follows Main instrument.

## Step 284.6 Status

Completed.

Updated:

- `v4/docs/user/USER_GUIDE.zh-CN.md`
- `v4/docs/user/USER_GUIDE.en.md`
- `v4/TODO.md`

Documentation now states:

- VIX is shared through `data/vix-daily.csv`.
- Trend/range regime follows the current Main instrument.
- NQ reads `data/daily-regime-nq.csv`.
- ES reads `data/daily-regime-es.csv`.
- ES Daily Regime currently covers `2008-01-02 -> 2026-06-11`.
- After refreshing candle data, the matching `daily-regime-*.csv` must be regenerated for Calendar Trend/Range to reflect new bars.

Step 284 completed.
