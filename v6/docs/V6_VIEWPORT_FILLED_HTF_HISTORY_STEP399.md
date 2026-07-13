# V6 Viewport-Filled High-Timeframe History - Step 399

Status: implemented; real-service visual acceptance pending.

## User Evidence And Root Cause

The supplied 4h/1D screenshots disproved the earlier claim that high-timeframe
history was complete. Diagnostics showed `History fallback`, one failed target
request, one source request, and only 8-20 prepended bars per gesture.

The live `127.0.0.1:8766` process returned `Unknown endpoint` for
`/v4/target_bars`. It had been running since July 10 from an older loaded copy
of the Python module. Restarting the API from the current worktree restored
real 4h and 1D target-bar responses.

## Implemented Boundaries

1. V4 health now advertises `targetBars` and supported target timeframes. This
   makes stale deployments distinguishable from a merely healthy base API.
2. `chart-history.target-history-request-sizing` derives a target count from
   the current logical viewport: one visible span plus one span of buffer.
3. `chart-history.target-history-window-plan` owns the target-window calendar
   or fixed-duration calculation. The target request is no longer constrained
   by the bounded source-1m fallback window.
4. `chart-history.leftward-history-input-bridge` starts prefetching when fewer
   than 24 logical bars remain on the left. Its post-load check continues until
   the buffer is restored or history is explicitly exhausted.

The implementation follows Lightweight Charts' official infinite-history
pattern: subscribe to logical-range changes, load before the left buffer is
consumed, and size the load from the missing buffer. No plugin was required;
the awesome-tradingview catalog does not provide a more suitable history data
owner.

## Regression Evidence

- HTF browser measurement: 4h/8h/1D/1W each used one target request and zero
  source requests. The mock target windows returned 161, 161, 321, and 229
  bars respectively.
- Target-history diagnostics pack: `8/8` passed.
- Continuous leftward browser smoke: passed, continuing to the 24-bar buffer
  or stopping only after `no-older-bars-returned`.
- Core chart browser pack passed through the first 12 members; its historical
  fixed-batch assertion was updated and then passed independently.
- `git diff --check`: passed.

## Preserved Ownership

- only bar-data runtime fetches/caches bars;
- only chart-history coordinates older-window requests;
- only chart-data mutates pane bar state;
- only chart surface applies the logical viewport;
- replay remains source-1m driven and target bars remain display-only.

## Next

Step 400 should visually verify the actual running service after a browser
reload. Acceptance requires immediate 4h/1D viewport fill, `History target`
diagnostics, no source fallback, and threshold-prefetched left dragging. After
that acceptance, resume the deferred loaded-window date locator.
