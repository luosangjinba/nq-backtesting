# V7 R0 Constitution And Isolation Gate — 2026-07-19

## Trigger

V6 manual acceptance repeatedly failed with cross-session bars, empty chart
entry, stale async completion, partial TF/ETH-RTH/multi-pane state, and regressions
caused by fixes in distributed orchestration paths.

The last V6 activation-guard attempt (`b0df4e43`) is explicitly rejected by
manual review: a newly created session showed no bars and remained in
`Preparing replay...`.

## Decision

Open V7 as a bounded replay/chart runtime rebuild. Preserve V6 as product and
failure evidence; do not use its production runtime as an implementation base.

## R0 Deliverables

- product/rebuild boundary;
- owner and transaction architecture;
- V6 migration denylist;
- V6 knowledge/structure disposition matrix and intended final product shape;
- executable architecture manifest/harness;
- independently runnable, public-port-only, removable module harness standard;
- open/closed extension contracts for timeframes, granular providers,
  instruments/calendars, indicators, and formula engines;
- bounded long-term complexity mechanisms for versioning, migrations,
  permissions, background work, observability, analytics, and AI consumers;
- first Session isolation acceptance matrix;
- no production V7 runtime.

## Manual Review

Review the documents for missing product interactions or ownership ambiguity.
Confirm that the isolation matrix represents the minimum gate. R0 does not
provide a browser behavior to test.

After R0 acceptance, roadmap execution is autonomous between mandatory human
gates: each step is implemented and committed without repeated `do next step`
instructions, then pauses for explicit human acceptance.
