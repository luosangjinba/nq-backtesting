# Session — 2026-08-13 — Pre-Server-Reboot H119-Pending Handoff

## Request

> 我计划重启服务器，请保留交接文档，当前人工验收未完成。

This is a documentation-only restart checkpoint. It grants no acceptance and
no implementation authority.

## Durable Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`;
- branch: `feature/v7-drawing-semantic-annotation`;
- P1c.2 implementation baseline: `6672a23f` (`Implement P1c.2 chart-owned
  calculated-series projection`);
- the worktree was clean before this documentation-only handoff update;
- `git log` remains the authoritative identity after the handoff record is
  committed.

P1c.2 implementation is complete. Its removable calculated-series projection
transaction, Chart-owned admission/fault seam, adapter-private same-chart
Main/internal-region bridge, deterministic controls, and real-Chromium fixture
are present without production Workstation wiring.

## Acceptance Hold

H119 human acceptance has **not** been completed:

- H119 remains `executable`;
- `humanReviewRequired` remains `true`;
- `acceptanceEvidence` remains `null`;
- P1c.2 remains open at its focused human gate;
- implementation completion and earlier command/tool approval are not H119
  acceptance evidence.

H117 remains exactly as it was: `executable`, human-review-required, and
unaccepted. P1b.4 remains paused.

## Resume After Restart

From the repository root, first run:

```bash
git branch --show-current
git log -1 --oneline
git status --short
```

Then read:

1. `v7/docs/V7_RESTART_HANDOFF.md`;
2. this session record;
3. `v7/docs/V7_CALCULATED_SERIES_CHART_PROJECTION_P1C2_HUMAN_REVIEW.md`;
4. `v7/sessions/session_20260813_p1c_2_calculated_series_chart_owned_projection_implementation.md`.

The only immediate product step is the still-pending H119 focused gate:

```bash
node v7/tests/calculated-series-chart-projection-harness.js
```

After the automated prerequisite passes, inspect
`v7/tests/fixtures/calculated-series-chart-projection/main-internal-1000x700.png`
against the six focused visual checks. Stop for an explicit product-owner pass
or rejection. Do not change H119 merely because the server restarted or the
automated harness passed.

## Preserved Exclusions

This handoff does not start or authorize Core MA/SMA, live calculated-series
instances, persistence/UI, SDK execution availability, Community/Worker
execution, generic layout, P1b.4, or any H117 state change. Any server or
browser process is disposable runtime state and may be restarted separately
without changing repository acceptance state.

## Preservation Check

- the handoff changes documentation only;
- no production, test, fixture, schema, harness-state, or acceptance-state file
  is changed;
- `git diff --check` and a clean post-commit worktree are the closure gates.
