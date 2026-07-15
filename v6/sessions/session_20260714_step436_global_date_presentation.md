# Step 436 - Global Date Presentation

Date: 2026-07-14

## Outcome

V6 now displays a full global-Settings-controlled date and time on the native
crosshair time label. The default output is `Tue 2026/07/14 22:26`.

## Changes

- Settings schema v9 adds `dateFormat` and `showDayOfWeek` with v1-v8 migration.
- Four formats are supported: `YYYY/MM/DD`, `YYYY-MM-DD`, `DD/MM/YYYY`, and
  `MM/DD/YYYY`.
- Exchange/New York, UTC, Local, and 12/24-hour presentation share the existing
  time domain and remain independent preferences.
- Lightweight Charts `localization.timeFormatter` renders the full crosshair
  label; `timeScale.tickMarkFormatter` deliberately remains compact.
- Settings draft preview, Cancel, Reset, Ok, persistence, and multi-pane
  application continue through the existing Settings/Chart Surface bridge.
- Go-to inputs remain canonical time-only values.

## Commits

- `5ec41b8b docs(v6): define global date presentation`
- `da06e0b6 feat(v6): extend global date presentation domain`
- `cea0c07f feat(v6): show full date on crosshair labels`

## Automated Evidence

- time domain covers four formats, weekday visibility, 12/24-hour mode, and
  Exchange-to-UTC date rollover;
- schema v8 migration defaults to `yyyy/mm/dd` and weekday visible;
- Settings model, durability, persistence browser, and panel browser pass;
- chart option smoke proves crosshair full date-time and compact axis labels use
  separate official formatter hooks;
- browser preview and Cancel restoration pass;
- blank-area scaffold browser smoke confirms no fake OHLC appears;
- boundary smoke passes;
- static architecture audit passes `124/124`;
- `git diff --check` passes.

## Remaining Human Gate

On Windows, visually check the four date formats with weekday on/off and both
12/24-hour modes. Spot-check Exchange/New York and UTC around a date rollover,
then confirm axis ticks remain compact and crosshair over blank chart space does
not display fake OHLC.
