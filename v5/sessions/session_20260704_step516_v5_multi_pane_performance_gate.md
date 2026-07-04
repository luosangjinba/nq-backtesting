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
- Step 516.2: in progress. A browser smoke is being added for same-timeframe
  two-pane rapid Next projection and elapsed-time gating.
- Step 516.3: pending.
