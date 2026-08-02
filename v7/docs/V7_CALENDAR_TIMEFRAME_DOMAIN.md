# V7 Calendar-Timeframe Domain

Status: R8.13 registered re-derivation human accepted through R8.15 (2026-07-31)

## Ownership

`core.calendar-timeframe-domain` is a pure Projection-owned policy module. It
groups already eligible, ordered source bars into immutable trading-day,
trading-week, or trading-month OHLCV bars. It performs no provider I/O, cache
mutation, Replay mutation, Workspace commit, chart write, viewport change,
persistence, DOM work, or UI selection.

The UI registers and selects the capability. Session Hours filters source bars
before aggregation. Projection enforces the exclusive no-future cutoff and
invokes the registered policy. Bar Data alone acquires raw and compact
projected history. Chart Runtime remains the sole series writer.

## Ecosystem Decision

Lightweight Charts accepts timestamps or business-day values but does not
aggregate source OHLC data. It also has no native timezone support; applications
must preprocess timestamps. See the official
[Time type](https://tradingview.github.io/lightweight-charts/docs/api/type-aliases/Time)
and [time-zone guide](https://tradingview.github.io/lightweight-charts/docs/time-zones).
The official
[awesome-tradingview catalogue](https://github.com/tradingview/awesome-tradingview)
does not provide a session-aware, Replay-safe source-to-calendar OHLC owner.
Calendar aggregation therefore remains a registered V7 domain policy rather
than chart or route behavior.

## Alignment Contract

Every policy declares an opaque aggregation id/revision, calendar alignment
id, period (`day`, `week`, or `month`), source duration, Session Hours mode,
session start minute, exchange-wall/instant converters, and an eligibility
predicate. No core branch depends on a concrete timeframe id.

For the foundation CME schedule:

- ETH source minutes at or after `18:00` roll to the next trading date; a daily
  bucket begins at the prior calendar day's `18:00` and completes at the last
  eligible minute before the next trading day;
- RTH uses the same calendar date and begins at `09:30`;
- trading weeks begin on Monday's trading date, which means Sunday `18:00` for
  ETH and Monday `09:30` for RTH;
- trading months use the first trading-date label in the calendar month, with
  the same ETH/RTH session-start convention;
- holidays are represented only by absent source bars under the current
  revision. R7.3n does not claim a production-complete CME holiday calendar.

`startEpochMs` is the canonical real-instant period identity.
`displayEpochMs` is the last eligible source-minute slot before the next
period. A partial current period keeps that stable completion slot, matching
fixed-timeframe display placement without moving Replay or admitting future
source bars.

Each projected calendar bar also carries a validated `labelDate`. It is the
trading date for a daily bucket and the trading-period start date for a weekly
or monthly bucket. It is deliberately not derived from `startEpochMs`: an ETH
Monday bucket begins on Sunday evening as a real instant but must still be
labelled Monday. The Chart adapter resolves an exact completion coordinate to
this date and renders date-only Crosshair/time-axis text; Workstation display
timezone and hour format cannot shift it to the prior date or add a clock.

## History And Replay Contract

Initial and replacement materialization always requests compact projected
calendar history before the authoritative raw tail and merges both before one
visible Workspace commit. The request identity includes alignment kind and
policy id in addition to timeframe, ETH/RTH mode, calendar/aggregation
revisions, provider/dataset, and exact window. This prevents fixed/calendar or
day/week/month cache aliasing.

The compact prefix is chart context only. It never enters Replay raw traversal
or becomes alternative source evidence. Calendar display selection deliberately
does not invent a fixed Replay-step duration—especially for months—so the
existing fixed Replay step remains independently owned when Interval Sync is
active.

## Gate

- `tests/calendar-timeframe-domain-harness.js` proves day/week/month alignment,
  ETH rollover, trading-period label dates, immutable OHLCV output,
  partial-period completion placement, Projection integration, and five
  negative controls.
- `tests/projected-history-real-api-browser-harness.js` proves API results equal
  frontend source-`1m` projection for day/week/month × ETH/RTH across DST.
- `tests/calendar-timeframe-browser-harness.js` proves the three controls are
  enabled and that each switch arrives with useful left history without a
  mouse/wheel boundary event, preserves Replay, and survives premarket RTH.

The user explicitly accepted the hard-reloaded `1D`/`1W`/`1M` interaction and
filled-left-context result through the binding R8.15 gate on 2026-07-31.

R8.13 replaces the original mixed foundation registry with separate versioned
fixed/calendar contributions and a policy-family-agnostic registry. Calendar
alignment remains owned by this module; Projection, UI, Chart, Replay, Bar
Data, and V4 owners gained no concrete calendar branch. See
`V7_CALENDAR_CAPABILITY_RTH_LOCATE_REDERIVATION_R8_13.md`.
