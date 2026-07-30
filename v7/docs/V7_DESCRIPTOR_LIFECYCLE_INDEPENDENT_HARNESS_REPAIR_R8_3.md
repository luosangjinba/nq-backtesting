# V7 Descriptor, Lifecycle, And Independent-Harness Repair — R8.3

Status: completed automated recovery gate (2026-07-30)

## Purpose

R8.3 repairs the seven production findings assigned to descriptor truth,
lifecycle declarations, and independent module boot. It changes no visible UI,
interaction, runtime algorithm, or application composition root.

## Descriptor And Lifecycle Truth

The production descriptors now match the imports and lifecycle handles observed
by the R8.2 analyzer:

- `core.fixed-timeframe-domain` and `core.calendar-timeframe-domain` declare
  `core.bar-data-contract` as a required port;
- `core.session-store` declares `core.replay-navigation-settings` as a required
  port;
- `core.bar-data-runtime` and `core.provider-execution-runtime` declare their
  returned `dispose()` lifecycle.

The refreshed exact baseline contains no descriptor or lifecycle violation
assigned to R8.3.

## Independent Boot

Every active descriptor still names an independent harness. The two previous
application-shell false positives now have dedicated evidence:

- Replay Workspace UI imports its public entry directly, checks its public
  state/capability surface, and proves idempotent disposal;
- Session Browser UI imports its public entry through a dedicated browser
  fixture, boots without Replay Workspace UI, and proves DOM cleanup plus
  exactly-once subscription disposal.

Neither harness loads `/v7/app/` or relies on the application composition root.

## Production Descriptor Assembly

The R8.3 assembly harness reads the real active descriptors and imports all 42
real public entries. It then uses the real ModuleHost to prove descriptor-graph
ordering and lifecycle semantics without claiming the R8.11 application-factory
gate:

- all 42 public APIs are exposed from the started graph;
- all 10 lifecycle-bearing descriptors dispose exactly once in reverse assembly
  order and the host reaches `stopped`;
- the complete optional-removal matrix is derived from production descriptors;
- its sole current case removes `adapter.replay-workspace-ui` and proves
  `adapter.session-browser-ui` still boots without receiving that optional
  port.

The expected removal matrix is committed separately so an added optional edge
cannot silently expand the test loop. Real application factory construction and
conversion of `app/main.js` and `app/data-acquisition.js` to ModuleHost remain
R8.11 work.

## Recovery State

The architecture baseline falls from 13 to six blocking findings. The six
remaining findings are unchanged and remain assigned as follows:

- R8.5: two raw market-data retention writers in Replay Workspace UI;
- R8.6: one mutable Pane Workspace writer in Replay Workspace UI;
- R8.9: one post-terminal semantic Workspace commit path;
- R8.11: two application composition roots that bypass ModuleHost.

H073 is accepted as the exact production-source observation gate. This does not
accept the six reported architecture violations: all 15 rules marked
`regressed` by R8.1 remain regressed until their assigned later recovery steps.

## Review And Scope Boundary

The user directed that steps without major UI or interaction changes do not
need manual review. R8.3 therefore uses automated acceptance evidence and sets
H073 `humanReviewRequired` to `false`. No production JavaScript or HTML is
changed by this step; only module descriptors, harnesses, executable metadata,
and recovery documentation change.
