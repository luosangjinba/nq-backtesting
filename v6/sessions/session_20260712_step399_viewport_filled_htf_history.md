# Session - Step 399 Viewport-Filled HTF History

Date: 2026-07-12

## Outcome

- Reproduced the live `target-history-load-failed` as a stale API process whose
  `/v4/target_bars` endpoint returned 404.
- Restarted API PID 1529 from current `v4/v4_api.py`; verified real NQ 4h and
  1D target bars.
- Added target-bars health capability metadata.
- Added viewport-sized target-history windows and a 24-bar left prefetch
  threshold.
- Preserved replay/source/chart owner boundaries.

## Commits

- `39a7c96e` `fix(v4): advertise target bars capability`
- `b8d661e7` `fix(v6): size target history to viewport`
- `34bfc6bb` `fix(v6): prefetch history before the left edge`

## Verification

- HTF performance browser smoke passed with target path for 4h/8h/1D/1W.
- Target-history diagnostics browser pack passed `8/8`.
- Continuous leftward history browser smoke passed.
- Relevant pure/runtime/boundary smokes passed.

## Next

Step 400 is real-service visual acceptance on the user's V6 page, followed by
the deferred active-pane loaded-window date locator if accepted.
