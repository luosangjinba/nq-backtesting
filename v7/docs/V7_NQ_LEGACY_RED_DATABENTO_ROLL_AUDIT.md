# V7 NQ Legacy Red Databento Roll Audit

Status: read-only audit complete; no repair authorized or executed

Audit date: 2026-08-02

## Outcome

The eight red windows selected by the local continuous-volume prescreen were
reviewed against both Databento's official volume-ranked continuous mapping
and raw old/new `GLBX.MDP3` `ohlcv-1m` bars.

The recommended historical rule is now simpler and cheaper:

1. use the free `NQ.v.0` `symbology.resolve` mapping as the roll-date
   authority;
2. interpret each mapping start date `d0` as a CME trade date;
3. convert `d0` to the full-session boundary
   `session_open_for_trade_date(d0)`, the preceding natural date at
   `18:00 America/New_York`;
4. continue to import raw quarterly-contract bars rather than importing the
   Databento continuous OHLCV stream directly;
5. use paid bilateral minute data only to validate a mapped boundary and to
   stage the exact interval whose local source leg differs.

Databento documents `v` as ranking expirations by the previous day's trading
volume, returns original unadjusted contract prices, and exposes the
continuous-to-instrument date mappings through `symbology.resolve`:
[Databento symbology](https://databento.com/docs/standards-and-conventions/symbology).

All eight `NQ.v.0` mapping instrument ids resolved to the expected new raw
contract. Seven legacy boundaries are later than the session-aligned
Databento boundary. The exceptional 2020 Q1 legacy boundary is 48 hours
earlier than Databento.

This audit performed no DuckDB or Roll Calendar write.

## Why The Date Mapping Is Preferred

Searching for the Databento roll by downloading a local-seam window is
unnecessary. One free mapping request can return the complete historical
`NQ.v.0` sequence. The existing local seam is useful only after that request,
to determine whether a repair interval exists and which raw contract supplies
it.

This separates three concerns:

- Databento decides the volume-ranked effective trade date;
- local policy prevents a partial CME session by converting that trade date
  to its `18:00 ET` session open;
- raw old/new bars prove the exact stored-series effect and provide explicit
  contract provenance.

Direct `NQ.v.0` OHLCV import remains rejected. The date mapping is authority;
the original raw quarterly contract is the bar source.

## Historical Liquidity Constraint

No modern fixed minute-count threshold is used as a historical truth test.
Early NQ sessions can contain fewer traded minutes even in the correct lead
contract. Exchange schedules also changed during the audited history: CME
changed the equity-index futures close in November 2012 and again in September
2015. See the official
[2012 CME advisory](https://www.cmegroup.com/tools-information/lookups/advisories/clearing/Chadv12-423.html)
and
[2015 CME advisory](https://www.cmegroup.com/tools-information/lookups/advisories/electronic-trading/20150831.html).

The audit therefore asks relative questions inside the same trade date:

- does `NQ.v.0` map to the expected new contract;
- are both raw contracts from an `available` Databento date;
- does the selected leg span the historical session comparably or better;
- does it improve rather than materially degrade timestamp coverage over the
  local leg;
- is bilateral sparsity explained by a market-wide event rather than a wrong
  roll.

Gaps or sparse minutes alone are not roll-defect evidence.

## Boundary Decisions

`d0` below is Databento's first mapped date for the new `NQ.v.0` instrument.
The recommended boundary is always the prior natural date at `18:00 ET`, the
opening of that CME trade date.

| Transition | Local observed boundary (ET) | Databento `d0` | Mapped new id | Recommended boundary (ET) | Movement | Candidate source |
| --- | --- | --- | ---: | --- | ---: | --- |
| `NQU0 -> NQZ0` | 2010-09-14 00:00 | 2010-09-13 | 3,088 | 2010-09-12 18:00 | 30h earlier | `NQZ0` |
| `NQM1 -> NQU1` | 2011-06-14 00:00 | 2011-06-13 | 56,972 | 2011-06-12 18:00 | 30h earlier | `NQU1` |
| `NQZ1 -> NQH2` | 2011-12-14 00:00 | 2011-12-12 | 8,870 | 2011-12-11 18:00 | 54h earlier | `NQH2` |
| `NQH2 -> NQM2` | 2012-03-14 00:00 | 2012-03-13 | 20,924 | 2012-03-12 18:00 | 30h earlier | `NQM2` |
| `NQH3 -> NQM3` | 2013-03-14 00:00 | 2013-03-12 | 11,518 | 2013-03-11 18:00 | 54h earlier | `NQM3` |
| `NQZ6 -> NQH7` | 2016-12-14 00:00 | 2016-12-13 | 35,888 | 2016-12-12 18:00 | 30h earlier | `NQH7` |
| `NQH7 -> NQM7` | 2017-03-14 00:00 | 2017-03-13 | 6,398 | 2017-03-12 18:00 | 30h earlier | `NQM7` |
| `NQH0 -> NQM0` | 2020-03-15 18:00 | 2020-03-18 | 16,908 | 2020-03-17 18:00 | 48h later | `NQH0` |

For 2012 Q1 and 2013 Q1, the first exact new-contract match is at `00:01` and
the final exact old-contract match is before the preceding midnight. The
logical legacy boundary is normalized to `00:00`; neither new raw source has a
`00:00` bar, so the normalized half-open interval has the same rows and
fingerprint as an interval ending at `00:01`.

## Raw Bilateral Check At `d0`

Every listed trade date has Databento condition `available`. The minute counts
are observations, not universal completeness thresholds.

| Transition | Old minutes | New minutes | New/old volume | Relative result |
| --- | ---: | ---: | ---: | --- |
| `NQU0 -> NQZ0` | 943 | 1,218 | 5.2292 | new has more minutes and volume |
| `NQM1 -> NQU1` | 849 | 1,202 | 5.4976 | new has more minutes and volume |
| `NQZ1 -> NQH2` | 921 | 1,261 | 6.7459 | new has more minutes and volume |
| `NQH2 -> NQM2` | 911 | 1,243 | 6.9028 | new has more minutes and volume |
| `NQH3 -> NQM3` | 806 | 1,120 | 6.2676 | new has more minutes and volume |
| `NQZ6 -> NQH7` | 1,074 | 1,281 | 4.1492 | new has more minutes and volume |
| `NQH7 -> NQM7` | 1,095 | 1,301 | 3.6067 | new has more minutes and volume |
| `NQH0 -> NQM0` | 941 | 955 | 4.2278 | new has slightly more minutes and much more volume |

The first seven results strongly corroborate the mapped leg without assuming
that an early session must resemble a modern 1,380-minute session.

The 2020 interval remains event-confounded. US markets triggered market-wide
circuit breakers on March 9, 12, 16, and 18; both NQ legs are sparse around
the audited dates. See the official
[NYSE assessment](https://www.nyse.com/article/assessing-nyse-model-performance)
and
[SEC filing](https://www.sec.gov/rules/sro/iex/2020/34-90128.pdf).
That bilateral event sparsity is not evidence against the Databento roll. It
does mean 2020 Q1 must receive focused manual review before any write.

## Exact Candidate Data Scope

The candidate intervals are half-open and contain one contract only. The
timestamp-difference columns make the coverage trade-off explicit: a repair
does not union old and new contracts inside a session.

| Transition | Half-open interval (ET) | Current | Replacement | Net | Current-only | Replacement-only | Fingerprint |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `NQU0 -> NQZ0` | `[2010-09-12 18:00, 2010-09-14 00:00)` | 993 | 1,427 | +434 | 23 | 457 | `e6df38a571a80478ed5deb0100a6a3ed6eb6ad3fe99d6c95abe30b4b42a64d34` |
| `NQM1 -> NQU1` | `[2011-06-12 18:00, 2011-06-14 00:00)` | 924 | 1,424 | +500 | 12 | 512 | `ee722b498120e24b86fe0f0ed7eb040f706892e6d420665f563832abc3372555` |
| `NQZ1 -> NQH2` | `[2011-12-11 18:00, 2011-12-14 00:00)` | 1,857 | 2,789 | +932 | 21 | 953 | `ddf6e2180015a387a6ce49ad400c29f4387aa329b7876ed393dbe7d730fa15eb` |
| `NQH2 -> NQM2` | `[2012-03-12 18:00, 2012-03-14 00:00)` | 1,015 | 1,527 | +512 | 26 | 538 | `c70cc0f13767c77cc9224e8e84e0128640715995afc206a234bc3fd53b5f7cdc` |
| `NQH3 -> NQM3` | `[2013-03-11 18:00, 2013-03-14 00:00)` | 1,634 | 2,489 | +855 | 72 | 927 | `36f35fe854c3630f4057510679a85e43423745c02de2373aaffa68df872d3fce` |
| `NQZ6 -> NQH7` | `[2016-12-12 18:00, 2016-12-14 00:00)` | 1,244 | 1,571 | +327 | 47 | 374 | `0c6aa634a4b580732b54a52b3618216192e2cf03c8fb71f0a20eaa0ffe912289` |
| `NQH7 -> NQM7` | `[2017-03-12 18:00, 2017-03-14 00:00)` | 1,275 | 1,597 | +322 | 40 | 362 | `1fc6650d6d94fb2652e04ace8c7be0850f6c98148795a66bcf10d33e88ca8690` |
| `NQH0 -> NQM0` | `[2020-03-15 18:00, 2020-03-17 18:00)` | 1,626 | 1,644 | +18 | 146 | 164 | `f386a387ca141c647288e11a9eb990cdc71c396513af189748a15bb3570c9c8b` |
| **Total** |  | **10,568** | **14,468** | **+3,900** | **387** | **4,287** |  |

All replacement frames have zero duplicate timestamps and zero invalid OHLC
rows. All raw downloads have zero duplicate `(symbol, ts)` pairs. The small
set of current-only timestamps demonstrates why “no gaps” cannot mean unioning
both contracts: the invariant is one explicit contract per full session, with
better relative coverage, not a synthetic best-tick blend.

The first seven candidates restore between 322 and 932 net minutes. The 2020
candidate restores only 18 net minutes and exchanges 146 current-only minutes
for 164 replacement-only minutes. Its reason is consistent Databento policy,
not a claim that the circuit-breaker week can be made dense.

The date sequence was obtained read-only with the equivalent of:

```python
client.symbology.resolve(
    dataset="GLBX.MDP3",
    symbols=["NQ.v.0"],
    stype_in="continuous",
    stype_out="instrument_id",
    start_date="2010-08-01",
    end_date="2020-04-01",
)
```

The eight raw contract symbols were independently resolved to instrument ids
over the same history. No API key, downloaded bar file, or credential is
stored in the repository.

## Economic Acquisition Contract

For later full-history work:

1. call `symbology.resolve` once for `NQ.v.0` over the required date range;
2. resolve each returned instrument id to a raw contract and retain the mapping
   response as evidence;
3. compare each mapped session boundary with the local continuous-series
   source seam without downloading data;
4. for a mismatch, estimate and download only the raw replacement slice;
5. add old/new overlap for one or two adjacent trade dates only when relative
   coverage or an event requires manual confirmation;
6. re-download and reproduce exact fingerprints during a guarded Preview.

The mapping lookup, not a paid minute-bar search window, discovers the roll.
At the unit prices recorded in the Databento research memo, the minute-bar
validation and replacement slices are the only material data cost.

## Governance And Next Gate

These eight isolated transitions cannot be appended to the current governed
calendar as if the intervening quarterly chain had also been certified. The
same proposed Databento-date policy also differs from some already repaired
2023–2025 boundaries. A write limited to these eight windows would therefore
mix two historical authorities and make the calendar misdescribe untouched
data.

The first two gates are complete. The full mapping contains 65 transitions;
20 have exact local/calendar evidence and all 20 differ from the session-
aligned Databento boundary. The other 45 local seams remain diagnostic until
raw attribution. See `V7_NQ_DATABENTO_FULL_CHAIN_DIFF.md` and
`v7-nq-databento-full-chain-diff.json`.

Before any repair:

1. explicitly decide whether the Databento-date rule supersedes the existing
   historical two-session rule for the entire governed range;
2. if approved, raw-audit the remaining 45 transitions under the documented
   cost ceiling;
3. produce one versioned, contiguous calendar/repair manifest and require a
   fresh fingerprint-matching Preview before any write.

Until that decision, the eight intervals above are candidate evidence only.
The authoritative database remains unchanged at 12,651,020 total rows,
6,158,777 NQ rows, and zero duplicate NQ timestamps.
