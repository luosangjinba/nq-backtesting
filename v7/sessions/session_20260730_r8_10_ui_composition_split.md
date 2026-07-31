# Session — R8.10 UI And Composition Split

Date: 2026-07-30
Branch: `v7/rebuild`
Starting commit: `18ebe58d feat(v7): coordinate atomic workspace commits`

## Scope

Execute only R8.10 from the binding recovery plan: separate Replay Workspace UI
command/DOM presentation from owner construction and orchestration, preserve
all accepted behavior, recover H024, update exact production evidence, create
one commit, and stop before R8.11.

## Restart Recovery

The initial browser baseline found that port `8766` was served by the legacy
`/home/leo/myworkspace/trading/backtesting` API, which returned health but did
not implement `/v4/available_dates`. The stale process was replaced with the
current worktree's V4 API and the existing local DuckDB through `V4_TRADING_DB`.
The previously failing Calendar Timeframe browser Harness then passed.

One full pre-change run produced a single restored-workspace p95 of `104.5ms`
after the long Chrome sequence; its isolated rerun passed at `84.5ms` with zero
provider requests. No source change was made for that transient scheduling
sample.

## Implementation

- added `core.replay-workspace-composition` with an exact descriptor, public
  entry, independent Harness, 28 declared dependencies, and disposal lifecycle;
- moved runtime construction, market/capability composition, acquisition,
  history, navigation helpers, publication, checkpoint, Pane location,
  autoplay, and related pure planners out of Replay Workspace UI;
- split the former 639-line mixed controller into focused owner construction
  and command-port modules;
- added a UI-owned presentation adapter and kept the surface limited to view
  creation, intent callback wiring, command dispatch, mount, and unmount;
- reduced Replay Workspace UI's actual dependency set to nine modules;
- retained all existing sole-owner and global atomic transaction boundaries;
- left both production ModuleHost bypass findings unchanged for R8.11.

## Evidence

- Replay Workspace composition Harness: public boot and six negative controls;
- Replay Workspace UI independent Harness;
- real Replay Pane Workspace and Replay Layout Workspace browser Harnesses;
- global atomic Workspace commit Harness with five participant failures;
- Production Architecture, Production Module Assembly, ModuleHost,
  Architecture Boundary, Architecture Hardening, and Source Quality Harnesses;
- all 75 top-level Harnesses passed on the final source: the final ordered run
  passed 1–55 continuously, the unchanged Session Browser visual Harness then
  passed in isolation after one pixel-fixture mismatch, the UI-independent
  Session Browser Harness passed in isolation after one Chrome DevTools target
  discovery race, and 58–75 passed continuously;
- `git diff --check`.

No product assertion or latency threshold was relaxed for those two browser
environment retries. The final Workspace checkpoint restore sample measured
p95 `87.4ms` with zero provider requests.

The refreshed exact baseline contains 46 modules, 125 dependency edges, 122
construction sites, seven writer sites, and the same two R8.11 findings.

## Recovery Ledger

- H024: `regressed -> accepted`, retaining its original human interaction
  acceptance and adding this recovery evidence;
- eight recovery regressions remain assigned to R8.11–R8.14;
- no visual or interaction behavior changed, so no new manual UI gate is
  required under the standing workflow.

The next permitted step is R8.11 production ModuleHost boot. It must not begin
until the R8.10 commit and evidence have been reported.
