# Session 2026-07-04 - Step 516 Multi-Pane Performance Gate

## Goal

Add an executable multi-pane replay performance gate so rapid `Next` behavior
is measured instead of judged only by visual feel.

## Plan

1. Document the Step 516 rapid-Next performance contract and measurable
   acceptance checks.
2. Add a browser smoke that opens a same-timeframe multi-pane layout, rapidly
   clicks `Next`, and asserts cursor/reveal/pane rendering plus projection
   command counts.
3. Run the rebuild contract and relevant replay/multi-pane smokes, then update
   TODO and session handoff.

## Ownership Rules

- The smoke may instrument command dispatch and fetch at the browser boundary.
- Production code must still keep chart writes inside chart runtime and bar
  requests inside bar-data runtime.
- Step 516 should not add new replay semantics unless the performance gate
  exposes a regression that must be fixed to pass.

## Status

- Step 516.1: completed. The rebuild plan now defines measurable multi-pane
  rapid-Next acceptance checks.
- Step 516.2: completed. Added
  `multi-pane-rapid-next-performance-browser-smoke.js`, which opens a
  same-timeframe two-pane layout, clicks `Next` 10 times rapidly, and verifies
  final cursor, reveal count, both pane bar-count deltas, no forward fetch, and
  bounded elapsed time.
- Step 516.3: completed. Ran the rebuild/replay/multi-pane regression set and
  updated handoff docs.

## Verification

- `node --check v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
- `node v5/tests/chart-replay-pane-projection-smoke.js`
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `node v5/tests/multi-pane-rebuild-contract-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

All listed checks passed. The first sandboxed run of the new browser smoke hit
local port `EPERM`, then passed with the approved browser-smoke command prefix.
Node emitted the repository's existing ES module package warning for test files.

## Next

Step 517 should raise this from a 10-click regression gate to a latest-intent
rendering contract. Manual replay stepping must not visually drain a backlog
one candle at a time. If the user clicks `Next` faster than individual commands
finish, controls/runtime should coalesce to the newest intended reveal count and
render the final chart state with effectively zero perceptible delay. Human
click rate is roughly capped around 10 clicks/second, so the product target is
about 100ms latest-intent-to-visible-candle latency. V4 already has this feel,
so V5 failing it should be treated as a V5 implementation defect.
