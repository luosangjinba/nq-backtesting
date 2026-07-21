# Session — R5.6d Delayed Refresh Feedback

Date: 2026-07-20
Status: implemented; included in the combined R5.6 human interaction/visual gate

## Outcome

Cache-hit Next, timeframe replacement, and Session Hours replacement no longer
enter a visible stale state or render `Updating…`. Controls are disabled while
the existing transaction is pending, but the last accepted chart and toolbar
remain visually stable.

The Replay Workspace UI owns one 500 ms delayed feedback controller. Only a TF
or Session Hours replacement still pending at that point enters `stale`; the
chart opacity changes subtly while all accepted candles remain present. The
controller owns only its timer and DOM-state request. It does not delay work,
classify cache, request bars, mutate Replay, or publish acceptance.

## Evidence

- fake-clock control proves fast work schedules no visual state;
- delayed work enters stale exactly at 500 ms and cancellation prevents late
  dimming;
- real Chrome proves cache-hit Next and TF replacement keep status hidden and
  remain within latency budgets;
- error behavior, accepted chart retention, manual wall, atomic replacement,
  and the 100-sample cadence remain green;
- full V7 Harness suite and `git diff --check` before commit.

R5.6e next changes only successful Create Session navigation to the newly
created chart route.
