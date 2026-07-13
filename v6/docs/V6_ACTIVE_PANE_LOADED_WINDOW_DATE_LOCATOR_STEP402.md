# Step 402 - Active-Pane Loaded-Window Date Locator

Status: completed.

## Outcome

The workstation right rail now exposes one real Go-to control for UTC date/time
input. It resolves the nearest existing bar in the active pane's current Chart
Data record and centers a manual logical viewport around that bar.

The implementation uses one timeframe-independent path. It operates on the
active pane's already-materialized bars, so `1m`, intraday target periods, and
session-calendar periods do not receive separate locator logic.

## Ownership

- Shell validates UTC `datetime-local` input and dispatches one locator command.
- `LoadedWindowDateLocatorRuntime` selects the active pane and reads Chart Data
  and Chart Viewport through public commands.
- The pure locator domain performs ordered-timeline validation, binary nearest-
  bar selection, earlier-bar tie breaking, and logical-range measurement.
- Chart Viewport remains the sole durable viewport-intent owner and Chart
  Surface remains the only writer to Lightweight Charts.

The locator does not import Bar Data, Replay, or the chart adapter.

## Behavior and rejection policy

- A loaded-window hit promotes only the active pane to manual viewport intent.
- A request between real bars selects the nearest real bar; an equal-distance
  tie selects the earlier bar.
- A request before or after the loaded bounds is rejected with the current
  loaded interval and performs no viewport write.
- Empty Chart Data and an unavailable active viewport are explicit rejections.
- This step does not fetch missing data, preload a session range, change replay
  cursor/reveal state, or mutate source bars.

## Regression evidence

The browser gate proves:

- the visible right-rail form opens and submits;
- the secondary active pane receives the exact manual logical projection while
  the main pane's viewport record is unchanged;
- the chart surface applies the selected range;
- outside-window input is visibly rejected and preserves the prior viewport;
- browser fetch count remains zero;
- Bar Data cache, Replay state, and Chart Data source bars are byte-for-byte
  unchanged.

Verification commands:

- `node v6/tests/loaded-window-date-locator-domain-step402-smoke.js`
- `node v6/tests/loaded-window-date-locator-runtime-step402-smoke.js`
- `node v6/tests/loaded-window-date-locator-input-step402-smoke.js`
- `node v6/tests/loaded-window-date-locator-browser-step402-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `git diff --check`

## Next recommendation

Step 403 should be a short human visual acceptance pass for control readability,
active-pane centering, and outside-window feedback on representative `1m`, `4h`,
`1D`, `1W`, and `1M` panes. After it passes, perform a foundation closeout and
decide from observed workflow friction whether bounded missing-window loading is
actually needed; do not assume it in advance.
