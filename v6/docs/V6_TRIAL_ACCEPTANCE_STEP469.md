# V6 Trial Acceptance — Step 469

Status: technical vertical-slice acceptance complete; product UI pending a
later authorized phase (2026-07-15)

## Outcome

The first validation vertical slice now has an owner-safe path from a campaign
result to its original Replay evidence. Campaign Summary resolves source truth,
then dispatches a public Replay Navigation drillback command. Replay Navigation
validates the active session and evidence boundary, stops playback, moves the
Replay cursor, and replaces every visible pane through Chart Data commands.

Manual Previous and evidence drillback share one cursor-pane replacement
boundary. The path removes bars newer than the restored visible-through time,
loads a bounded backward window only when retained chart data is insufficient,
and preserves Replay, Bar Data, Chart Data, and pane ownership.

Cross-session, future-evidence, pre-session, invalid-time, and concurrent
requests are rejected before cursor/chart mutation. Step 469 does not silently
open a different Replay session.

## Persistence And Statistical Acceptance

A real browser IndexedDB v4 acceptance test creates and reloads a complete
two-trial chain:

`playbook version -> campaign -> trial -> observation/evidence -> prospective plan -> execution/outcome -> summary/drillback`

The recovered projection proves:

- immutable playbook/campaign references and two persisted trials;
- sample size `2`, one win, one loss;
- outcome values `+2R` and `-1R`, total `+1R`, average `+0.5R`;
- raw evidence id, Replay session, visible-through time, pane, timeframe, price,
  and trial id survive reload and remain drillable.

## Automated Gates

- focused evidence navigation, rejection, campaign handoff, Manual Previous,
  and Step 468 source-projection tests passed;
- real IndexedDB trial acceptance passed;
- canonical passed `14/14`;
- exhaustive offline Node passed `413/413`;
- static architecture passed `59/59`;
- app-shell browser smoke passed;
- Replay/history visible latency measured `85.8 ms` against the unchanged
  `160 ms` threshold.

## Product UI Boundary

Step 469 validates domain, persistence, projection, and navigation behavior
through repositories, runtime commands, and automated browser harnesses. The
current workstation does not provide a complete user-facing flow for recording
an observation, evidence, plan, execution, and outcome and then reviewing
Campaign sample size, wins/losses, and R statistics.

Consequently:

- the automated sample size and `+2R/-1R` result proves calculation and
  persistence behavior, not an available end-user workflow;
- the Session Home Summary/Stats surface is separate Session Analytics and is
  not the Validation Campaign Summary described here;
- recording friction, field clarity, Campaign Summary usability, and human
  drillback comprehension cannot be accepted yet;
- those product claims require a separately authorized UI phase with real
  workflow acceptance after its implementation.

Step 469 is complete as a technical vertical slice. It must not be described as
a completed user-facing Validation Campaign feature.

## Scope Preserved

No ontology expansion, Semantic Drawing, broad dashboard, three-mode shell, or
new business feature was added. The next authorized work is the user-requested
modularity/large-file audit before deciding the next product implementation
phase.
