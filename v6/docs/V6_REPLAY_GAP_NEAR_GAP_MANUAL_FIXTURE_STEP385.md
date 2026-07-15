# Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe

Status

Completed.

## Scope

This step implemented the standalone near-gap manual replay fixture selected in
Step 384.

It did not change runtime behavior, `v6/src/app.js`, Step 274 replay-gap pack
membership, or Step 276 foundation pack membership.

## Fixture

Command:

- `node v6/tests/replay-gap-near-gap-manual-fixture-browser-step385-smoke.js`

The fixture creates a manual browser replay session:

- start: `2026-06-01T16:50`;
- end: `2026-06-01T18:10`;
- seeded replay cursor: `2026-06-01T16:58:00.000Z`.

Covered display timeframes:

- low-TF: `1m`, `5m`, `15m`;
- HTF: `1D`, `1W`, `1M`.

## Result

All six cases passed with the same near-gap path:

```text
16:58 -> 16:59 -> 18:00 -> 18:01
```

The fixture proves the fast path can reach the no-bar session gap with `2`
Manual Next calls before the final post-gap next, instead of repeating the
long-path `86` Manual Next loop in each case.

Observed summary:

| Case | Pre-gap Manual Next count | Seed index | Final index |
| --- | ---: | ---: | ---: |
| `1m` | 2 | 8 | 71 |
| `5m` | 2 | 8 | 71 |
| `15m` | 2 | 8 | 71 |
| `1D` | 2 | 8 | 71 |
| `1W` | 2 | 8 | 71 |
| `1M` | 2 | 8 | 71 |

Replay cursor index and revealed count stay aligned to the source `1m` time
axis: `16:58` is index `8`, `18:00` is index `70`, and `18:01` is index `71`
from the `16:50` replay start.

## Assertions

For every case, the fixture asserts:

- chart-entry apply reaches `applied`;
- requested display timeframe is applied;
- Manual Next path is exactly `16:58 -> 16:59 -> 18:00 -> 18:01`;
- pre-gap Manual Next count is `2`;
- each Manual Next result advances;
- replay cursor time, cursor index, and revealed count stay aligned;
- chart bars remain non-empty;
- `1m` latest chart bar reaches `2026-06-01T18:01:00.000Z`;
- projected non-`1m` buckets include source timestamp
  `2026-06-01T18:01:00.000Z`;
- HTF projection keeps target timeframe and cursor cap;
- HTF footer cursor reads `Cursor 18:01`.

## Next Recommendation

Step 386 should decide how to use the proven near-gap fixture in the replay-gap
regression strategy:

- keep it standalone;
- add it as a fast pack member while preserving the long-path source case;
- or split fast and full replay-gap commands.

The implementation decision should keep one long-path manual source assertion
available.
