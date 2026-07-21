# Session — R5.6h Second-Review Corrections

Date: 2026-07-20
Status: automated complete; human interaction/visual review pending

## Outcome

The five failures recorded in R5.6g are corrected without changing the V7
owner graph. Bar Data remains the raw requester/cache owner, Projection remains
the Session Hours and aggregation owner, Chart Adapter remains the sole series
writer, Viewport retains canonical wall intent, and Calendar Surface owns the
Session wall-time conversion configured by Session Browser.

## Performance And Interaction Correction

- Target history now scales with the selected display duration, from a
  three-visible-range one-minute minimum to a 35-day provider-bound maximum.
- New York exchange-wall conversion caches one offset per UTC hour rather than
  invoking `Intl` for every source minute.
- Replacement and history completion do not recursively start another
  foreground materialization. A real boundary gesture requests one bounded
  chunk.
- When bounded high-TF history has fewer bars than the canonical Viewport span,
  only the adapter logical range is clamped to the first loaded candle. The
  default/manual Viewport intent is unchanged.
- The final real-Chrome gate measured first `5m` target history at about
  `159ms`, cache-hit ETH→RTH at `72ms`, and uncached `12h` RTH at `1.42s`; the previous 20-second
  foreground chain is absent.
- The 100-sample aggregate Next run measured p95 `56.2ms`, p99 `74.5ms`, and
  max `74.7ms`.

## Time And Completion Correction

- Calendar Surface accepts an optional IANA timezone; Session Browser configures
  both creation fields as `America/New_York`.
- `2026-05-01 12:40` now persists as `2026-05-01T16:40:00Z` and displays as
  `12:40 EDT` in both Session/Replay metadata and the chart.
- Summer, winter, and nonexistent spring-forward wall times have executable
  coverage.
- Visible ETH and RTH policies use one zero-offset fixed grid. RTH `4m` now
  completes at `:03/:07/...`; `1h`, `2h`, `4h`, `8h`, and `12h` complete at
  `:59`.
- Bucket provenance and the exclusive Replay cursor remain separate from the
  chart-only completion coordinate.

## Gate

Focused domain, Calendar, Session Browser, Lightweight Charts, source-quality,
and complete Replay Workspace Chrome Harnesses pass. Updated fixed `1440x900`
fixtures intentionally reflect New York Session semantics. Execute
`docs/V7_R5_6_CORRECTIVE_REVIEW.md`; R6 remains blocked pending explicit human
acceptance.
