# V7 NQ Databento Full-Chain Historical Repair

Status: committed and independently verified

Audit date: 2026-08-02

## Decision

From the first Databento-eligible transition in 2010 Q2 through the latest
resolved transition in 2026 Q2, NQ uses one historical roll authority:

1. resolve the free volume-ranked `NQ.v.0` date mapping;
2. treat each new mapping start `d0` as the CME trade date;
3. set the local source change to the prior natural date at `18:00
   America/New_York`, so one CME session never mixes contracts;
4. store bars from the raw old/new quarterly contracts, not the Databento
   continuous OHLCV stream;
5. retain the original pre-June-2010 legacy history because Databento does not
   provide corresponding `GLBX.MDP3` minute coverage.

This supersedes the historical two-consecutive-volume-session rule for NQ
history covered by Databento. The operational future-roll UI still blocks a
missing transition at Monday of expiry week; a reviewed historical event may
follow the later provider mapping but must remain before the old contract's
third-Friday close.

## Complete Evidence

The frozen free mapping contains 65 contiguous transitions from
`NQM0 -> NQU0` in 2010 through `NQM6 -> NQU6` in 2026. The original evidence
inventory contained:

- 12 exact governed Roll Calendar events;
- 8 exact bilateral legacy audits;
- 45 price-gap seam inferences without source provenance.

All 45 inferred rows were subsequently compared with both Databento raw
quarterly contracts using exact OHLCV matching against the authoritative
DuckDB. Nine of the 65 boundaries were already aligned; 56 require bounded
half-open replacements.

| Measure | Result |
| --- | ---: |
| Databento transitions | 65 |
| Exact legacy attributions completed | 45 |
| Repair intervals | 56 |
| Already aligned | 9 |
| Current rows inside repair intervals | 110,932 |
| Reviewed replacement rows | 119,562 |
| Net restored minute rows | +8,630 |
| Duplicate NQ timestamps before repair | 0 |

The detailed boundary evidence, match counts, timestamp differences, exact
replacement fingerprints, and all 65 decisions are retained in
`v7-nq-databento-full-chain-audit.json`. The executable reviewed manifest is
`v4/data_config/historical_roll_repairs/nq-databento-full-chain.yml`.

## Reduced-Quality Source Dates

Databento condition evidence identified four affected windows:

- 2014 Q2 contains degraded source dates, but its current boundary is already
  aligned and no row is replaced;
- 2019 Q1 includes degraded 2019-03-13; the reviewed replacement restores a
  net 80 minutes;
- 2025 Q3 includes degraded 2025-09-17; enforcing the provider mapping removes
  a net 26 minutes from the previously early new-contract leg;
- 2026 Q1 includes degraded 2026-03-16; enforcing the provider mapping removes
  a net 12 minutes from the previously early new-contract leg.

The generic repair path still accepts only `available`. Exactly the three
repair specs above declare reviewed `available` plus `degraded` permission.
Unknown conditions remain rejected. This is a policy-alignment repair, not a
promise that a provider-degraded market date can be made gap-free.

## Economic Bound

The exact acquisition was deliberately narrow:

- the source-attribution/review requests were estimated at USD 2.284741;
- a fresh fingerprint-reproducing Preview was estimated at USD 0.436495;
- combined estimated Databento cost is USD 2.721236, below the approved USD 4
  hard stop.

No complete 16-year raw history was downloaded.

## Mutation Contract

The fixed manifest uses the existing guarded V4 Maintenance API path:

1. fresh raw-contract Preview download;
2. exact reviewed row-count and fingerprint reproduction;
3. explicit Databento condition validation per repair;
4. database/calendar revision binding;
5. exact confirmation `REPAIR NQ DATABENTO FULL CHAIN`;
6. verified full DuckDB backup and Roll Calendar backup;
7. one DuckDB transaction replacing only the 56 reviewed intervals;
8. atomic candidate calendar and append-only audit publication;
9. post-write interval fingerprints, total counts, and duplicate verification.

Any drift or failure restores the complete database backup and exact prior
calendar/audit state.

## Execution Result

The current-source V4 Maintenance API completed the guarded Preview and Commit
on 2026-08-03:

- all 56 fresh replacement downloads reproduced the reviewed row counts and
  fingerprints;
- 110,932 current rows were transactionally replaced by 119,562 raw-contract
  rows;
- NQ increased from 6,158,777 to 6,167,407 rows;
- total DuckDB rows increased from 12,651,020 to 12,659,650;
- NQ and ES each have zero duplicate timestamps;
- all 65 final NQ calendar events exactly match the session-aligned Databento
  targets from 2010 Q2 through 2026 Q2;
- final Roll Calendar revision is
  `0a57f78e7d9ff2ec11c2122379fd25f65ba46e51f2ee7b30d24a056608228a66`.

Recovery evidence:

- DuckDB backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260803_102621_239683Z.duckdb`;
- Roll Calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.nq-databento-full-chain.20260803T062621-0400.yml`;
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-nq-databento-full-chain-qUJdhiVXXurFHU0EdwvB0CMv/manifest.json`;
- append-only audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`.

Independent post-commit verification rechecked all 56 interval fingerprints,
the complete candidate calendar, 6,167,407 NQ rows, and zero NQ duplicates.
Representative `/v4/bars` reads returned 1,462 one-minute bars across 2010 Q3
and 4,530 across degraded-date 2019 Q1. `/v4/projected_history` returned 25
four-hour bars across 2025 Q3 and 63 one-hour bars across 2026 Q1.

The full ES series remained byte-content-equivalent by count, range, and
row-hash aggregate to the pre-write backup: 6,492,243 rows. NQ before the
Databento policy boundary also remained equivalent: 694,255 rows through
2010-06-11 16:14 ET. The repair therefore did not rewrite pre-Databento NQ
history or any ES row.
