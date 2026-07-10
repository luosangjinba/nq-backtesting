# V6 HTF Browser Replay Gap Pack - Step 273

## Purpose

Step 273 adds browser-visible replay gap coverage for the enabled
session-aware display timeframes: `1D`, `1W`, and `1M`.

Step 272 guards the runtime contract. This step proves the real V6 page can
select each HTF, cross the `16:59 -> 18:00` no-bar gap, and continue replay
without the UI or chart state sticking to an HTF bucket timestamp.

## Scope

- Add manual-next browser coverage for `1D`, `1W`, and `1M`.
- Add auto-play browser coverage for `1D`, `1W`, and `1M`.
- Assert replay footer/runtime cursor state advances to source bar times.
- Assert chart-data projection state receives post-gap source bars in the
  current HTF bucket metadata.
- Keep the tests browser-visible and routed through existing V6 commands and
  shell controls.

## Non-Goals

- Do not change replay cursor ownership.
- Do not change chart-data projection ownership.
- Do not change chart-engine or viewport ownership.
- Do not add seconds, journal, order-ticket, prop-firm, or indicator behavior.

## Acceptance

- Manual next crosses `16:59 -> 18:00` under `1D`, `1W`, and `1M` in the browser
  and continues to `18:01`.
- Auto-play crosses `16:59 -> 18:00` under `1D`, `1W`, and `1M` in the browser
  and continues to `18:01`.
- Projection metadata for each HTF includes the final post-gap source bar.
- The browser pack reuses the existing V6 page, command bus, replay runtime,
  chart-data projection runtime, and shell surfaces.
