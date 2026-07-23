# Session — R6.9j Symbol Candles And Shared Precision

Date: 2026-07-22
Status: accepted by human interaction and visual review on 2026-07-22

## Delivered

- activated Body/Border/Wick visibility and independent up/down colors;
- activated Auto and integer/1–15 decimal precision;
- migrated R6.9i persisted values while preserving Grid intent;
- derived Auto from each Pane instrument and shared formatting with OHLC/change;
- applied current/future Pane presentation atomically without series data writes;
- retained Replay, Workspace, Bar Data, Pane, and Viewport ownership.

## Automated Evidence

- Workstation Settings Harness covers strict colors/precision, v1 migration,
  Auto/custom formatting, persistence, and rollback;
- real adapter browser Harness proves native options, transparent Body mapping,
  tick-size preservation, and unchanged data/application revisions;
- real Workspace browser Harness proves current/future Pane fan-out, hard reload,
  cross-Session persistence, shared readout precision, and state immutability;
- full Harness suite, source-quality, JSON, and diff checks pass before commit.

## Human Review Boundary

Accepted after review of Symbol layout, all six color controls, three visibility
toggles, Auto/manual precision, current/future multi-Pane behavior, hard reload,
and unchanged Replay/candle position.
