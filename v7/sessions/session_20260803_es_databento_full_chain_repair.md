# Session — 2026-08-03 — ES Databento Full-Chain Repair

## Request

Apply the same completed NQ policy to ES: align current data with Databento
`ES.v.0 d0` and change the local source at the preceding `18:00 ET` session
open.

## Result

- froze 66 contiguous `ES.v.0` mappings and independently resolved all raw
  contract identities;
- proved all 62 legacy source changes with bilateral old/new OHLCV attribution;
- identified 10 already aligned boundaries and 55 repair intervals;
- estimated audit plus fresh Preview at USD 3.276531, below the USD 4 stop;
- generalized the NQ attribution helper and audit adapter for ES/NQ instead of
  duplicating critical repair logic;
- refined Databento condition validation so a closed UTC date with no staged
  bars does not grant `missing` permission, while every staged UTC date still
  requires accepted condition evidence;
- completed fresh Preview, verified backup, transactional Commit, and
  independent Verify through the V4 Maintenance API;
- replaced 99,875 rows with 102,512 and restored 2,637 net minute rows;
- finished with 12,662,287 total rows, 6,494,880 ES rows, 6,167,407 NQ rows,
  and zero duplicates for both instruments;
- published all 65 ES target boundaries while preserving all NQ data and all
  846,060 pre-Databento ES rows exactly.

## Recovery Evidence

- database backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260803_131025_437396Z.duckdb`;
- calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.es-databento-full-chain.20260803T091026-0400.yml`;
- Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-es-databento-full-chain-id22NCOORfK5fIoTwNajxHSi/manifest.json`;
- append-only audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`;
- final calendar revision:
  `86d01ee693741bd0200c435de843a3bea3671ace1f4a8dfc02f203aaf96469fd`.

## Verification

- 41 focused mapping/repair/calendar/write-guard tests passed;
- full V4 discovery passed 107/111; the four errors are unchanged pre-existing
  architecture-review tests that call private helpers moved out of `v4_api.py`;
- all four V7 architecture/source Harnesses passed;
- independent manifest Verify passed all 55 interval fingerprints;
- exact 65-event ES calendar parity passed;
- complete NQ and pre-Databento ES backup hashes remained unchanged;
- representative API reads returned 5,497 ES 1m, 161 ES 1h, and 37 ES 4h bars;
- Maintenance boundary smoke and `git diff --check` passed.
