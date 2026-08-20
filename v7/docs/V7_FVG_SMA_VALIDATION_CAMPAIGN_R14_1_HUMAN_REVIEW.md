# V7 R14.1/H121 FVG + SMA Validation Campaign Human Review

Status: automated H121 passed; product-owner review pending

Date prepared: 2026-08-19

Scope: only the removable Validation Campaign slice using existing manual FVG
and `first-party.moving-averages@1.0.0` SMA(close,20). Passing automation does
not accept H121.

## 2026-08-19 Review-Blocker Repair

The initial review exposed a 1m/15m FVG projection failure: both target anchors
could collapse into one 15m bucket, causing `SEGMENT_DEGENERATE`, stale source-
Pane selection, and a Workspace interaction lock. The repaired behavior omits
that unrepresentable target-Pane projection without changing canonical FVG
truth; tool construction binds the command-time focused Pane; Inspector cancel
clears Preview and releases the Workspace gate. The empty capture dialog now
offers `Go to Validation` when no active Campaign exists.

Node and real Lightweight Charts regressions cover the exact 1m/15m case,
source Pane/timeframe provenance, target-Pane absence/hit testing, atomic
rollback, and interaction release. H121 remains unaccepted: restart this list
from item 1 and record all ten human results.

## Before You Start

1. Open the production V7 route with working market data.
2. Keep one Session with a visible ready SMA(close,20) and one accepted manual
   direction-aligned FVG.
3. Use a disposable browser profile or export any Campaign JSON you want to keep.
4. Record Pass/Fail and one short observation for every item. Stop on any Fail.

## Ten Required Checks

- [ ] **1 — Complete removal:** boot once with the full eight-module Campaign
  closure omitted. Ordinary Sessions, Replay, manual FVG, and SMA still work;
  no Campaign route or Pane buttons remain. Result: ______ Notes: ______

- [ ] **2 — No plugin control:** restore the closure and create a Campaign.
  Confirm creation does not add, enable, configure, move, hide, or remove FVG
  or SMA. Result: ______ Notes: ______

- [ ] **3 — Understandable capture:** capture one long and one short
  observation. Confirm each review clearly identifies selected FVG/SMA, values,
  direction, Context/Execution Pane roles, timeframes, and exclusive Replay
  cutoff. Result: ______ Notes: ______

- [ ] **4 — Honest classifications:** retain one rejected, one ambiguous, and
  one incomplete Case. Confirm none appears as qualified and each remains
  visibly distinguishable. Result: ______ Notes: ______

- [ ] **5 — Frozen decision evidence:** save a qualified observation, note its
  evidence, advance Replay, and record Outcome. Reopen the Case and confirm the
  decision-time evidence/cutoff did not change. Result: ______ Notes: ______

- [ ] **6 — Same-Bar honesty:** inspect the fixture where target and
  invalidation are both touched in one Bar. Confirm Outcome says
  `same-bar-ambiguous` and does not guess OHLC order. Result: ______ Notes: ______

- [ ] **7 — Traceable statistics:** finalize Cases, freeze a Cohort, run the
  fixed analysis, inspect the denominator, and drill each metric/member back to
  the correct raw Session/Pane/Replay context. Result: ______ Notes: ______

- [ ] **8 — Source-loss survival:** test FVG absent, SMA absent, and both absent.
  Historical Cases, statistics, and export stay readable; only affected new
  capture/verification is blocked. Result: ______ Notes: ______

- [ ] **9 — Exact return, no rewrite:** restore the exact providers and run
  explicit verification. A verification may append, but Case, citation,
  Cohort, and Analysis content/revisions do not rewrite automatically.
  Result: ______ Notes: ______

- [ ] **10 — Reload/local-first/layout:** hard reload, inspect a provider-missing
  second-device state, export JSON, and inspect both desktop and 620px layouts.
  Confirm the workflow remains understandable, Campaign-only corruption does
  not remove Sessions, and no remote/AI upload is implied. Result: ______ Notes: ______

## Acceptance

- All ten checks passed: [ ]
- Product owner explicitly accepts H121: [ ]
- Review date: ______
- Reviewer: ______
- Durable acceptance record: not created

Until both boxes are checked by explicit product-owner instruction, H121 stays
`executable`, human-review-required, with `acceptanceEvidence: null`; R14.1
stays open. H117 remains unchanged.
