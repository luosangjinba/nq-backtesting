# 2026-06-16 Performance Baseline Plan

## Context

`v4/docs/user/v4-performance-review.md` was added as a performance review report. The report identifies plausible high-leverage bottlenecks in DuckDB query execution and frontend renderer rebuild behavior.

The recommendations should not be applied blindly. The next step is to establish repeatable benchmarks and measurements so optimization work is driven by actual current bottlenecks.

## Confirmed Review Themes

- Backend read paths currently open a DuckDB read-only connection per query helper call.
- `futures_1m` query paths rely on `instrument + ts` filters over the current DuckDB table.
- Frontend renderers rebuild chart primitives on selection events in several domains.
- `/v4/price` is a correctness endpoint but not currently a hot frontend path.
- Expensive DB physical reordering and renderer diffing should be planned after measurement.

## Step 293: Performance Baseline / Benchmark

Goal: build a repeatable performance baseline for the current V4 runtime before doing backend connection reuse, DuckDB physical reordering, or renderer diff optimizations.

Non-goals:

- No DB table rewrite in this step.
- No production connection-pool change in this step.
- No renderer diff/selection rewrite in this step.
- No load-range limit increase.

### Step 293.1: Track performance review report

- Add `v4/docs/user/v4-performance-review.md` to the repository.
- Link it from `v4/docs/README.md` as a pending performance review, not a completed fix list.
- Record this Step 293 plan in TODO/session.

Acceptance:

- Report is tracked and discoverable.
- TODO makes clear that optimization starts with measurement.

### Step 293.2: Backend query benchmark script

- Add a read-only script to benchmark key V4 query paths against the current DB:
  - NQ / ES 1m range loads;
  - NQ / ES 5m or 15m aggregation;
  - NQ / ES 1H aggregation;
  - NQ / ES daily aggregation;
  - `/v4/price`-equivalent exact timestamp lookup.
- Measure repeated runs so cold-ish and warm-ish timings are visible.
- Report rows returned, elapsed milliseconds, instrument, timeframe, range, and query type.

Acceptance:

- Script is read-only.
- It can run without network or API server.
- Output is plain text suitable for pasting into sessions.

### Step 293.3: DuckDB physical layout / zonemap inspection

- Add read-only diagnostics for row counts, min/max ts by instrument, duplicate keys, and rough physical ordering indicators.
- If feasible, use DuckDB `EXPLAIN` / profiling output to inspect whether scans prune effectively.
- Do not rewrite or vacuum the production DB in this step.

Acceptance:

- We know whether DB layout is likely the real bottleneck before proposing table rewrite.
- Any future DB reorder plan has before numbers.

### Step 293.4: Frontend render selection benchmark

- Add a browser smoke or in-page benchmark that seeds a controlled number of PDA/Segment/Order Setup/Live Record objects and measures selection/render latency.
- Focus first on selection events that currently trigger primitive rebuilds.
- Record baseline for small, medium, and large object counts if practical.

Acceptance:

- Benchmark can run headless or with a deterministic browser smoke.
- Output distinguishes data-change render from selection-change render.
- No renderer behavior changes in this step.

### Step 293.5: Performance decision matrix

- Use benchmark results to decide next optimization step:
  - backend connection reuse;
  - DB physical reorder / maintenance action;
  - frontend selection-render split;
  - ChartNote layout cache;
  - replay index/RAF optimization.
- Rank by measured latency, implementation risk, and relevance to real data-entry workflow.

Acceptance:

- Session records measured numbers and final recommendation.
- TODO defines the next concrete optimization step only after data is available.

### Step 293.6: Closeout

- Run benchmark scripts and any smoke checks added in this step.
- Run `git diff --check`.
- Update TODO/session.

Acceptance:

- Worktree is clean after commit.
- Performance review remains tracked.
- No production behavior changes were mixed into the baseline step.

## Likely Follow-Up Steps

- Step 294: backend connection reuse, if benchmarks show connection setup dominates repeated API-style queries.
- Step 295: guarded DB physical reorder design, if range scans remain slow after connection reuse or layout diagnostics show poor pruning.
- Step 296: frontend renderer selection benchmark fix, if selection latency is observable with realistic object counts.
- Step 297: smaller targeted UI hot-path improvements such as ChartNote layout cache or replay bar index cache.
