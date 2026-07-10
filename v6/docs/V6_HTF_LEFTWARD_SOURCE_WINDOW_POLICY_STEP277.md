# V6 Step 277 - HTF Leftward Source Window Policy

Date: 2026-07-10

## Decision

Step 277 accepts an adaptive source-window policy for high-timeframe leftward
history extension.

The previous session-aware leftward fix made `4h`, `8h`, `12h`, `1D`, `1W`,
and `1M` able to extend leftward, but the source request remained capped near
the old low-timeframe window size. That made high-timeframe charts visibly load
older candles in small batches.

## Policy

Chart-history owns the leftward source-window policy. Bar-data still owns
request normalization, fetching, caching, and response filtering.

The policy keeps low-minute timeframes lightweight and scales higher
timeframes by the number of source bars needed to build a useful batch of
display candles:

- below `1h`: keep the lightweight bounded behavior;
- `1h` through `12h`: target roughly 20 display candles per leftward request;
- `1D`: target roughly 12 display candles per leftward request, capped below
  the global source-window hard limit;
- `1W` and `1M`: allow larger requests, capped by the global source-window
  hard limit.

The hard limit exists because Lightweight Charts historical prepends replace
series data, and the official API documents `barsInLogicalRange` as a way to
trigger historical downloads while scrolling. Larger source windows reduce
visible batch gaps, but they also increase fetch, projection, cache, and series
replacement work.

## Owner Boundaries

- Chart-history owns deciding how much source data a leftward request should
  ask for.
- Bar-data owns enforcing request limits and caching bounded source windows.
- Chart-data projection owns turning source bars into display bars.
- Chart-engine/chart-surface own rendering and visible logical range.
- Replay remains independent of leftward history extension.

## Verification

- `node v6/tests/leftward-source-window-policy-step277-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/session-aware-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Non-Goals

- Do not change replay cursor movement, no-bar gap skipping, auto-play
  scheduling, chart viewport intent, chart-engine behavior, or chart-data
  ownership.
- Do not add seconds, custom intervals, indicators, order tickets, journal
  workflows, prop-firm rules, or SMC/ICT overlays.
