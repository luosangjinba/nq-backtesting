# FXReplay Baseline

## Purpose

V6 should start with an FXReplay-like replay mechanism, not grow into it after
several internal-only milestones.

"FXReplay-like" means the first usable chart experience behaves like a replay
workstation:

- the chart is the primary surface;
- replay controls are always available and low-friction;
- new candles appear immediately and predictably;
- default and manual walls behave the same way;
- drag/zoom interactions feel native;
- status is compact and read-only;
- controls do not steal chart space.

## Baseline Behavior

V6's first chart milestone should include:

- session-first replay entry;
- initial prefix context plus start bar;
- latest replay candle anchored on the default wall;
- Play/Next pushing older candles left from the active wall;
- native drag/wheel creating a temporary wall;
- floating replay transport with Play/Pause/Next/speed;
- compact chart header with timeframe, Layout placeholder, Settings
  placeholder, and session navigation;
- read-only footer/status line with start, cursor, end, revealed count,
  playback state, and latest OHLC;
- visible latency gates for Next/Play;
- no future bars before reveal.

## Non-Negotiable Interaction Rules

- User-visible candle movement is the product truth.
- Replay control actions must dispatch runtime commands.
- Drag/zoom must use the chart engine's native interaction where available.
- Reset/follow is explicit; Play/Next must not silently resume default wall
  after manual wall creation.
- The first pane uses the same pane model as future panes.
- UI polish must not bypass runtime ownership.

## Visual Baseline

Build a functional workstation screen first, not a landing page.

Required on first usable V6 chart route:

- full-height chart workspace;
- compact top chrome;
- floating transport near bottom center;
- visible active instrument/timeframe/OHLC;
- chart surface large enough for manual visual testing;
- no explanatory marketing text inside the app.

## Deferred

- full Settings parity;
- multi-pane UI beyond a placeholder until pane-model gates pass;
- journal/orders/analytics;
- persistence beyond minimal local session state.

## Required Tests

- browser screenshot smoke for first chart route layout;
- Next visible latency smoke;
- Play cadence smoke;
- default wall behavior smoke;
- manual wall behavior smoke;
- no-future initial load smoke.
