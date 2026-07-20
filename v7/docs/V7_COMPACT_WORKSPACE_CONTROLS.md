# V7 Compact Workspace Controls

## Outcome

R5.5 connects compact `1m`/`5m`/`15m`/`1h` and `ETH`/`RTH` controls to the
registered atomic replacement path in the real one-pane Lightweight Charts
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
- cache-hit refresh uses a small toolbar status and never covers the accepted
  chart with a centered message;
- a failed replacement restores the accepted control state and leaves the last
  chart visible with a bounded inline error.

## Foundation Scope

The visible slice remains NQ and a deterministic local one-minute source. The
capability catalog registers four timeframes crossed with ETH/RTH. The adapter
converts real instants to New York exchange wall-clock labels before invoking
the R5.2 calendar policy; chart timestamps themselves remain unchanged.

This step does not add multi-pane, a real market-data provider, persistence,
Auto Replay, Previous, Restart, or Go-to.

## Evidence

The real-Chrome harness proves compact controls, `1m` to `5m` projection,
ETH to RTH replacement, cursor retention, accepted-state UI synchronization,
no centered refresh overlay, manual-wall preservation, and Reset View. The
fixed `1440x900` visual fixture was intentionally updated for the controls.

The R5.5 review found and corrected two boundary defects: chart timestamps now
use the same browser-local clock convention as Session cards, and Manual Next
uses the active calendar policy to reveal the next eligible source minute
across ETH/RTH maintenance or weekend gaps. The exact reported Friday
2026-05-01 12:40 through Monday 2026-05-11 12:40 Session is the browser
regression fixture; its first Next visibly reveals the Sunday ETH reopen.

The review also exposed an ambiguous presentation: the chart's last visible
bar was being compared to the Session end boundary. The workspace now displays
Session range, Replay cursor, and source visible-through as three explicit
values. Session end remains the Replay limit; it does not reveal future bars.

Human acceptance remains required before R6 selection or implementation.
