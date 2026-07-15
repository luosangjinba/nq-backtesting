# V6 Session — Step 470 Modularity Audit

Date: 2026-07-15

## Outcome

Completed the requested modularity/large-file audit before ETH/RTH Session
Hours implementation.

The audit measured the current production inventory, traced the future
Session Hours flow through Replay, materialization, history, projection, Chart
Data, and shell boundaries, and selected three timed structural gates:

1. shared Replay pane materialization policy before ETH/RTH Phase C;
2. leftward-history request-coordination split before Phase C/D;
3. top-toolbar template extraction before Phase E.

No broad refactor was authorized. Large unrelated owners such as the Session
Dashboard remain outside the ETH/RTH path.

## Key Evidence

- `workstation-chart-surface.js`: 830 lines;
- `workstation-shell-template.js`: 715 lines;
- `session-dashboard.js`: 665 lines;
- `leftward-history-extension-runtime.js`: 545 lines;
- append and replacement Replay pane materialization currently duplicate
  window/projection context that Session Hours must share.

## Decision

Step 470 is complete. ETH/RTH Phase A is the next authorized work. It is a
semantic and data-contract phase; no toolbar or runtime behavior should be
implemented until its rules are accepted.
