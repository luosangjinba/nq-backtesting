# V7 NQ Pre-2025 Continuous Roll Risk Prescreen

Status: read-only prescreen complete; no raw-contract decision and no write

Scan date: 2026-08-02

## Outcome

The original continuous CSV retained volume and can materially reduce the
number of historical windows that need immediate Databento dual-contract
review. It cannot confirm a roll by itself because it contains only the
already-selected continuous leg and has no `source_contract` column.

The new read-only scanner calibrated correctly against the known 2025 result:

- 2025 Q1 and Q2 are `red` at the exact March and June legacy seams;
- 2025 Q3 is only `amber`, matching the decision to retain September pending
  explicit raw-contract evidence rather than auto-repair it;
- the incomplete 2025 Q4 source window is not scored.

The 2008–2024 scan covers 68 complete quarterly windows:

| Risk | Windows | Meaning |
| --- | ---: | --- |
| `red` | 8 | immediate post-seam bar-count and volume collapse; raw review first |
| `amber` | 33 | one weaker signal; raw review is useful but no repair is implied |
| `green` | 27 | no immediate post-seam continuous-series anomaly; defer raw review |

The 27 green windows can be deferred from risk-driven raw review. A smaller
first validation wave can cover the five recent amber windows plus the eight
red legacy windows: 13 windows instead of 68; the other 28 legacy amber
windows remain a later, lower-priority batch.

## Source And Conversion Evidence

Source:
`/home/leo/myworkspace/trading/backtesting-v7/v7/tmp/NQ_full_1min_continuous.csv`

- CSV rows and distinct timestamps: 5,906,274;
- source coverage: 2008-01-02 06:01 through 2025-11-04 18:39 ET wall time;
- null, zero, and negative source-volume rows: 0;
- DuckDB rows over the same range after the 2025 repair: 5,906,412;
- CSV timestamps missing from DuckDB: 0;
- DuckDB-only timestamps: 138, exactly the March/June restored minutes;
- outside the repaired intervals, 5,904,372 matched rows have zero OHLC or
  volume mismatches.

The 1,902 matched-row differences are exactly the March and June source rows
replaced by the approved 2025 repair. December is later than this CSV's final
timestamp. The CSV-to-DuckDB conversion therefore did not discard volume.

## Prescreen Contract

For each quarterly third-Friday window, the scanner:

1. derives a robust baseline from weekday CME trade dates 35–10 days before
   expiry;
2. detects a possible continuous-series seam near midnight or session open;
3. evaluates only the seam trade date and the next available weekday session;
4. compares bar count and volume with the baseline medians;
5. assigns `red` only when both bar ratio is below 0.97 and volume ratio is
   below 0.40;
6. assigns `amber` when bar ratio is below 0.985 or volume ratio is below 0.55;
7. never converts those diagnostic grades into a roll date or database write.

Restricting evaluation to the first two post-seam sessions prevents later
holidays such as Juneteenth from being mistaken for immediate roll-liquidity
failure.

## Eight Red Legacy Windows

Every inferred seam below is low confidence. These are high-priority evidence
requests, not confirmed roll defects; old market schedules, market halts, and
source coverage can produce the same signature.

| Window | Inferred seam | Weakest trade date | Bar ratio | Volume ratio |
| --- | --- | --- | ---: | ---: |
| 2010 Q3 | 2010-09-12 18:00 | 2010-09-13 | 0.775 | 0.169 |
| 2011 Q2 | 2011-06-12 18:00 | 2011-06-13 | 0.680 | 0.148 |
| 2011 Q4 | 2011-12-09 00:03 | 2011-12-12 | 0.694 | 0.127 |
| 2012 Q1 | 2012-03-12 00:05 | 2012-03-12 | 0.793 | 0.171 |
| 2013 Q1 | 2013-03-10 18:00 | 2013-03-12 | 0.653 | 0.132 |
| 2016 Q4 | 2016-12-11 18:00 | 2016-12-12 | 0.949 | 0.289 |
| 2017 Q1 | 2017-03-10 00:04 | 2017-03-13 | 0.824 | 0.206 |
| 2020 Q1 | 2020-03-15 18:00 | 2020-03-16 | 0.411 | 0.363 |

The 2020 Q1 result is especially confounded by contemporaneous limit events
and must not be treated as rollover proof.

## Recent Result: 2021–2024

- all eight 2021–2022 windows are green;
- 2023 Q1, Q2, and Q4 are green;
- 2023 Q3 is amber from a 0.953 post-seam bar ratio;
- all four 2024 windows are amber:
  - Q1: 0.981 bar ratio with normal/high relative volume;
  - Q2: 0.997 bar ratio but 0.331 volume ratio;
  - Q3: 0.994 bar ratio and 0.507 volume ratio;
  - Q4: 0.996 bar ratio and 0.512 volume ratio.

These five recent amber windows are the best first Databento raw old/new
contract review because they have the highest Replay value and bounded cost.

## Reproduction

```bash
python3 v4/scripts/scan_legacy_continuous_rolls.py \
  v7/tmp/NQ_full_1min_continuous.csv \
  --instrument NQ \
  --start-year 2008 \
  --end-year 2024
```

The CLI also supports `--format json`. Both modes are read-only.

## Next Gate

Download raw old/new Databento `ohlcv-1m` only for:

1. the five recent amber windows (`2023 Q3`, `2024 Q1–Q4`);
2. the eight red legacy windows after the recent batch is understood.

Any later repair still requires dataset-condition evidence, an accepted
session-aligned boundary, retained source hashes, backup, exact confirmation,
transactional replacement, and post-write verification. This prescreen grants
no write authority.
