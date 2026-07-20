# V7 Calendar Surface

Status: R2.3 shared presentation boundary (2026-07-20)

## Responsibility

`adapter.calendar-surface` owns reusable calendar/date-time presentation only:

- deterministic day, month, and decade navigation models;
- local date-time selection and minute/second value conversion;
- focus, open/close, keyboard dismissal, and control-local DOM behavior;
- the Calendar Surface DOM subtree and its scoped styles.

Consumers import only `src/calendar-surface/public.js`. The current Session
Browser supplies field names and reads selected epochs through that public
contract; it does not read or mutate calendar internals.

The module consumes the application design-token contract for color, border,
radius, and focus presentation. It does not own the global theme.

## Business-Data Boundary

Calendar Surface is deliberately business-data agnostic. It does not:

- request or cache market data;
- decide whether a date has data;
- query orders, news, Journal evidence, or campaigns;
- move a chart, Replay cursor, viewport, or Session state;
- infer a latest market-data timestamp from the wall clock.

There is no market-coverage, order-marker, news-marker, or chart-navigation port
in R2.3. If a later reviewed product decision needs decorated days or chart
navigation, the owning feature will provide a read-only presentation model and
receive explicit selection intent. That future contract is not specified or
implemented by this step.

## Naming Boundary

Calendar Surface is a UI module. The architecture's `TradingCalendar`
capability is a separate future domain contract for exchange timezone, session
eligibility, and aggregation alignment. Neither may import or control the
other's internals merely because both use calendar dates.

## Current Conformance

- one public facade and no consumer import of model/DOM internals;
- deterministic 42-cell month grids and ten-year pages;
- invalid dates, epochs, and precision modes fail explicitly;
- independent Node harness plus fixed Chrome visual regression;
- no bars, providers, Replay, panes, charts, coverage, orders, or news.

The module is independently testable and replaceable. It is marked non-removable
in the current composition because Session creation requires one date-time
implementation; this does not make Session Browser its owner.
