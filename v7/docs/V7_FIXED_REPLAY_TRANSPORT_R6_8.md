# V7 Fixed Bottom Replay Transport — R6.8

Status: human accepted with R6.8a–b corrections (2026-07-21)

## Reviewed Layout Decision

The initial roadmap proposed a constrained floating overlay. Before
implementation, floating and fixed forms were compared against the upcoming
multi-Pane work. The approved result is visually light but structurally fixed:
a centered capsule inside a dedicated `38px` Workspace bottom rail.

The rail never overlaps Canvas, price scales, time scales, or a bottom Pane.
At `1440×900`, each single-Pane Lightweight Charts host remains at least
`800px` high. Existing Session/visible-through context occupies the left side
of the rail and focused-Pane ownership context occupies the right side.

## Existing-Capability Check

Lightweight Charts' official documentation exposes chart/series creation and
data mutation APIs, not a Replay transport. TradingView's maintained
awesome-tradingview catalog likewise points to chart plugins and wrappers but
does not supply a Replay control surface. R6.8 therefore remains ordinary DOM
inside the Workspace UI owner and never enters the Chart Adapter.

References:

- https://tradingview.github.io/lightweight-charts/docs
- https://github.com/tradingview/awesome-tradingview

## Controls And Ownership

Reset View, Restart, Go to, and Local status remain in the top toolbar. The
bottom capsule owns only presentation and intent dispatch for:

- Previous bar;
- one stateful Play/Pause button;
- independent Replay step;
- Autoplay speed;
- Next bar.

Replay Runtime remains the cursor/playback/revision owner. Workspace
Transaction remains the complete Pane-set coordinator. Chart Snapshot
Application remains the chart writer. The transport's selected speed is a
UI-local cadence preference and creates no Replay or Pane transaction.

## Dynamic Completion Cadence

The bounded speeds are `0.5×`, `1×`, `2×`, and `5×`, with post-completion gaps
of `1000ms`, `500ms`, `250ms`, and `100ms`. The first step remains immediate.
If a successor is already scheduled, changing speed clears and replaces that
single timeout. If a complete Pane transaction is in flight, its settlement is
unchanged and the next timeout uses the new speed. No interval, overlap, or
input backlog is introduced. Pause remains available during in-flight work.

## Gate

- the deterministic scheduler Harness proves dynamic rescheduling, bounded
  options, no backlog, in-flight speed selection, Pause, and Session end;
- real Chrome proves the capsule is centered in the footer after the Pane grid,
  top toolbar contains no Replay transport controls, and the chart-height gate
  remains intact;
- speed and Replay-step changes move neither Replay nor Workspace revision;
- Session completion disables forward/play/speed controls but keeps Previous
  and Replay-step recovery available;
- mixed NQ/ES and `1m/4h` Panes run `5×` continuous Replay through the same
  atomic all-Pane path, with one stateful Play/Pause button;
- single- and mixed-multi-Pane `1440×900` fixtures bind the accepted structure.

All 37 non-browser and five serial real-Chrome Harnesses pass. The retained
performance gate records Next p95 `58.1ms`, p99 `70.7ms`, max `72.3ms`,
ETH→RTH `45ms`, `5m` `160ms`, `12h` RTH `1044ms`, and zero observed long task
during rapid history loading.

## R6.8a Review Correction

Before acceptance, the user requested the FXReplay-style truncation/time-
machine action, the explicitly named `Sync timeframe` switch, and a more
TradingView-like visual treatment. R6.8a implements those additions without
changing the accepted fixed-rail decision. Detailed behavior and evidence are
recorded in `V7_REPLAY_TRUNCATION_SYNC_R6_8A.md`.
