# V4 Manual PDA MVP Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Start the manual-first PDA workflow without full auto scanning or pre-ingestion.
- Users manually choose PDA points, then the system computes context on demand and renders the annotation.

## Completed
- Added PDA type registry for BSL/SSL/FVG/OB/NDOW/NWOG/EQH/EQL.
- Added session-scoped PDA store with add/remove/clear and objective visibility placeholders.
- Added realtime point context helper:
  - current timeframe high/low
  - intraday session high/low checks from chart wall-clock timestamps
  - Asia, London Killzone, London Close, NY Premarket, NY Open, AM Silver Bullet, NY Late Morning, Lunch, PM Open, PM Silver Bullet, Power Hour, Post-Close
  - CME Break is recognized but skipped for extrema checks
  - context data is fetched from the selected bar's full CME trading day, independent from the chart display range
- Added PDA renderer for liquidity-line annotations using `LiquidityPrimitive`.
- Added chart context menu:
  - `Mark BSL`
  - `Mark SSL`
  - `Clear PDA`
- Manual BSL/SSL right-click behavior:
  - Right-click a chart bar.
  - Choose BSL or SSL from the context menu.
  - Use that bar's high for BSL or low for SSL.
  - Add a line annotation and status text with price/time/context.
  - Add a session high/low label only when the selected bar is the extrema inside its full-trading-day session window.
- Fixed chart crosshair time labels:
  - use UTC getters for UTC-encoded wall-clock timestamps
  - prevents `2012-01-09 11:00` from displaying as local-time `03:00`
- Fixed first PDA annotation delayed rendering:
  - `LiquidityPrimitive` now requests an update on attach
  - renderer also requests update immediately after attaching a PDA primitive
- Adjusted viewport controls:
  - moved above the time axis
  - hidden by default
  - shown only when hovering the small viewport-control hot zone
- Fixed Replay On + timeframe switch viewport regression:
  - `Scroll to latest` now anchors to the chart's active series length instead of the full loaded display range
  - this prevents the current replay candle from jumping to the far left after switching timeframe
  - viewport controls remain enabled based on loaded display bars, avoiding a disabled state before `chart.setData()` refreshes active series count

## Not Yet Done
- HTF context requires exact aggregation/checks for 15m/30m/1h/4h/daily lows/highs.
- PDA context data is cached per instrument/timeframe/trading day.
- NDOW/NWOG show/hide commands.
- EQH/EQL point-set grouping.
- Rectangle PDA rendering for FVG/OB/objective ranges.
- Persistence is intentionally not implemented yet.
