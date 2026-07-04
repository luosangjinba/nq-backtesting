# Step 503A - Multi-Pane Behavior Contract Audit

Date: 2026-07-04

## Trigger

User asked whether the previous multi-pane audit checked current behavior
against the earlier requested logic. The answer was no: the previous audit was
mostly a module-boundary audit.

## Plan

1. Re-read the V5 required docs.
2. Inspect the current multi-pane implementation points for active pane, shared
   TF, interval sync, pane-local display state, viewport demand, reset, and
   split resize.
3. Inspect the existing smoke coverage that protects those behaviors.
4. Add a behavior contract audit document before the Step 503-507 module split.
5. Update TODO/spec/session indexes.

## Result

Added:

- `v5/docs/specs/multi-pane-behavior-contract-audit.md`

Updated:

- `v5/TODO.md`
- `v5/docs/INDEX.md`
- `v5/docs/specs/README.md`
- `v5/docs/specs/multi-pane-module-audit.md`
- `v5/sessions/README.md`

## Findings

The current logic is broadly aligned with the requested behavior for:

- one active pane;
- shared TF dropdown following active pane;
- independent TF while `sync.interval` is off;
- synchronized TF while `sync.interval` is on;
- pane-local OHLC/TF labels;
- pane-local Go to / Jump cursor / reset targeting;
- pane-local viewport demand after TF changes;
- responsive split ratios and minimum pane wall behavior.

Main remaining risks:

- the implementation is spread across too many modules;
- reset view has implementation support for price-scale reset, but should keep
  visual/browser coverage if chart runtime or adapter code changes;
- physical multi-pane wheel/drag input is less directly covered than
  command-driven visible-range and viewport-demand behavior.

## Verification

- `git diff --check`

No runtime code changed in this step, so browser smokes were not rerun.

## Next

Proceed to Step 503: extract `chart-replay-pane-orchestrator.js` from
`chart-replay-route.js`, preserving the behavior contract recorded in Step
503A.
