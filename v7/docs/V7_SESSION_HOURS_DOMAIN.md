# V7 Session Hours Domain

Status: R5.2 pure domain complete (2026-07-20)

## Ownership

`core.session-hours-domain` owns pure interpretation of versioned weekly
Session Hours and verified date exceptions. It evaluates bar-open eligibility
and resolves visible-through/next/previous values only from caller-supplied,
strictly ordered source epochs.

It owns no Replay cursor, provider I/O, Bar Data cache, chart mutation, UI,
workspace transaction, persistence, pane layout, or instrument selection.
Missing source bars are never synthesized and never reclassified as a market
closure.

## Verified Source Timestamp Contract

The existing NQ/ES source stores naive New York/exchange wall-clock labels in a
DuckDB `TIMESTAMP`. The V4 adapter exposes them with
`replace(tzinfo=timezone.utc).timestamp()`: the epoch is therefore a UTC-like
transport encoding of the wall label, not a real UTC instant.

R5.2 read-only probes verified, for both NQ and ES:

- `2026-06-01 09:29`, `09:30`, and `09:31` map to adjacent epochs whose UTC
  fields remain exactly `09:29`, `09:30`, and `09:31`;
- ordinary weekdays contain `00:00–16:59` and `18:00–23:59`, with no hour-17
  bars;
- Friday ends at `16:59`, Saturday is absent, and Sunday resumes at `18:00`;
- the same encoded `18:00` reopen remains before and after US DST changes.

Consequently, the domain decodes only UTC date/hour/minute fields. Applying
`America/New_York` conversion again would shift the already-local label and is
forbidden.

## Calendar Facts And Revision Policy

The normal CME equity-index fixture is:

- ETH: Sunday `18:00–24:00`; Monday–Thursday `00:00–17:00` and
  `18:00–24:00`; Friday `00:00–17:00`; Saturday closed;
- RTH product view: Monday–Friday `09:30–16:15`;
- every interval is half-open and eligibility is decided from the bar-open
  minute.

CME's official contract information describes Sunday 18:00 through Friday
17:00 ET with a daily 17:00–18:00 maintenance break. CME also publishes
year-specific holiday schedules and warns that schedules are subject to
change. Production exception data must therefore carry a calendar revision,
retrieval date, source URL, and verification state rather than being hidden in
code. See [CME Group Holiday and Trading Hours](https://www.cmegroup.com/trading-hours.html).

Only a `verified` exception may replace intervals. A `source-unavailable`
record is diagnostic: it retains the normal schedule instead of guessing that
the market was closed. The R5.2 test calendar includes source-backed Good
Friday and Juneteenth early-close examples; it is conformance evidence, not a
complete production holiday dataset.

## Public Contract

- `createSessionHoursCalendar` validates and deeply freezes one schema-versioned
  weekly schedule plus date exceptions for registered instruments.
- `evaluateSessionHours` returns eligibility and calendar/exception provenance.
- `createSessionHoursPolicy` creates the exact frozen deterministic policy port
  already consumed by Projection Domain.
- `resolveVisibleThrough` returns the latest actually present eligible epoch
  below an exclusive cursor.
- `resolveEligibleTraversal` returns the next or previous actually present
  eligible source epoch, or `null`; it never manufactures an interval bar.
- `decodeExchangeWallClock` exposes the explicit UTC-like wall-label decoder.

Changing ETH/RTH mode later must retain the shared Replay cursor, recompute the
mode-specific visible-through value, and route the complete replacement through
one workspace transaction. This domain supplies the pure calculations only.

## Gate

`tests/session-hours-domain-harness.js` covers NQ and ES, all normal boundary
minutes, maintenance/weekend closure, DST invariance, verified holiday and
early-close overrides, unavailable-source behavior, exclusive visible-through,
eligible next/previous traversal, immutable Projection-compatible policy shape,
and 16 negative controls.
