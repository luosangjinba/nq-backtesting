# Session — R6.9k Status Readout And Current Price

Date: 2026-07-22
Status: awaiting human interaction and visual review

## Delivered

- activated independent OHLC, bar-change, and nullable Volume visibility;
- retained mandatory compact symbol and timeframe provenance;
- activated independent current-price Name, Value, and Line controls;
- covered the native library's name-only gap with one bounded price-axis
  primitive owned by the chart adapter;
- advanced the global Settings wire to version 4 with deterministic v1/v2/v3
  migration;
- retained global current/future Pane inheritance and Replay/Workspace/Viewport
  ownership invariants.

## Automated Evidence

- Workstation Settings Harness covers strict fields, defaults, prior-version
  migration, persistence, and rollback;
- real Lightweight Charts 5.2 Harness covers all eight current-price
  combinations without series-data mutation;
- real Pane Workspace Harness covers both tabs, finite Volume, hard reload,
  cross-Session and future-Pane inheritance, and unchanged domain revisions;
- Layout Workspace Harness covers explicit `null` Volume as `Vol —`;
- full V7 domain/browser Harnesses, source quality, architecture, and visual
  baselines pass before commit.

## Human Review Boundary

Review all three Status line switches, all three current-price switches and
their eight combinations, single/multi-Pane fan-out, hard reload, another
Session, and unchanged Replay/candle position. Stop at this gate before R6.9l
activates Canvas background, Crosshair, scale text, Pane-control visibility,
and margins.
