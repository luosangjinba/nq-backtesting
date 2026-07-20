# Session — R5.6 Real V4 Bars Provider

Date: 2026-07-20
Status: implemented; human chart review pending

## Correction

User review identified that the visible V7 chart was still driven by a
synthetic sine-wave foundation generator. That generator has been removed from
the production path. V7 now uses the existing V4 bars API and local DuckDB NQ
history through a dedicated provider adapter.

## Boundaries Preserved

- the adapter alone owns V4 URL, padding, HTTP failure, and wall-time encoding;
- Bar Data Runtime remains the only request/cache owner;
- Replay retains the exclusive no-future cursor;
- Projection retains Session Hours and timeframe behavior;
- the chart adapter remains the only series writer;
- unavailable real data is visible failure, never silent fake-data fallback.

## Evidence

- `node v7/tests/v4-bars-provider-adapter-harness.js`
- live V4 request: 121 exact NQ bars for the prefix-plus-start window
- `node v7/tests/replay-workspace-browser-harness.js`
- focused owner/runtime harnesses
- architecture and source-quality harnesses
- `git diff --check`

Human review should compare candle structure and timestamps with V6 or another
known view of the same NQ interval.

