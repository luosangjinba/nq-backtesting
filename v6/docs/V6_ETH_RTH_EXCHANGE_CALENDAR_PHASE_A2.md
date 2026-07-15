# V6 ETH/RTH Phase A2 — Exchange Calendar Contract

Status: accepted (2026-07-15)

## Scope

This step fixes the normal NQ/ES ETH/RTH eligibility schedule and the ownership
of exceptional days. It uses the exchange-wall-clock representation accepted
in Phase A1 and does not implement runtime filtering.

## Sources And Precedence

Authoritative/relevant sources reviewed:

1. CME Group Holiday and Trading Hours:
   `https://www.cmegroup.com/trading-hours.html`
2. CME E-mini S&P 500 product overview and Equity Index trading-hours material.
3. TradingView's CME futures ETH/RTH support definition:
   `https://www.tradingview.com/support/solutions/43000670909-regular-and-electronic-trading-hours-for-cme-futures/`
4. Lightweight Charts time-scale documentation:
   `https://tradingview.github.io/lightweight-charts/docs/time-scale`

CME is authoritative for when the market can trade and for holiday exceptions.
The TradingView definition is the selected chart-product precedent for the
reduced RTH display interval. The supplied FXReplay screenshots are the visual
behavior reference.

## Normal ETH Schedule

For NQ and ES, in the stored New York/exchange wall-clock axis:

- opens Sunday at `18:00` ET;
- eligible bar opens are in `[18:00 previous calendar day, 17:00 trading day)`;
- daily maintenance is `[17:00, 18:00)` ET;
- closes Friday at `17:00` ET;
- Saturday is closed.

Equivalently, CME publishes `17:00–16:00 CT` with a daily `16:00–17:00 CT`
maintenance period. New York and Chicago observe the same U.S. DST transition
dates, so the one-hour relationship is stable for this product scope.

ETH mode accepts every returned NQ/ES source bar that belongs to the exchange
schedule/exception record. It does not create bars during maintenance or other
source gaps.

## Normal RTH Schedule

V6 selects the reduced CME futures chart session used by TradingView:

- eligible bar opens are in `[09:30, 16:15)` ET;
- equivalent published interval: `[08:30, 15:15)` CT;
- ordinary eligible `1m` bars therefore run from `09:30` through `16:14` ET;
- only Monday-Friday trading dates are eligible;
- RTH is a data projection, not an independent market or Replay Session.

This deliberately differs from the U.S. cash-equity `09:30–16:00 ET` shorthand.
It also avoids treating CME material describing post-close/settlement handling
as the reduced chart-session definition.

## Boundary Convention

All sessions use half-open bar-open intervals:

- start is inclusive;
- end is exclusive;
- eligibility is based on the source bar's open timestamp;
- a higher-timeframe candle is eligible only as an aggregate of eligible source
  bars, not by checking its final timestamp against the interval.

Examples:

| Wall-clock bar open | ETH | RTH |
| --- | --- | --- |
| Sunday `18:00` | eligible | excluded |
| Weekday `09:29` | eligible | excluded |
| Weekday `09:30` | eligible | eligible |
| Weekday `16:14` | eligible | eligible |
| Weekday `16:15` | eligible | excluded |
| Weekday `16:59` | eligible | excluded |
| Weekday `17:00` | excluded | excluded |

## DST Contract

The source chart axis already stores New York wall-clock labels. Session Hours
eligibility uses the timestamp's UTC getters as those wall-clock fields and
does not run `America/New_York` conversion.

Therefore the visible ETH/RTH wall-clock boundaries stay fixed across DST. DST
tests must prove that the Sunday reopen and weekday RTH boundaries do not shift
by an hour in March or November.

## Holiday And Exceptional-Day Contract

CME states that holiday schedules are subject to change and are usually
finalized approximately two weeks before the holiday. Static weekday logic is
therefore insufficient.

The future Session Calendar owner must support versioned exception records:

- `closed`: no eligible bars for the affected interval/trading date;
- `lateOpen`: eligibility begins after the normal start;
- `earlyClose`: eligibility ends before the normal end;
- `extendedTradeDate`: multiple calendar spans may belong to one official
  trading date;
- `sourceUnavailable`: a known data-quality condition, distinct from an
  exchange closure.

Rules:

1. CME-published exception records override the normal weekly schedule.
2. Exception metadata records source URL/publication or retrieval date.
3. Historical source absence is never filled with synthetic bars.
4. Source absence alone does not silently create a permanent holiday rule.
5. If exception metadata is unavailable, returned source bars may still be
   filtered by the normal schedule, but the calendar status is reported as
   `unverified`, not guessed.
6. Updating a future holiday record must be possible without changing Replay,
   Chart Data, or shell code.

The 2026 CME calendar includes New Year's, MLK Day, Presidents Day, Good
Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving,
Christmas, and the following New Year period. The exact product-level hours
remain data records rather than constants in the domain function.

## Lightweight Charts Capability Decision

Lightweight Charts maps supplied time points to a logical time scale and offers
visible-range controls. It does not own CME subsessions or transform ETH bars
into RTH bars.

V6 must provide the eligible/re-aggregated series through Chart Data. Omitting
ineligible timestamps naturally creates the compressed/discontinuous session
presentation seen in the FXReplay reference. CSS hiding is not an accepted
implementation.

## Accepted Invariants

1. ETH normal eligibility is `[18:00 previous day, 17:00)` ET with Friday close
   and Sunday reopen.
2. RTH normal eligibility is `[09:30, 16:15)` ET on eligible weekdays.
3. Eligibility uses half-open source-bar-open timestamps.
4. Wall-clock boundaries do not shift across DST in the stored axis.
5. Versioned CME exception records override normal weekly rules.
6. Missing bars are never synthesized and missing data is not silently called a
   holiday.
7. Lightweight Charts receives already eligible/projected bars.

## Next Step

ETH/RTH Phase A3 — define shared Replay cursor behavior, switching outside RTH,
Next/Previous/Play/Restart/Go-to traversal, timeframe aggregation, cache
identity, persistence, and provenance.
