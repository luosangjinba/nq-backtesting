# V7 ES Databento Full-Chain Historical Repair

Status: committed and independently verified

Audit date: 2026-08-03

## Decision

ES now follows the same historical roll authority as NQ from Databento's first
eligible transition in 2010 Q2 through the latest resolved transition in 2026
Q2:

1. resolve the free volume-ranked `ES.v.0` mapping;
2. treat each new mapping start `d0` as the CME trade date;
3. change the local source at the preceding natural date's `18:00
   America/New_York` session open;
4. store bars from the selected raw quarterly contract rather than importing
   Databento continuous OHLCV;
5. retain pre-June-2010 ES as explicit legacy-source history because it
   predates `GLBX.MDP3` minute coverage.

The policy aligns a complete CME session to one source contract. It does not
assert that every provider-degraded historical minute can be restored.

## Complete Evidence

The frozen free mapping contains 66 contiguous segments and 65 quarterly
transitions from `ESM0 -> ESU0` through `ESM6 -> ESU6`. Every instrument id was
independently resolved to exactly one overlapping raw H/M/U/Z contract. The
normalized mapping fingerprint is
`102cf1f20aa7bd437403917952b290e0df60316657c1c965d9b34492ebb163e3`.

The legacy ES series has no source-contract column and no retained original
continuous CSV. Local price seams were used only to bound acquisition windows.
For 62 legacy transitions, both old and new raw contracts were downloaded and
matched exactly against local OHLCV to prove the current source change. The
three governed 2025Q4–2026Q2 transitions used their exact existing calendar
boundaries.

| Measure | Result |
| --- | ---: |
| Databento transitions | 65 |
| Exact bilateral legacy attributions | 62 |
| Already aligned | 10 |
| Repair intervals | 55 |
| Current rows inside repair intervals | 99,875 |
| Reviewed replacement rows | 102,512 |
| Net restored minute rows | +2,637 |
| Duplicate ES timestamps before repair | 0 |

The full mapping diff is `v7-es-databento-full-chain-diff.json`. Exact source
matches, interval fingerprints, timestamp-set differences, and condition
evidence are retained in `v7-es-databento-full-chain-audit.json`. The executable
manifest is
`v4/data_config/historical_roll_repairs/es-databento-full-chain.yml`.

## Source-Quality Boundary

Exactly two repaired intervals require explicit `degraded` permission:

- 2019 Q1 contains degraded 2019-03-13 and replaces 4,425 rows with 4,449,
  restoring 24 net minutes;
- 2026 Q1 contains degraded 2026-03-15 and 2026-03-16 and replaces 3,780 rows
  with the same 3,780 timestamps from the old contract.

Databento also reports 2026-03-14 as `missing`. That UTC date contains no
staged ES bar: current and replacement timestamp sets both have zero rows for
the closed date and are identical across the complete repair interval. The
Preview therefore retains the full response as evidence but applies the
condition allowlist only to UTC dates represented by staged rows. `missing`
was not added to the manifest permission set. A missing condition on any date
with staged rows remains rejected, as does absent condition coverage.

The 2014 Q2 degraded dates belong to an already aligned boundary and require
no repair. The 2025 Q3 degraded date falls after the ES repair interval. The
generic manifest default remains `available` only.

## Economic Bound

Acquisition was bounded to source-attribution and exact replacement slices:

- narrow bilateral/replacement audit requests: estimated USD 2.902282;
- fresh fingerprint-reproducing Preview: estimated USD 0.374249;
- combined estimated cost: USD 3.276531, below the USD 4 stop.

No complete 16-year raw ES history and no Databento continuous OHLCV stream
was downloaded.

## Guarded Execution

The current-source V4 Maintenance API completed a fresh Preview and guarded
Commit on 2026-08-03:

- all 55 fresh replacements reproduced reviewed row counts and fingerprints;
- 99,875 current rows were transactionally replaced by 102,512 raw-contract
  rows;
- ES increased from 6,492,243 to 6,494,880 rows;
- total DuckDB rows increased from 12,659,650 to 12,662,287;
- ES and NQ each have zero duplicate timestamps;
- all 65 ES calendar events exactly equal the session-aligned Databento
  targets;
- final Roll Calendar revision is
  `86d01ee693741bd0200c435de843a3bea3671ace1f4a8dfc02f203aaf96469fd`.

Recovery evidence:

- DuckDB backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260803_131025_437396Z.duckdb`;
- Roll Calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.es-databento-full-chain.20260803T091026-0400.yml`;
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-es-databento-full-chain-id22NCOORfK5fIoTwNajxHSi/manifest.json`;
- append-only audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`.

Independent verification rechecked every committed interval, the complete
candidate calendar, 6,494,880 ES rows, and zero ES duplicates. The entire
6,167,407-row NQ series remained byte-content-equivalent by count, range, and
aggregate row hash to the pre-write backup. ES before the Databento boundary
also remained equivalent: 846,060 rows through 2010-06-11 16:14 ET.

Representative current-source API reads returned 5,497 one-minute bars across
2010 Q3, 161 one-hour ETH bars across degraded-date 2019 Q1, and 37 four-hour
ETH bars across 2026 Q1. Forty-one focused mapping/repair/calendar/write-guard
tests, the Maintenance boundary smoke, and all four V7 architecture/source
Harnesses passed. Full V4 discovery passed 107 of 111 tests; the four errors
are the same pre-existing architecture-review tests that call private helpers
already moved out of `v4_api.py`.
