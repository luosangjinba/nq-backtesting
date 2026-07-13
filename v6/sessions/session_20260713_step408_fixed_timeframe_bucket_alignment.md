# Session 2026-07-13 - Step 408 Fixed Timeframe Bucket Alignment

## Trigger

The Step 407 human recheck showed whole-hour `1h` history switching to
half-hour buckets after New York Session Go-to, and canonical `4h` history
mixing with `09:30`-anchored bars after Asian Session Go-to.

## Completed

- traced the mismatch to caller-owned `sessionStartTimestamp` projection
  origins rather than Replay Navigation target selection;
- moved fixed-duration alignment policy into `target-timeframe-domain`;
- matched frontend source projection to target-bars service alignment;
- retained clock alignment for `1h` and the established two-hour offset for
  `4h`;
- added deterministic projection and real NQ browser gates;
- kept Manual Next `5/5`, visible latency `6/6`, target-bars matrix, and final
  chart browser `28/28` green;
- retained the `160ms` latency gate and made failures print measured latency.

## Commits

- `64328b3a fix(v6): unify fixed timeframe bucket alignment`
- `0332100f test(v6): gate goto fixed timeframe alignment`
- `76383614 test(v6): expose manual next latency measurements`
- documentation and governance closeout: this commit.

## Next

Hard reload and repeat the user's `1h` New York and `4h` Asian paths. Step
407/408 remains open until crosshair inspection confirms one stable canonical
grid across old and newly appended bars.
