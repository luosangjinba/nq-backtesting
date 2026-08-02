# Session — 2026-08-02 — NQ 2023 Q3–2024 Raw Roll Audit

## Request

Execute the first Databento raw old/new review selected by the NQ pre-2025
continuous-volume prescreen.

## Result

- audited the five recent amber windows with Databento `GLBX.MDP3` raw
  `ohlcv-1m` and `available` dataset conditions;
- added the adjacent green 2023 Q4 window required for a contiguous calendar
  chain;
- found 2023 Q3/Q4 and 2024 Q1 switched late, while 2024 Q2 switched early;
- retained 2024 Q3 at its volume-confirmed boundary;
- retained 2024 Q4 at the hard-horizon boundary with manual evidence because
  automatic two-session dominance occurred later;
- bounded four future repair intervals to 14,321 current rows replaced by
  14,517 raw rows, restoring 196 minute timestamps;
- verified target symbols, exact half-open bounds, zero replacement duplicate
  timestamps, zero invalid OHLC rows, and stable replacement fingerprints;
- performed no DuckDB or calendar mutation.

## Binding Evidence

- `v7/docs/V7_NQ_2023Q3_2024_RAW_ROLL_AUDIT.md`
- `v7/docs/V7_NQ_PRE_2025_CONTINUOUS_ROLL_PRESCREEN.md`
- `v4/scripts/scan_roll_volume_candidates.py`

## Continuation

Implement a generic manifest-driven historical roll repair workflow rather
than extending the hard-coded NQ 2025 service. It must re-download and match
all four recorded fingerprints before Preview becomes commit-eligible.
