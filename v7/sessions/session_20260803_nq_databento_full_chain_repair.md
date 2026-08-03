# Session — 2026-08-03 — NQ Databento Full-Chain Repair

## Request

Align the current NQ continuous series with Databento volume-ranked `d0`
mapping dates while moving each local source boundary to the preceding
`18:00 ET` session open. Defer multi-provider plugin/UI work.

## Result

- adopted the session-aligned Databento mapping as NQ historical authority
  from 2010 Q2 through 2026 Q2;
- retained pre-June-2010 NQ as explicit legacy-source history;
- upgraded 45 inferred legacy seams to exact bilateral raw old/new contract
  attribution;
- proved nine of 65 events already aligned and generated 56 non-overlapping
  repair intervals;
- estimated paid attribution plus fresh Preview at USD 2.721236, below the USD
  4 hard stop;
- made one-digit raw-symbol transition identity decade-aware;
- separated the missing-future-roll Monday operational deadline from the
  confirmed historical event's third-Friday expiry deadline;
- kept `available` as the default condition and allowed `degraded` only for
  the three reviewed affected repair specs;
- completed fresh raw-contract Preview, exact fingerprint reproduction,
  verified full backup, transactional Commit, and independent Verify through
  the V4 Maintenance API;
- replaced 110,932 rows with 119,562 and restored 8,630 net minute rows;
- finished with 12,659,650 total rows, 6,167,407 NQ rows, 6,492,243 ES rows,
  and zero duplicate timestamps for both instruments;
- verified all 65 NQ calendar targets, unchanged ES, unchanged 694,255-row
  pre-Databento NQ history, and representative 1m/1h/4h API reads.

## Recovery Evidence

- database backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260803_102621_239683Z.duckdb`;
- calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.nq-databento-full-chain.20260803T062621-0400.yml`;
- Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-nq-databento-full-chain-qUJdhiVXXurFHU0EdwvB0CMv/manifest.json`;
- append-only audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`;
- final calendar revision:
  `0a57f78e7d9ff2ec11c2122379fd25f65ba46e51f2ee7b30d24a056608228a66`.

## Verification

- 42/42 focused repair/calendar/write-guard tests passed;
- full V4 discovery passed 101/105; the four errors are the same pre-existing
  architecture-review tests that call private functions already moved from
  `v4_api.py`;
- Maintenance boundary smoke and `git diff --check` passed;
- independent manifest Verify passed all 56 row-count/fingerprint checks;
- `/v4/bars` and `/v4/projected_history` returned representative repaired
  1m/1h/4h ranges, including reviewed degraded-date windows.
