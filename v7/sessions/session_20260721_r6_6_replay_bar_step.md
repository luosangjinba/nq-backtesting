# Session — R6.6 Replay Bar Step Correction

Date: 2026-07-21
Status: implementation complete; awaiting human interaction review

## Review Input

R6.5 was rejected because `Next` represented the next source minute rather
than the next Replay bar. The same review also rejected the current transport
as final UI and specified the later one-to-four Pane layout and five sync
families. This bounded correction addresses only bar-step truth first.

## Delivered

- added a branded provider/chart-neutral Replay step contract;
- made Replay Runtime the Session-level selected-step owner without cursor or
  revision side effects;
- upgraded the complete Pane response plan to schema v3 with exact step
  provenance and stale-step rejection;
- resolved Next/Autoplay/Previous by real non-empty aligned primary-source
  buckets, including missing minutes, RTH closed time, weekends, and partial
  higher-timeframe completion;
- exposed independent `1m`/`3m`/`5m`/`15m`/`30m`/`1h`/`2h`/`4h` step choices;
- changed the visible forward label to `Next bar`;
- retained one atomic all-Pane materialization and one shared Replay cursor.

## Evidence

- `node v7/tests/replay-step-source-traversal-harness.js` passes;
- Replay Contract, Replay Runtime, Replay × Pane response, Replay Navigation
  (including stale-step rejection), Pane-set, Workspace Transaction, and
  Workspace Replacement harnesses pass;
- `node v7/tests/replay-pane-workspace-browser-harness.js` passes a real `5m`
  step with an active ES/`4h` Pane and asserts the `12:44 EDT` completion;
- `node v7/tests/replay-workspace-browser-harness.js` retains the accepted
  single-Pane regression/performance gate: Next p95 `58.2ms`, p99 `60.9ms`,
  max `64.5ms`; `12h` RTH replacement `921ms`; rapid history has no observed
  long task and a maximum sample interval of about `123ms`;
- module-host, source-quality, architecture, and diff gates pass.

## Next Review Boundary

This interaction change stops for human review. R6.7 should replace the interim
top-row transport with the reviewed constrained floating transport and real
continuous Autoplay before layout expansion begins.
