# V6 Trial Acceptance — Step 469

Status: automated acceptance complete; human workflow acceptance pending (2026-07-15)

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

## Human Acceptance Gate

Automation cannot establish recording friction. Before Step 469 is declared
fully accepted, the user must exercise the actual workflow and confirm:

1. recording observation, evidence, plan, execution, and outcome is clear and
   does not interrupt Replay practice unacceptably;
2. summary sample size and R agree with the entered trials;
3. selecting a result returns the same Replay session to the original evidence
   time with no future candles left visible;
4. all visible panes remain coherent after drillback and ordinary
   Previous/Next/Play still work;
5. rejection of a result from another Replay session is understandable.

No claim of low recording friction is made until this gate is confirmed.

## Scope Preserved

No ontology expansion, Semantic Drawing, broad dashboard, three-mode shell, or
new business feature was added. After human acceptance, the next authorized
work is the user-requested modularity/large-file audit before milestone close.
