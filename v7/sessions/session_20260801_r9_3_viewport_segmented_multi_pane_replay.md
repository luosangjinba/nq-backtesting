# Session — R9.3 Viewport-Segmented Multi-Pane Replay

Date: 2026-08-01
Status: implemented; human acceptance pending

## Request

Recheck why Replay remains immediate in Single Pane but has perceptible delay
as soon as Multi-pane is enabled, and change the mechanism rather than applying
another superficial timing adjustment.

## Diagnosis

The remaining path combined repeated full-history mutation proof, immutable
contract traversal, per-tick formatter construction, and four independent
Lightweight Charts series replacements/renders on the browser main thread.
Official public material supports subscription-style updates in TradingView
Advanced Charts, but FXReplay's private implementation cannot be asserted.
Lightweight Charts native panes do not preserve V7's independent grid and
Viewport semantics.

## Delivered

- added an Adapter-owned bounded Replay segment writer with exact rollback and
  finalization;
- limited default rendering to segments intersecting the current follow wall,
  while native/manual history actions reveal all retained segments;
- shared exact Pane mutation proofs and future-axis data;
- reused immutable-subtree proofs and timezone formatters;
- preserved sole Chart-writer, sole Bar Data, sole Replay cursor, no-future,
  Workspace atomicity, and complete-replacement boundaries;
- added focused segment evidence, page-timed latency evidence, CPU profiling,
  and a tightened H082 gate.

## Evidence

The final 64-action 1/2/4 Pane run ended at 14,180 bars per Pane. Warm p50 was
`44.9ms`, `53.9ms`, and `78.1ms`; four-Pane p95 was `126.5ms`, active-Pane p50
was `71.9ms`, and Chart-apply p50/p95 was `53.0/91.5ms`. Every Pane agreed,
all mutations were `append-replace`, two provider misses remained bounded, and
no browser error occurred.

Focused segment, Prepared Commit, Workstation Settings, real Chart Adapter,
source-quality, architecture, and whitespace gates pass. R9.2 remains
executable but was not human-accepted.

All 81 repository Harnesses were covered on the final production tree. The
loaded aggregate sweep produced one screenshot-range sample with logical
`from=15.217`; its immediate isolated rerun passed at `from=13.389`, normal p95
`63.9ms`, normal max `75.3ms`, and rapid-history latency `418.1ms`, with every
semantic assertion intact. An earlier pre-final sweep also disclosed one
`415.2ms` timeframe-switch sample whose isolated rerun passed. The aggregate
multi-Pane latency gate passed after excluding its two declared cold-cache
provider misses from the warm active-Pane percentile, matching the existing
warm/cold classification used for total latency.

## Human Gate

Hard reload, compare rapid `4h` Next in one/two/four Panes, drag well back into
bars revealed during Replay, then Reset. Acceptance remains pending until the
user confirms click-to-candle response and complete history access are both
comfortable.
