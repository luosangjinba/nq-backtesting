# V7 Workstation Settings Time Presentation — R6.9m

Status: implemented, awaiting human interaction and visual review (2026-07-22)

## Product Boundary

R6.9m activates the final Workstation Settings slice frozen by R6.9f and
refined by R6.9g. It changes how canonical instants are presented; it never
changes, rounds, or re-encodes a Session bound, Replay cursor, visible cutoff,
bar timestamp, or Workspace transaction.

The global Settings wire advances from version 5 to version 6. Every accepted
Grid, Symbol, Status-line, current-price, Canvas, Crosshair, scale, margin, and
interface preference migrates unchanged. Version 6 adds:

```json
{
  "time": {
    "displayTimezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "dayOfWeekVisible": false,
    "hourFormat": "24-hour"
  }
}
```

`displayTimezone` accepts `America/New_York`, `UTC`, or `local`; `dateFormat`
accepts `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, or `MM/DD/YYYY`; weekday is a
boolean; and hour format accepts `12-hour` or `24-hour`. Browser-local resolves
the browser's IANA timezone at presentation creation. New York and local
presentations therefore follow their real DST rules rather than a fixed UTC
offset.

## One Shared Presentation Policy

`core.workstation-settings` owns one pure formatter policy. Consumers receive
the immutable Settings value and canonical epoch milliseconds, then derive
only text or Calendar wall controls:

- Lightweight Charts uses the official `localization.timeFormatter` and
  `timeScale.tickMarkFormatter` option ports for Crosshair and time-axis text;
- Replay Workspace uses the same policy for Session range, visible-through,
  cursor, and range-end feedback;
- Exact GoTo uses the selected timezone, date order, weekday, and hour format
  for its reusable Calendar control, converts the chosen visible minute back
  to one canonical epoch, and dispatches the following minute as the existing
  exclusive Replay cutoff;
- Session Browser uses the committed global policy for card and opened-Session
  time ranges.

Weekday is intentionally limited to detailed labels and Calendar summaries; it
does not add dense weekday text to every chart-axis tick. The Calendar Surface
accepts an injected date/time presentation port but owns no Workstation
Settings, Replay, market schedule, or Economic Calendar state. In 12-hour mode
its AM/PM control is explicit and toggles only the draft wall value.

R9.4 extends this policy with validated, timezone-independent calendar-date
formatting. Fixed aggregate labels still format the canonical bucket-start
instant in the selected display timezone. Calendar aggregates instead format
their trading-period `labelDate` directly: daily/weekly/monthly labels remain
date-only, honor date order and optional detailed-label weekday, and cannot
shift to an ETH prior-evening date or acquire a time component.

The official Lightweight Charts 5.2 formatter options were tested before
implementation. The awesome-tradingview catalog did not expose a smaller
ownership-compatible formatter plugin, so this slice adds no chart plugin or
dependency.

## Domain Semantics That Do Not Change

- Session creation remains explicitly entered and stored as New York wall
  time, as its form label states.
- Quick GoTo anchors and their global schedule remain New York market-time
  domain values, regardless of display timezone.
- Replay remains one canonical cursor shared by every Pane.
- Exact GoTo's customer value is the exact minute to reveal. The UI limits it
  to the final minute before Session End and translates it to the unchanged
  exclusive cutoff, so no future source bar is exposed.
- Bar data, ETH/RTH classification, aggregation completion, future whitespace
  points, and economic-event ownership are unchanged.

Changing display timezone therefore cannot reveal another candle, request
bars, move Replay, issue a Workspace transaction, rewrite series data, or
change Pane/Viewport revisions.

## Preview, Persistence, And Recovery

All four time fields participate in the accepted R6.9l live-preview boundary.
Each valid draft immediately reformats every mounted chart and Workspace
surface without writing persistence or moving the committed Settings revision.
`OK` persists the already-visible candidate. `Cancel`, close, Escape, backdrop
dismissal, Workspace disposal, or a consumer/persistence failure restores the
complete committed presentation. Future Panes, hard reload, another Session,
and Session Browser consume the same committed global record.

## Acceptance Evidence

- `tests/workstation-settings-harness.js` proves current strict version-7
  values, version-1 through version-6 migration, all enum failures, New York
  summer and winter DST, UTC, injected browser-local timezone, weekday/date/hour formats,
  and unchanged epoch input;
- `tests/lightweight-chart-adapter-browser-harness.js` proves the native
  formatter mapping changes neither series-data nor adapter revision;
- `tests/replay-pane-workspace-browser-harness.js` proves non-durable live
  preview, Cancel restoration, exact Calendar sharing, explicit AM/PM,
  zero Replay/Workspace movement, hard reload, cross-Session persistence, and
  current/future-Pane fan-out;
- `tests/session-browser-browser-harness.js` proves the Session list and opened
  detail continue to render through the global presentation without changing
  create/open/delete behavior;
- all headless Harnesses and all six real-Chrome Harnesses pass, together with
  architecture, source-quality, visual-regression, and diff checks.

Human review is required because this slice changes chart-axis/Crosshair time
text, Workspace footer text, Exact GoTo Calendar presentation, and Session
Browser date/time text.
