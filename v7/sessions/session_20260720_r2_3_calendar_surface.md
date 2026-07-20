# V7 R2.3 Shared Calendar Surface — 2026-07-20

## Trigger

R2.2 passed interaction and visual review. The accepted date-time picker is
expected to serve more than one future surface, but later product behavior for
coverage, chart navigation, orders, and news is not yet decided.

## Boundary Decision

Extract the existing picker, pure calendar model, DOM primitives, and styles
into `adapter.calendar-surface`. Session Browser imports only its public facade.
This is an ownership refactor: the accepted Session creation behavior and fixed
screenshots must remain unchanged.

Calendar Surface owns presentation, navigation, selection, and focus only. It
does not request bars, define availability, query feature data, move charts or
Replay, or own Session state. R2.3 intentionally creates no speculative data,
decoration, or chart-navigation port. The future `TradingCalendar` capability
for exchange-session rules remains a separate domain boundary.

## Automated Gate

Passed before commit: Calendar Surface negative-control harness, all five
unchanged real-Chrome visual fixtures, all 16 V7 harnesses, and
`git diff --check`.

## Human Review

Pending after commit. Confirm the Create Session Start/End controls retain the
accepted appearance and day/month/year/time interactions. Automated evidence
cannot accept R2.3.
