# Step 540 - V6 Rewrite Start

## Decision

Open V6 and stop patching V5 replay viewport/manual-anchor behavior.

## Trigger

Live manual retest after Step 539 still showed the same user-visible failure:

- initial default wall works well enough;
- dragging away from the default wall should create a temporary wall at the
  latest candle's current screen position;
- Play/Next should keep the latest candle on that temporary wall and push older
  candles left;
- instead, candles continued walking rightward and the default wall behavior
  became unreliable.

This means the V5 manual-anchor issue is not one missing field or one missed
restore path. It is a structural boundary problem.

## Why V6

The bug class crosses too many V5 ownership surfaces:

- chart runtime time ranges;
- Lightweight logical ranges;
- native visible-range observation;
- replay display-window loading;
- viewport demand bridge;
- prefix/display replacement;
- append fast path;
- follow/manual mode restoration.

Any local fix can be erased or reinterpreted by another path. That satisfies
the Step 535 V6 trigger: the same class of bug can only be hidden by additional
special-case patches.

## Artifacts Added

- `v5/docs/specs/v6-rewrite-start-decision.md`
- `v6/README.md`
- `v6/TODO.md`
- `v6/docs/INDEX.md`
- `v6/docs/V6_ARCHITECTURE.md`
- `v6/docs/specs/replay-viewport-intent.md`

## V6 First Gate

Before multi-pane, Settings, or visual polish, V6 must pass the single-pane
manual wall gate:

- initial default wall Play/Next;
- native drag left from initial state then Play/Next;
- native drag right from initial state then Play/Next;
- wheel zoom from initial state then Play/Next;
- drag that triggers older-window loading then Play/Next;
- assertions based on latest-candle logical offset and span, not only cursor
  text.

## V5 Policy

Keep V5 as reference and negative evidence. Do not port V5's viewport-demand,
manual anchor, chart runtime, or replay display-window internals into V6.
