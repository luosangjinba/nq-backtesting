# Step 392 - V6 Architecture Remediation

Status

Accepted.

## Outcome

Step 392 replaced the proposed selection-only re-audit with a bounded
architecture remediation after a full direction and duplication audit.

Completed corrections:

- activated the registered replay target-materialization handoff by aligning
  pane, source-record, target-window, and ISO cursor contracts;
- isolated synchronous and asynchronous event-listener failures;
- prevented stale asynchronous materialization results from replacing newer
  replay state;
- consolidated display-timeframe and replay target reveal behavior into one
  materialization domain;
- prevented incomplete or cursor-stale target windows from leaking future OHLC
  or replacing the current source-projected HTF candle;
- changed production Manual Next coordination to resolve the next available
  source bar before committing one final replay cursor;
- made Pane Runtime the durable active-pane owner while Layout and Chart
  Surface expose compatibility/projection surfaces;
- added a V6-owned ES module and dependency boundary;
- extracted core runtime composition from `app.js`;
- extracted pure workstation chart layout rules from the chart surface.

## Preserved Boundaries

- Replay remains source-`1m` driven.
- Target bars remain display materialization inputs only.
- Bar Data Runtime remains the request/cache owner.
- Chart Data and Chart Viewport remain separate owners.
- Chart Engine remains the only Lightweight Charts writer.
- Shell remains a command/event consumer.

## Verification

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  passed `8/8` in `39103ms` using the default fast replay-gap mode.
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/pane-active-visual-outline-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Remaining Structural Work

The next bounded cleanup should continue reducing production complexity without
changing chart behavior:

- split chart input/range stabilization from `workstation-chart-surface.js`;
- split target/source orchestration from `leftward-history-extension-runtime.js`;
- move one-time selection/audit/readiness helpers out of production `src` when
  they have no runtime consumer;
- move the checked-in Lightweight Charts browser asset out of the V5 legacy
  directory;
- select the repository license before claiming open-source distribution.
