# FX Replay Prefix Demand And Retention

This spec defines the stable V5 rules for loading older replay context after the
initial replay display has been rendered.

## Scope

Applies after initial chart entry:

- detecting left-side viewport demand;
- requesting older prefix chunks;
- merging sparse prefix chunks into replay display state;
- releasing off-screen prefix chunks.

Forward reveal and Play/Pause are governed by replay navigation behavior, but
their display state must remain compatible with this spec.

## Ownership

- Chart runtime owns visible range tracking and prefix-demand detection.
- Replay runtime owns prefix demand consumption, prefix chunk state, sparse
  display merge, and retention decisions.
- Bar data runtime owns bounded older-window load, cache keys, and release.
- UI and feature modules may dispatch commands and observe events, but must not
  request bars or write chart series directly.

## Prefix Demand

Chart runtime emits prefix demand when the visible range moves near the earliest
loaded chart bar.

Demand payloads describe:

- `direction: "backward"`;
- `anchor`: the earliest currently loaded chart bar time;
- `earliestLoadedTimestamp`;
- `visibleFrom`;
- `thresholdSeconds`;
- `suggestedCount`.

Demand detection must not request bars and must not mutate replay cursor state.

## Older Prefix Loading

Replay runtime consumes prefix demand and requests older bars through
`barData.loadWindow`.

Rules:

- requests are bounded backward windows;
- request anchor is the demand `anchor`;
- request count is derived from `suggestedCount` and capped by replay prefix
  limits;
- duplicate in-flight or already-loaded anchors are ignored;
- creating or loading prefix chunks must not request the full replay session
  range.

## Sparse Merge

Loaded prefix chunks are merged into display state sparsely.

Rules:

- bars are keyed by timestamp and deduplicated;
- merged display bars are sorted oldest to newest;
- bars after the replay cursor are excluded;
- merge must not synthesize missing bars;
- merge must not allocate a dense array covering the whole replay session;
- chart updates go only through chart runtime commands.

## Retention

Replay runtime releases prefix chunks that are older than the explicit retention
range.

Current rule:

- retain chunks within two visible-range spans to the left of `visibleRange.from`;
- release chunks whose latest bar is older than that retention boundary.

Release effects:

- remove the chunk from replay `prefixChunks`;
- append a release summary to replay `releasedPrefixChunks`;
- remove released bars from display state;
- call `barData.releaseWindow` for the released bounded window;
- update chart bars through chart runtime.

## Forbidden

- Chart runtime requesting bars.
- Bar data runtime mutating replay cursor or chart series.
- Replay runtime directly calling V4 bars APIs.
- UI or feature modules importing chart internals or bars API clients.
- Prefix loading based on fixed day ranges.
- Full-session preloading for older context.
- Dense session-wide arrays for sparse prefix history.

## Verification

Current harnesses:

- `v5/tests/prefix-demand-detect-smoke.js`
  - chart runtime detects left-side demand without loading bars.
- `v5/tests/prefix-demand-load-smoke.js`
  - replay consumes demand and loads a bounded backward chunk through bar data
    runtime.
- `v5/tests/prefix-demand-merge-smoke.js`
  - older chunks merge sparsely into display state without future bars.
- `v5/tests/prefix-retention-smoke.js`
  - off-screen chunks are released from replay state and bar data cache.
- `v5/scripts/smoke_all.js`
  - keeps prefix demand, merge, retention, and boundary harnesses running
    together.
