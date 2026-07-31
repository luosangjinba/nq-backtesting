# V7 Full Production Regression Matrix — R8.14

Status: executable recovery gate; awaiting R8.15 human acceptance (2026-07-31)

## Outcome

R8.14 replaces the old evidence-path inventory with a fail-closed executable
production matrix. The matrix binds 11 required axes to eight real browser or
production-owner scenarios. A scenario cannot claim coverage through a fixture
model or filename alone: it must name an independently executed Harness, an
allowed production execution kind, concrete covered values, and visible
assertions.

The step changes no production behavior. It strengthens test governance and
adds dynamic failure observation to existing production paths.

## Bound Matrix

`v7-production-regression-matrix.json` requires coverage of:

- one, two, and four Panes;
- P1, non-primary, and bidirectional focus/target paths;
- NQ, ES, and mixed-instrument Workspaces;
- fixed source/aggregate plus registered day/week/month Calendar timeframes;
- ETH and RTH;
- default, manual, and dense Viewports;
- cold miss, warm hit, and delayed fill;
- in-order, delayed, reordered, stale, and participant-failure work;
- Manual Next, Auto, Previous, Restart, GoTo, and Pane Locate;
- first save, checkpoint update, reopen, and write failure;
- fresh boot, soft reopen, and hard refresh.

The validator additionally requires compound scenarios for dense two-Pane RTH
bidirectional Locate, restored mixed-Pane warm-cache hard refresh, Calendar RTH
replacement, and visible-then-persistence failure. Five negative controls prove
that a missing axis value, inventory-only evidence, a missing compound, a
static failure claim, or a nonexistent Harness closes the gate.

## Dynamic BUG-V7-0001 Evidence

The real Chrome dense RTH Harness now arms one failure on the active Session
record's production `Storage.setItem` call. It switches the complete Workspace
from accepted RTH toward ETH and captures the candidate at the durable-write
boundary. That capture proves every real Chart has already painted ETH and the
candidate Workspace revision is newer. The injected write then fails before
finalize.

The same run proves that rollback restores the exact prior RTH Workspace
revision, Replay cursor, Pane bar counts, visible revisions, and logical walls,
while the serialized Session record remains byte-for-byte unchanged. After the
hook is removed, an ETH/RTH retry succeeds, a hard refresh restores RTH, and
further dense history remains usable.

The production-owner global atomic Harness independently injects Chart, Replay,
Workspace State, publication, and persistence failures. Its trace now proves a
new Chart candidate crossed the visible boundary before each later failure and
that the accepted Chart was restored afterward. Delayed, reordered, stale, and
late-failure currentness remain dynamically exercised by the Workspace
Transaction and Pane-set Harnesses.

## Performance And Restore Evidence

The restored Workspace browser scenario remains the executable 100-sample
Manual Next measurement. It binds the unchanged cache-hit limits of p95 below
100 ms, p99 below 150 ms, maximum below 250 ms, tail-update-only mutation, and
zero warm provider requests. It also exercises mixed pane-local instruments,
RTH, a manual Viewport, soft reopen, hard refresh, checkpoint persistence, and
Auto Replay through production owners.

## Rule Lifecycle

- H021 returns from `regressed` to `executable`; its cross-product evidence
  still requires human acceptance.
- H025 returns from `regressed` to `executable`; its latency interaction still
  requires human acceptance.
- H069 returns from `regressed` to `accepted` because it has no human-review
  requirement and its dynamic restore/cache/race evidence is complete.
- H079 activates as `executable`; it is not human accepted.

No rule remains in `regressed`, but recovery mode stays active. R7.3n/R7.3o and
all human-review-required recovery rules remain unaccepted until R8.15 repeats
the exact browser workflow and explicitly closes recovery mode.

## Verification Contract

R8.14 requires the production matrix validator, all dynamically referenced
Harnesses, the complete top-level Harness inventory, architecture boundary and
hardening gates, production architecture/source analysis, and
`git diff --check`. Production source and architecture baselines are unchanged
because this step adds only test-governance, test execution, and evidence.

All 78 top-level Harnesses pass sequentially. The final restored mixed-Pane
100-sample run measured p95 77.4 ms, p99 100.0 ms, and maximum 100.2 ms with
zero warm provider requests. The ordinary real Workspace 100-sample run
measured p95 68.0 ms, p99 73.9 ms, and maximum 74.2 ms.
