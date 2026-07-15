# V6 Replay/History Manual Next Latency Repair — Step 462

Status: complete (2026-07-15)

## Trigger

Step 461's canonical closeout measured Manual Next at 219.2 ms and an isolated
rerun at 188.3 ms against the existing 160 ms Replay/leftward-history gate.
Step 462 retained the threshold and added owner-local phase timing before
changing behavior.

## Attribution

Under the canonical serial browser load, the reproduced 160.1 ms failure split
into:

- source-bar advance: 77.6 ms;
- cursor materialization/chart apply: 79.4 ms;
- owner-local total: 157.7 ms.

The source advance loaded a forward window beginning at the new cursor. The
same-timeframe materializer then requested a backward two-bar window ending at
that cursor. The unnecessary previous bar made the second window extend outside
the freshly cached forward window, so materialization could not reuse it and
performed a second near-serial window load.

The investigation also found that a missing Pane record could pass Replay's
`1m` string through session-aware normalization and interpret it as `1M`.

## Repair

- Same-source/target-timeframe cursor materialization requests exactly the
  current one-bar window.
- Higher and session-aware timeframe projection sizing remains unchanged.
- A missing Pane display timeframe now reuses the already-normalized Replay
  source timeframe instead of reinterpreting its string.
- Manual Next exposes read-only `setupMs`, `sourceAdvanceMs`,
  `materializationMs`, and `totalMs` diagnostics. These do not alter execution
  order or ownership.

No threshold, Replay state, no-future rule, history request ownership, chart
write ownership, or viewport behavior changed.

## Results

Five independent focused browser runs passed:

- 77.3 ms;
- 82.8 ms;
- 77.0 ms;
- 99.0 ms;
- 55.9 ms.

Materialization measured 13.1–22.0 ms in those runs, down from the reproduced
49–79 ms range before the exact-window repair.

The complete canonical suite then passed 14/14 in 24,329 ms. Its final
Replay/history concurrency sample was 98.5 ms, with 79.6 ms source advance and
12.7 ms materialization.

## Gate Decision

The Step 461 P0 latency blocker is closed. The chart/replay foundation again
meets its named product-entry gates. Step 463 may begin the validation domain
spine; it must not remove these diagnostics or weaken the 160 ms gate.
