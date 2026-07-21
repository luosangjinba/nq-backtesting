# Session — R5.6 Real V4 Bars Provider

Date: 2026-07-20
Status: implemented; human chart review partially passed, not accepted

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

## Follow-up Visual Correction

The redundant strip above the Canvas was removed after review. The data-source
label, Default/Manual wall label, and Cursor timestamp no longer consume a
second chart header row. Canvas now starts directly below the compact toolbar;
wall/cursor values remain non-visible runtime evidence for automated tests.

Price-axis wheel input was also aligned with the existing price-axis drag
meaning. The adapter uses Lightweight Charts 5.2's public price-scale width and
visible-range APIs, intercepts wheel only inside the right axis, anchors zoom at
the pointer price, preserves the horizontal logical range, and restores price
autoscale through Reset View. The independent real-Chrome adapter harness
proves the vertical range changes while the time range does not.

## Human Review Result

The report in `v7/tmp/人工验收步骤R5.6/人工验收步骤R5.6.md` passed real
candles, entry/no-future, one-minute Next, repeated left history, TF menu,
ETH/RTH filtering, wheel behavior, Reset, and Canvas layout.

Acceptance remains blocked by five corrections: direct-open after Session
creation; removal of cache-hit `Updating…`; TF switch and aggregate-Next
latency; exact V6 aggregate candle-end display placement; and New York
exchange-time chart labels (`09:30–16:14` RTH rather than browser-local
`06:30–13:14`). The exchange-time item must begin with a V6 end-to-end audit,
not a formatter-only patch.
