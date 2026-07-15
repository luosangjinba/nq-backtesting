# V6 Campaign Summary And Evidence Drillback — Step 468

Status: complete (2026-07-15)

Step 468 adds a read-only campaign projection: trial count, outcome sample size,
wins, losses, breakeven, total R, and average R. Every result row retains stable
trial, outcome, execution, prospective plan, observation, and evidence ids.

Drillback resolves a stable descriptor containing Replay session and original
visible-through boundary plus pane/timeframe/time-price evidence. It deliberately
does not mutate Replay: the existing navigation owner has no safe arbitrary
backward-evidence contract, and bypassing it would risk stale future candles.
Step 469 must validate or add that owner-level navigation path before claiming
automatic chart repositioning.

No aggregate store or write path exists; summaries always derive from source
truth. No broad dashboard, filters, Semantic Drawing, or mode shell was added.

Cross-slice verification passed: real IndexedDB v4 reload, production app-shell
startup, canonical 14/14, exhaustive offline Node 411/411, and static
architecture 59/59. The final canonical Replay/history sample was 150.1 ms
against the unchanged 160 ms gate and should be remeasured during Step 469.
