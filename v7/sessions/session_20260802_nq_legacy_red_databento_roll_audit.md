# Session — 2026-08-02 — NQ Legacy Red Databento Roll Audit

## Request

Execute the next read-only audit step for the eight red legacy NQ windows,
while accounting for the fact that correct early lead contracts can themselves
contain sparse or missing minutes. Evaluate whether Databento's roll date can
be used economically and normalized to a non-splitting `18:00 ET` boundary.

## Result

- used free Databento `NQ.v.0` continuous-to-instrument mappings to obtain the
  effective `d0` trade dates instead of discovering them through paid expanded
  minute windows;
- resolved every mapped instrument id to the expected new raw contract;
- normalized each `d0` to the preceding natural date at `18:00 ET` while
  retaining raw quarterly contracts as the only bar source;
- used the already downloaded bilateral `ohlcv-1m` only for relative coverage,
  event context, exact source attribution, and candidate-slice fingerprints;
- treated historical minute sparsity as normal context and did not apply the
  modern 1,200/1,380-minute threshold as a universal acceptance rule;
- found seven legacy boundaries would move earlier under the proposed policy
  and 2020 Q1 would move 48 hours later;
- bounded eight candidate slices to 10,568 current rows and 14,468 replacement
  rows, a net increase of 3,900 timestamps;
- verified all reviewed Databento dates are `available`, raw downloads have
  zero duplicate `(symbol, ts)` pairs, and replacement slices have zero
  duplicate timestamps and zero invalid OHLC rows;
- retained 2020 Q1 as focused manual evidence because circuit breakers made
  both contracts sparse and the candidate improves net coverage by only 18
  minutes;
- performed no DuckDB or Roll Calendar mutation.

## Verification

- audit JSON-to-document boundary, count, and fingerprint assertions passed;
- authoritative DuckDB remains at 12,651,020 total rows, 6,158,777 NQ rows,
  and zero duplicate NQ timestamps;
- Roll Calendar revision remains
  `adf9ae6191a313c50517646b32b88088bccb708bc240e3d6c346ef1581c71250`;
- V7 architecture-boundary, production-architecture,
  architecture-hardening, and source-quality Harnesses passed;
- `git diff --check` passed.

## Binding Evidence

- `v7/docs/V7_NQ_LEGACY_RED_DATABENTO_ROLL_AUDIT.md`
- `v7/docs/V7_NQ_PRE_2025_CONTINUOUS_ROLL_PRESCREEN.md`
- `v4/docs/planning/DATABENTO_DATA_RESEARCH.md`

## Continuation

Obtain one free complete `NQ.v.0` mapping and generate a read-only diff against
every actual local source seam and current governed boundary. Decide whether
the Databento-date rule supersedes the prior historical two-session rule for
one contiguous chain, including already repaired 2023–2025 dates, before
creating any repair manifest.
