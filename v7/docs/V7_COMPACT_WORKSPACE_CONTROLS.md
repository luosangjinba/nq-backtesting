# V7 Compact Workspace Controls

## Outcome

R5.5 connects one compact grouped timeframe menu and an `ETH`/`RTH` selector to
the registered atomic replacement path in the real one-pane Lightweight Charts
workspace. This is an implemented browser-visible slice awaiting human visual
and interaction acceptance.

## Interaction And Ownership

- timeframe is pane-local; Session Hours is Session-scoped;
- the UI dispatches a requested target and only the accepted Workspace
  snapshot writes the active control state back;
- replacement retains the sole Replay source cursor and advances its accepted
  revision only after the new chart is visibly complete;
- ETH/RTH eligibility runs before fixed-duration aggregation;
- native manual-wall origin, offset, and span survive timeframe, Session Hours,
  and Manual Next replacement; Reset View alone restores the default wall;
- cache-hit Next and replacement show no transient status or dimming;
- a replacement still pending after 500 ms subtly dims the accepted chart
  without text, layout movement, or a centered message;
- a failed replacement restores the accepted control state and leaves the last
  chart visible with a bounded inline error.
- the toolbar keeps Session, instrument, timeframe, ETH/RTH, Reset, and Next bar
  on one desktop row;
- no separate feed/wall/cursor metadata strip consumes Canvas height; those
  runtime values remain internal or in the existing bottom Session/progress
  evidence where applicable;
- only one current-timeframe trigger is shown by default; unimplemented
  timeframe favourites are not simulated.
- the trigger opens a conventional single-column dropdown with high-contrast
  text, full-row selection, group separators, and no wrapped interval labels.

## Foundation Scope

The visible slice remains NQ and now uses the real local V4/DuckDB one-minute source. The
capability catalog registers V6's fixed minute/hour set (`1m` through `12h`)
crossed with ETH/RTH. Calendar `1D`/`1W`/`1M` entries remain visibly disabled
until their session-aware aggregation owner is migrated. The adapter
converts real instants to New York exchange wall-clock labels before invoking
the R5.2 calendar policy; chart timestamps themselves remain unchanged.

This step does not add multi-pane, persistence,
Auto Replay, Previous, Restart, or Go-to.

## Evidence

The real-Chrome harness proves compact controls, `1m` to `5m` projection,
ETH to RTH replacement, cursor retention, accepted-state UI synchronization,
no centered refresh overlay, manual-wall preservation, and Reset View. The
fixed `1440x900` ready-state and open-timeframe-menu visual fixtures are
intentional regression gates.

The R5.5 review found and corrected two boundary defects: chart timestamps now
use the same browser-local clock convention as Session cards, and Manual Next
uses the active calendar policy to reveal the next eligible source minute
across ETH/RTH maintenance or weekend gaps. The exact reported Friday
2026-05-01 12:40 through Monday 2026-05-11 12:40 Session is the browser
regression fixture; its first Next reveals only Friday 12:41. A separate domain
fixture proves Friday-close Next traverses to the Sunday ETH reopen.

The review also exposed an ambiguous presentation: the chart's last visible
bar was being compared to the Session end boundary. The workspace now displays
Session range, Replay cursor, and source visible-through as three explicit
values. Session end remains the Replay limit; it does not reveal future bars.

A follow-up audit against the actual V6 chart-entry chain replaced the incorrect
forward-context behavior. Entry now requests a 120-minute historical prefix and
reveals only the selected start bar; all later bars stay hidden until Next bar.
The default viewport uses the V6 baseline of 80 visible bars and 12 right-offset
bars.

Dragging to the loaded left boundary requests a bounded 2,500-source-minute
older window. Older batches prepend without moving Replay or changing the
accepted no-future boundary. The browser gate proves a second boundary visit
loads a second older window, so the interaction can continue leftward.

R5.6 supersedes the temporary synthetic source described by the original R5.5
implementation. Human acceptance remains required before R6 selection or implementation.
