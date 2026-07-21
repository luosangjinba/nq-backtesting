# Session — R5.6b Aggregate Completion Placement

Date: 2026-07-20
Status: completed with automated evidence; included in the combined R5.6 human gate

## Audit And Decision

V6 Projection preserved both bucket start and final source-minute metadata, but
its Chart bar still used bucket start. The explicit R5.6 acceptance requirement
needs completion-slot placement without repurposing that identity.

V7 projected bars now carry `startEpochMs` for aggregation/provenance and
`displayEpochMs` for the sole chart adapter. Fixed-duration policies derive the
display coordinate as bucket start plus target duration minus source duration.
An incomplete active candle may therefore be drawn at its eventual slot while
its OHLCV still contains only source bars before the exclusive Replay cursor.

## Evidence

- fixed-timeframe Harness locks `4m :03`, `30m :29/:59`, and `1h :59`;
- Projection defaults identity `1m` display time to its source start;
- invalid, before-start, and non-monotonic display coordinates are rejected;
- Chart Snapshot Application requires canonical display time;
- real Chrome proves partial `5m` display placement while cursor and manual
  wall remain unchanged;
- full V7 Harness suite and `git diff --check` before commit.

R5.6c next profiles cache, projection, chart mutation, and paint before choosing
an ownership-safe incremental path.
