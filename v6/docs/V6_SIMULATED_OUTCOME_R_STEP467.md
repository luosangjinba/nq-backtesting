# V6 Simulated Outcome And R — Step 467

Status: complete (2026-07-15)

Step 467 stores `simulatedExecution` and `simulatedOutcome` as separate,
atomically linked artifacts. Execution records the actual fill and explicit
`1m` resolution; outcome records exit facts, reason, ordering ambiguity, and R.

R uses immutable planned risk as denominator and actual fill-to-exit P/L as
numerator, rounded to four decimals and bounded to ±100R. The user must declare
`unambiguous` or `within-minute-unknown`; V6 does not claim tick ordering.

IndexedDB v4 adds execution/outcome stores with unique plan/execution links.
No plan overwrite, dashboard, Replay mutation, Journal write, or tick-accuracy
claim is introduced. Focused domain/repository/architecture gates passed.
