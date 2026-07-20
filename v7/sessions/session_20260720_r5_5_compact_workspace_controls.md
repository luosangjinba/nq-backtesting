# V7 R5.5 Compact Workspace Controls — 2026-07-20

## Outcome

Implemented the browser-visible timeframe and Session Hours slice over the R5.4
atomic replacement runtime. The step is stopped at its required human review
gate.

## Delivered

- one grouped fixed minute/hour TF dropdown and compact ETH/RTH controls;
- registered NQ capability cross-product with fixed-duration projection and
  exchange-aware eligibility;
- accepted Workspace snapshot as the only active-control truth;
- Replay cursor retention and manual-wall preservation across replacements;
- inline refresh/error feedback without covering the accepted chart;
- updated deterministic `1440x900` visual fixture.

The first review exposed mixed clock presentation and an apparently inert Next
at the Friday ETH close. The corrective pass formats chart/cursor timestamps in
the browser-local clock used by Session cards, plans Next against the active
ETH/RTH eligibility policy, and expands only the bounded source window needed
to reveal the next eligible minute. It does not load the complete Session.

The follow-up audit against V6 found the attempted entry fix was directionally
wrong. Entry now loads 120 minutes before the selected start, reveals the start
bar as the first Replay bar, and hides every later bar until Next bar. The
default wall is restored to 80 visible bars with a 12-bar right offset.

The desktop controls now share one row and timeframe uses one grouped dropdown.
The fixed minute/hour V6 set is enabled; `1D`/`1W`/`1M` remain disabled until
session-aware aggregation exists. Manual browsing may move the latest bar
offscreen and repeatedly loads bounded older windows at the left boundary
without advancing Replay.

A later visual review rejected the grid-like TF panel and the mechanical
single-direction foundation candles. The TF surface is now a high-contrast
single-column dropdown with its own open-state fixture. Foundation OHLC uses a
request-independent multi-scale price function, controlled wicks, and a
directional-run regression while retaining exact quarter-tick continuity
across independently requested history windows.

## Automated Evidence

- all 33 V7 harness files pass;
- real Chrome proves prefix-plus-start entry, one-bar Next, grouped `1m` to
  `12h` menu state, `1m` to `5m` projection, ETH to RTH, retained cursor,
  preserved signed manual offset/span, repeated left extension, compact
  controls, hidden centered update overlay, and Reset View;
- the exact reported 2026-05-01 12:40–2026-05-11 12:40 Session proves initial
  visibility ends at 12:40 and the first Next reveals only 12:41;
- the visible workspace separately labels complete Session range, Replay
  cursor, and source visible-through so Session end is not mistaken for an
  already revealed candle boundary;
- architecture boundary, hardening, source quality, cache/latency, atomic race,
  and visual fixtures pass;
- `git diff --check` passes.

## Deferred

No multi-pane, real provider, persistence, expanded Replay transport, TF
favourites, custom timeframes, or day/week/month aggregation was added.

## Review Gate

Human review should inspect default composition, active-state clarity,
timeframe switching, ETH/RTH switching, manual wall retention, Reset View, and
the absence of centered update text. R6 remains blocked until acceptance.
