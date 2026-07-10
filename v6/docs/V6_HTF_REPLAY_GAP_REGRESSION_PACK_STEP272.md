# V6 HTF Replay Gap Regression Pack - Step 272

## Purpose

Step 272 adds a regression pack for replay gaps after `1D`, `1W`, and `1M`
session-aware display projection became enabled.

The replay cursor must remain source-bar driven. Higher-timeframe projection
may change rendered chart bars, but manual next and auto-play must continue to
advance by available source bars across no-bar gaps such as `16:59 -> 18:00`.

## Scope

- Add HTF manual-next regression coverage for `1D`, `1W`, and `1M`.
- Add HTF auto-play regression coverage for `1D`, `1W`, and `1M`.
- Reuse existing chart-entry/manual-next and auto-play runtimes.
- Assert replay cursor/revealed state advances to source bar times, not HTF
  bucket start times.
- Assert chart-data projection receives source-bar payloads before rendering HTF
  chart bars.

## Non-Goals

- Do not change replay cursor ownership.
- Do not change chart-data projection behavior.
- Do not change chart-engine or viewport ownership.
- Do not add seconds, journal, order-ticket, prop-firm, or indicator behavior.

## Acceptance

- Manual next crosses a `16:59 -> 18:00` no-bar gap under `1D`, `1W`, and `1M`.
- Auto-play crosses the same gap under `1D`, `1W`, and `1M` and continues to the
  next post-gap source bar.
- The regression pack proves replay state uses source cursor times and indices.
- The regression pack proves HTF projection receives the post-gap source bar
  and replay state stays aligned to source-bar cursor times.
- Existing session-gap, projection, pane, and boundary smokes continue to pass.
