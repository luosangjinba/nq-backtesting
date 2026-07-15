# V6 Global Date Presentation - Step 436

Date: 2026-07-14

## Decision

V6 extends the existing global time-presentation owner instead of creating a
crosshair-only formatter. Settings adds:

- `dateFormat`: `yyyy/mm/dd`, `yyyy-mm-dd`, `dd/mm/yyyy`, or `mm/dd/yyyy`;
- `showDayOfWeek`: boolean.

The defaults are `yyyy/mm/dd` and `true`. The accepted crosshair label shape is
therefore `Tue 2026/07/14 22:26` in 24-hour mode. The existing global timezone
and 12/24-hour preferences remain authoritative.

## Scope

- Crosshair time labels show weekday, full date, and time.
- Time-axis tick labels stay compact and timeframe/space appropriate; they do
  not repeat the full crosshair label.
- Absolute date-time surfaces may later consume the same formatter.
- Go-to schedule inputs remain canonical time-only values and do not acquire a
  date format.

V6 intentionally does not copy TradingView's full combinatorial date-format
catalog. Two-digit years and redundant month-name/separator permutations are
excluded because they add ambiguity and testing cost without improving the
current SMC/ICT workflow.

## Ownership

- Settings runtime owns persistence, migration, validation, preview, Cancel,
  and Reset behavior.
- `time-domain/time-presentation.js` owns timezone projection and all date/time
  string construction.
- `chart-engine/time-presentation-options.js` maps shared formatters to the
  official Lightweight Charts localization and time-scale hooks.
- Chart Surface remains the only chart-options mutation path.

No UI controller, chart adapter, Replay runtime, or Go-to module may create a
second date-format preference or perform independent date arithmetic.

## Canonical Invariants

- Chart/bar/replay timestamps are unchanged.
- Exchange display continues to interpret the UTC-shaped chart timestamp as a
  New York wall clock and must not apply the host timezone twice.
- UTC and Local display first resolve that New York wall clock to an instant.
- Formatting changes must not move the Replay cursor, alter Go-to anchors, or
  change bar bucketing.

## Acceptance

- schema migration defaults old records to `yyyy/mm/dd` plus weekday visible;
- invalid formats fail through Settings validation;
- all four date formats cover Exchange, UTC, and Local projection;
- 12/24-hour format remains independent;
- Settings draft preview is immediate, Cancel restores, and Ok persists;
- multi-pane crosshair labels update atomically;
- time-axis ticks remain compact;
- blank-area crosshair contains no fake OHLC data;
- existing Go-to, Replay alignment, chart, Settings, and boundary gates pass.

## References

- Lightweight Charts `LocalizationOptions.timeFormatter` is the native
  crosshair time-label formatting hook.
- Lightweight Charts `TimeScaleOptions.tickMarkFormatter` remains the native
  axis tick formatting hook.

