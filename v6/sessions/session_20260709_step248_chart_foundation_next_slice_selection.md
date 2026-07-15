# V6 Session - Step 248 Chart Foundation Next Slice Selection

Date: 2026-07-09

## Summary

Step 248 selected the next bounded chart-foundation slice after the Step 247
date-range entry viewport gate passed.

## Decision

Step 249 should implement **Drag/Scroll Display Stability Reaudit/Gate**.

## Rationale

- Step 245 covered replay/transport, Manual Previous, leftward history,
  multi-pane bootstrap, pane-local reset view, and display-timeframe switching.
- Step 247 covered non-default date-range entry viewport alignment.
- Current product direction still names sticky/jumpy drag-scroll behavior as a
  foundation target.
- User-observed drag/scroll instability is old debt and should be consolidated
  before opening indicators, trading, or journal feature areas.

## Preserved Boundaries

- Native chart drag owns immediate chart motion.
- Chart surface owns visible-range observation and compensation.
- Leftward-history input bridge owns delayed/coalesced scheduling.
- Chart-history and bar-data own older-window orchestration and requests.
- Chart-data owns pane-local records.
- Chart viewport owns viewport intent/projection.
- Replay owns cursor/reveal state.
- Shell UI does not own drag/scroll projection, bar requests, chart-data writes,
  or replay cursor mutation.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step248-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-browser-step247-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 249 should audit the existing drag/scroll coverage matrix and add a focused
gate or owner fix only if the audit exposes a concrete gap.
