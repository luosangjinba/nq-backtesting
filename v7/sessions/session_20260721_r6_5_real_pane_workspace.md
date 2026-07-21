# Session — R6.5 Real Pane Workspace And Replay Surfaces

Date: 2026-07-21
Status: human review rejected; preserved as superseded evidence

## Delivered

- Session-configured NQ/ES capability and real V4 provider composition;
- uniform single/two-Pane workspace with active-Pane symbol/TF and Viewport;
- one chart host per independent product Pane plus one complete Pane-set writer;
- Session-wide ETH/RTH and retained-cursor atomic replacements;
- real source traversal through Bar Data Runtime for shared Next/Previous and
  quick New York anchors, with accepted source reuse on cache-hit Next;
- Manual Next/Previous, one-step Autoplay/Pause, Restart, quick GoTo shortcuts,
  and exact Calendar Surface GoTo;
- Pane-local history ledger and native input isolation;
- modular Pane state, data composition, execution, DOM grid, GoTo, and adapter
  boundaries instead of expanding the route/controller entry files.

## Browser Findings

The new gate caught a product-Pane host that was visually clipped to half width
but still measured the full single-Pane width. Hosts are now absolutely pinned
inside their Pane geometry, and the gate asserts exact host/Pane width equality
before testing native input isolation.

## Evidence

- `node v7/tests/replay-pane-workspace-browser-harness.js` passes real mixed
  NQ/`1m` plus ES/`4h`, focus, independent Viewport, all shared Replay actions,
  ETH/RTH, both GoTo forms, layout transitions, browser errors, and visual diff;
- `node v7/tests/replay-workspace-browser-harness.js` passes the established
  real single-Pane/provider/history/performance regression;
- latest 100-step aggregate Next: p95 `63.0ms`, p99 `70.1ms`, max `79.8ms`;
- latest 12h RTH replacement: `1193ms`; rapid high-TF history: zero observed
  long tasks and at most one queued continuation;
- R6.1–R6.4, module-host, source-quality, architecture, and diff gates pass.

## Review Boundary

This step changes interaction and visuals and therefore stops for human review.
Continuous Autoplay cadence and persistence remain R7. Economic Calendar is not
part of this foundation gate.

## Human Review Outcome

Rejected on 2026-07-21. `Next` was still next source minute rather than Next
bar; the top-row toolbar was not accepted as the final Replay transport; and
the requested one-to-four Pane layout matrix and layout sync controls were not
present. R6.6 begins correction with the bar-step invariant.
