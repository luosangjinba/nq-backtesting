# Session 2026-07-12 - Step 400 Unified Target History Full-Timeframe

## User evidence

Manual screenshots showed that Step 399 repaired `4h` and `1D`, while `1W` and
`1M` still displayed the old small-batch extension behavior. The user also
identified the architectural requirement: `30m`, `1h`, and `2h` must not use a
different feature implementation from `4h`, `8h`, `12h`, `1D`, `1W`, and `1M`.

## Changes

1. Added weekly and monthly session-calendar aggregation to the existing target-
   bars service.
2. Unified frontend target-history activation for the supported matrix beginning
   at `30m`.
3. Added a production-service matrix harness covering all nine periods.
4. Added a real API browser harness covering representative lower fixed periods
   and the repaired weekly/monthly periods.
5. Preserved the established source-window automatic chain below `30m` after a
   full-pack regression exposed an over-broad `15m` activation.

## Commits

- `92fe635a` `feat(v4): aggregate weekly and monthly target bars`
- `1f49de3f` `fix(v6): unify target history activation`
- `fb005cca` `test(v4): verify full target timeframe matrix`
- `e540695f` `fix(v6): preserve low timeframe history chaining`

The final documentation/browser-harness commit is recorded by the repository
history containing this session file.

## Verification

- real service matrix: passed for `30m`, `1h`, `2h`, `4h`, `8h`, `12h`, `1D`,
  `1W`, and `1M`;
- live HTTP verifier: passed all nine periods;
- real API browser matrix: all selected periods used `target-history`, one target
  request, and zero source requests;
- target-history diagnostics regression pack: `8/8`;
- low-period automatic-chain browser smoke: passed;
- chart browser regression pack: `28/28`.

## Next recommendation

Step 401 is a focused human visual gate for `30m`, `1h`, `2h`, `1W`, and `1M`.
After it passes, return to the deferred Active-Pane Loaded-Window Date Locator.
