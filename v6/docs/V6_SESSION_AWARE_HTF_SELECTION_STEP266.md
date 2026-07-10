# V6 Session-Aware Higher Timeframe Selection - Step 266

## Purpose

Step 266 selects the owner boundary and phased implementation plan for `1D`,
`1W`, and `1M` display timeframes.

This is a design/readiness step. It must not enable daily, weekly, or monthly
menu items and must not change runtime projection behavior.

## Decision

V6 should introduce a focused `session-calendar` boundary before enabling
`1D`, `1W`, or `1M`.

The `session-calendar` boundary owns trading-session bucket boundaries for
futures instruments such as NQ and ES. Chart projection may consume those
boundaries, but chart projection must not hard-code Globex, trading-day, week,
or month rules.

## Why Minute Buckets Are Not Enough

Minute and hour display timeframes can use fixed minute buckets anchored to a
session start timestamp. Daily, weekly, and monthly bars need trading-session
semantics:

- the trading day may begin at the prior Globex open instead of midnight;
- Monday sessions may need prior Sunday evening context;
- weeks must be defined by trading weeks, not browser-local calendar weeks;
- months must handle trading sessions that begin before the calendar date shown
  by the user;
- holidays, missing sessions, and partial sessions must not create synthetic
  OHLC bars.

## Ownership

- `display-timeframe` owns capability status and menu eligibility.
- `session-calendar` owns trading day/week/month bucket boundaries.
- `chart-data-projection` owns OHLC aggregation and consumes either fixed
  minute buckets or session-calendar buckets.
- `bar-data` owns source loading and cache.
- `replay` remains source-bar driven and must not advance by display bucket.
- `shell` renders capability state and dispatches commands; it must not compute
  trading-session boundaries.

## Phased Plan

### Step 267 - Session Calendar Boundary

- Add a `session-calendar` domain module.
- Start with NQ/ES regular futures semantics needed by V6:
  trading day opens at 18:00 UTC/chart-axis on the prior calendar date for
  weekday sessions where applicable.
- Provide pure helpers for:
  - trading day key;
  - trading day bucket start/end;
  - trading week key/start;
  - trading month key/start.
- Add domain smoke coverage for Monday prior Globex behavior.
- Do not enable `1D`, `1W`, or `1M`.

### Step 268 - Daily Projection

- Extend chart-data projection to consume `session-calendar` daily buckets.
- Enable `1D` only after browser and replay/path regression coverage passes.
- Keep `1W` and `1M` disabled.

### Step 269 - Weekly Projection

- Extend session-calendar/projector integration for `1W`.
- Keep `1M` disabled.

### Step 270 - Monthly Projection

- Extend session-calendar/projector integration for `1M`.

## Acceptance

- Step 266 documents the session-aware HTF owner boundary.
- `1D`, `1W`, and `1M` remain planned/disabled.
- Seconds remain hidden.
- Static smoke guards that shell and display-timeframe do not own
  session-aware aggregation.
- Later implementation starts with `session-calendar`, not UI-only enablement.
