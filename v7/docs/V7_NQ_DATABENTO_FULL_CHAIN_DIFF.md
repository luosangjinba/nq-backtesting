# V7 NQ Databento Full-Chain Roll Diff

Status: complete read-only mapping diff; remaining raw attribution not
authorized

Audit date: 2026-08-02

## Outcome

One free Databento `NQ.v.0` symbology query now defines the complete
Databento-eligible NQ roll sequence from June 2010 through August 2026:

- 66 contiguous contract mappings;
- 65 quarterly transitions from `NQM0 -> NQU0` through
  `NQM6 -> NQU6`;
- every instrument id independently resolves to the expected raw quarterly
  contract;
- every adjacent raw contract follows the H/M/U/Z successor chain;
- no date gap or overlap exists in the returned mapping;
- normalized mapping fingerprint:
  `635306c81f7b954342f8d67028a3d91bc5e2d7c86089f9eb6a69c61fab44a151`.

The local policy under review treats each Databento mapping start `d0` as an
effective CME trade date and sets the candidate source boundary to the prior
natural date at `18:00 America/New_York`. Raw quarterly contracts remain the
bar source; direct continuous OHLCV is not imported.

Databento documents `NQ.v.0` as the volume-ranked continuous contract using
the previous day's volume and provides free date-to-instrument resolution:
[Databento symbology](https://databento.com/docs/standards-and-conventions/symbology).

The machine-readable mapping and all 65 comparisons are frozen in
`v7-nq-databento-full-chain-diff.json`.

This step performed no DuckDB or Roll Calendar write.

## Evidence Levels

The full list deliberately separates exact source evidence from diagnostic
seam inference.

| Evidence | Transitions | Meaning |
| --- | ---: | --- |
| governed Roll Calendar | 12 | exact current boundary after prior repair/acquisition |
| raw bilateral audit | 8 | exact current source attribution from matching old/new OHLCV |
| legacy continuous inference | 45 | diagnostic price-gap seam only; not write authority |

The original continuous CSV has no `source_contract` column. Its price-gap
scanner is useful for bounding a paid review, but the eight red-window audit
already proved that a low-confidence inferred seam can appear to match
Databento while the actual selected source changes 30 hours later. Therefore
the 45 inferred rows are never counted as confirmed matches or mismatches.

## Exact Twenty-Transition Result

For every exact row below, `delta` is
`Databento session boundary - current exact boundary`.

| Window | Evidence | Current boundary (ET) | Databento boundary (ET) | Delta | Result |
| --- | --- | --- | --- | ---: | --- |
| 2010 Q3 | raw | 2010-09-14 00:00 | 2010-09-12 18:00 | -30h | earlier |
| 2011 Q2 | raw | 2011-06-14 00:00 | 2011-06-12 18:00 | -30h | earlier |
| 2011 Q4 | raw | 2011-12-14 00:00 | 2011-12-11 18:00 | -54h | earlier |
| 2012 Q1 | raw | 2012-03-14 00:00 | 2012-03-12 18:00 | -30h | earlier |
| 2013 Q1 | raw | 2013-03-14 00:00 | 2013-03-11 18:00 | -54h | earlier |
| 2016 Q4 | raw | 2016-12-14 00:00 | 2016-12-12 18:00 | -30h | earlier |
| 2017 Q1 | raw | 2017-03-14 00:00 | 2017-03-12 18:00 | -30h | earlier |
| 2020 Q1 | raw | 2020-03-15 18:00 | 2020-03-17 18:00 | +48h | later |
| 2023 Q3 | calendar | 2023-09-10 18:00 | 2023-09-12 18:00 | +48h | later |
| 2023 Q4 | calendar | 2023-12-10 18:00 | 2023-12-12 18:00 | +48h | later |
| 2024 Q1 | calendar | 2024-03-10 18:00 | 2024-03-12 18:00 | +48h | later |
| 2024 Q2 | calendar | 2024-06-16 18:00 | 2024-06-18 18:00 | +48h | later |
| 2024 Q3 | calendar | 2024-09-15 18:00 | 2024-09-17 18:00 | +48h | later |
| 2024 Q4 | calendar | 2024-12-15 18:00 | 2024-12-18 18:00 | +72h | later |
| 2025 Q1 | calendar | 2025-03-16 18:00 | 2025-03-19 18:00 | +72h | later |
| 2025 Q2 | calendar | 2025-06-15 18:00 | 2025-06-17 18:00 | +48h | later |
| 2025 Q3 | calendar | 2025-09-14 18:00 | 2025-09-17 18:00 | +72h | later |
| 2025 Q4 | calendar | 2025-12-14 18:00 | 2025-12-16 18:00 | +48h | later |
| 2026 Q1 | calendar | 2026-03-16 00:00 | 2026-03-17 18:00 | +42h | later |
| 2026 Q2 | calendar | 2026-06-15 00:00 | 2026-06-16 18:00 | +42h | later |

Exact summary:

- confirmed match: 0;
- Databento earlier: 7, all from the audited legacy red batch;
- Databento later: 13, comprising 2020 Q1 and all 12 governed events.

Adopting the Databento-date authority would therefore not merely extend the
calendar backward. It would also rebaseline every existing NQ calendar event
and partially replace data written by the completed 2023–2025 repairs.

## Remaining Forty-Five Diagnostic Rows

The legacy continuous scanner supplies only diagnostic boundaries for the
remaining rows:

| Seam confidence | Rows | Apparent match | Apparent earlier | Apparent later |
| --- | ---: | ---: | ---: | ---: |
| high | 28 | 0 | 16 | 12 |
| medium | 1 | 0 | 1 | 0 |
| low | 16 | 10 | 3 | 3 |
| **Total** | **45** | **10** | **20** | **15** |

“Apparent” is intentional. None of these 45 outcomes can enter a repair
manifest until raw old/new bars identify the current leg exactly.

The 17 lower-confidence windows are the first raw-attribution priority:

| Window | Confidence | Prescreen risk | Inferred current (ET) | Databento boundary (ET) | Apparent delta |
| --- | --- | --- | --- | --- | ---: |
| 2010 Q2 | low | amber | 2010-06-13 18:00 | 2010-06-13 18:00 | 0h |
| 2010 Q4 | low | amber | 2010-12-13 18:00 | 2010-12-12 18:00 | -24h |
| 2011 Q1 | medium | green | 2011-03-14 00:00 | 2011-03-13 18:00 | -6h |
| 2013 Q3 | low | amber | 2013-09-15 18:00 | 2013-09-15 18:00 | 0h |
| 2013 Q4 | low | amber | 2013-12-15 18:00 | 2013-12-15 18:00 | 0h |
| 2014 Q2 | low | amber | 2014-06-15 18:00 | 2014-06-15 18:00 | 0h |
| 2014 Q3 | low | green | 2014-09-14 18:00 | 2014-09-14 18:00 | 0h |
| 2014 Q4 | low | green | 2014-12-14 18:00 | 2014-12-14 18:00 | 0h |
| 2015 Q1 | low | green | 2015-03-15 18:00 | 2015-03-15 18:00 | 0h |
| 2015 Q2 | low | amber | 2015-06-14 18:00 | 2015-06-14 18:00 | 0h |
| 2019 Q3 | low | green | 2019-09-15 18:00 | 2019-09-15 18:00 | 0h |
| 2019 Q4 | low | green | 2019-12-15 18:00 | 2019-12-15 18:00 | 0h |
| 2020 Q2 | low | green | 2020-06-14 18:00 | 2020-06-16 18:00 | +48h |
| 2020 Q4 | low | green | 2020-12-13 18:00 | 2020-12-15 18:00 | +48h |
| 2021 Q1 | low | green | 2021-03-17 18:00 | 2021-03-16 18:00 | -24h |
| 2021 Q4 | low | green | 2021-12-13 18:00 | 2021-12-12 18:00 | -24h |
| 2022 Q1 | low | green | 2022-03-13 18:00 | 2022-03-15 18:00 | +48h |

The 28 high-confidence price-gap rows are all apparent mismatches, but they
still need raw provenance before a write. Their complete dates, deltas, risk
grades, and contract identities are in the machine-readable artifact.

## Coverage Limit

The local NQ CSV begins in January 2008, while Databento `GLBX.MDP3`
`ohlcv-1m` begins in June 2010. Nine earlier quarterly transitions, 2008 Q1
through 2010 Q1, cannot be governed by `NQ.v.0` and remain a separate legacy-
source problem. A future calendar must state this provenance break explicitly;
it must not imply that Databento certified unavailable history.

## Economic Completion Plan

The remaining exact-attribution work does not require a full 16-year download.
For each of the 45 diagnostic windows:

1. request only the old and new raw contracts from two natural days before
   the earlier of the inferred/Databento boundaries through two days after the
   later boundary;
2. match local OHLCV exactly to identify the actual selected leg and boundary;
3. retain Databento condition evidence, raw duplicate checks, and the exact
   candidate replacement fingerprint;
4. do not reuse audit frames for a write; a later Preview must re-download the
   exact accepted replacement slices.

This plan is approximately 520 conservative contract-days. Databento's
current 2026-08-02 historical `GLBX.MDP3` `ohlcv-1m` unit price remains
USD 70/GB. Using the measured modern full-contract-day cost of about
USD 0.00504, the remaining bilateral audit is approximately USD 2.62. A fresh
Preview of all estimated mismatch slices adds about USD 0.63. The operational
gate should call Databento `metadata.get_cost` before every batch and stop if
the combined estimate exceeds USD 4 without renewed approval.

A complete 16-year rebuild would be simpler conceptually but would cost about
USD 30, rewrite millions of otherwise unaffected rows, and enlarge rollback
risk. The narrow bilateral plan is the recommended economic path.

## Next Decision Gate

No paid 45-window download was made in this step. Before continuing, explicitly
approve both:

1. Databento `NQ.v.0` `d0`, normalized to the prior `18:00 ET` session open,
   as the historical roll-date authority from 2010 Q2 onward;
2. a maximum USD 4 budget for the remaining 45-window bilateral attribution
   and later exact Preview.

After that approval, audit the 17 low/medium-confidence windows first, then the
28 high-confidence windows. Only a complete 65-transition evidence inventory
can produce a versioned contiguous calendar and repair plan. Database/calendar
mutation remains a separate explicit gate.

## Unchanged Authority State

- database: 12,651,020 total rows;
- NQ: 6,158,777 rows;
- duplicate NQ timestamps: 0;
- Roll Calendar revision:
  `adf9ae6191a313c50517646b32b88088bccb708bc240e3d6c346ef1581c71250`.
