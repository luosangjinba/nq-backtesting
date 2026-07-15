# Step 469 Human Acceptance — Bar Replay Restart Selection

## Finding

The legacy Restart control reopened the active session at its first bar and was
enabled only after Replay ended. Human acceptance showed that the intended
behavior is FXReplay-style point selection for rewinding a few candles.

## Accepted Behavior

- Restart is available while a Replay session is loaded.
- Selection mode shows a blue vertical marker at the chart crosshair time.
- Clicking a candle removes that candle and every later candle.
- The display bucket start maps to the preceding source-timeframe cursor.
- Points at/before session start or after the revealed cursor are rejected with
  a visible error.
- Replay owns rewind and the shared replacement boundary removes future bars
  across panes; UI does not mutate Replay or chart series directly.

## Verification

- Restart runtime smoke passed, including range rejection.
- Restart browser smoke passed.
- Replay transport, keyboard, and app-shell browser smokes passed.
- Canonical passed 14/14.
- Exhaustive Node passed 413/413.
- Static architecture passed 59/59.
- `git diff --check` passed.

The first exhaustive Node runs exposed the current-ledger size assertion and
two stale playback-period gap expectations inherited from the interrupted
period-alignment work. The TODO and expectations were corrected before the
passing final run.

## Remaining Human Gate

Confirm marker feel and click targeting in real 1m and higher-timeframe usage
before declaring Step 469 human acceptance complete.
