# V6 Step 279 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 280 should implement **Target-Timeframe Data Contract And Schema
Discovery**.

This is Phase A from
`v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md`. The purpose is to
define the target-timeframe data contract before changing runtime behavior or
making chart-history request target bars.

## Why This Slice

Manual testing exposed that high-timeframe leftward extension can still make
the workstation less fluid when V6 fetches large `1m` source windows and
projects them on the frontend. Step 277 reduced the visible batching problem by
scaling source windows, but that increases work on fetch, normalization,
projection, cache, and full-series replacement.

Step 278 accepted the deeper fix: high-timeframe browsing should request target
bars such as `8h` or `1D` from the data layer, while replay precision continues
to use source `1m` bars.

The next bounded step should not implement aggregation yet. It should define
the contract, supported timeframe ids, session-aware bucket rules, and schema
discovery result that later API/runtime work will consume.

## Selected Scope

Step 280 should define Target-Timeframe Data Contract And Schema Discovery:

- add a target timeframe domain/contract for supported display ids:
  `1/2/3/4/5/10/15/30m`, `1/2/4/8/12h`, `1D`, `1W`, `1M`;
- define canonical ids for API/cache/chart-data/test use;
- define which target timeframes are fixed-duration and which are
  session-aware;
- document daily/weekly/monthly futures bucket semantics at the contract level;
- audit the current V4/DuckDB source bars schema and V6 bars adapter inputs;
- decide the initial storage direction for target bars: one table keyed by
  instrument/timeframe/timestamp unless discovery proves that per-timeframe
  tables are safer;
- add pure/static tests for the contract and schema discovery notes.

## Owner Boundaries

- Time-domain or target-timeframe domain owns id normalization and bucket type
  classification.
- Bar-data owns future target-TF request/cache keys, but Step 280 should not
  change bar-data runtime behavior.
- Data/API layer owns source schema discovery notes and future aggregation
  implementation.
- Chart-history/display-timeframe should not request target bars in Step 280.
- Replay remains source-`1m` driven.

## Non-Goals

- Do not implement server aggregation, materialized bars, cache warming, or
  target-TF API endpoints.
- Do not route display-timeframe switching or leftward history through target
  bars yet.
- Do not remove frontend projection fallback.
- Do not change replay cursor movement, no-bar gap skipping, chart viewport
  intent, chart-engine behavior, or chart-data runtime behavior.
- Do not add seconds, custom interval UI, indicators, order tickets, prop-firm
  workflows, journal workflows, or SMC/ICT overlays.

## Suggested Verification For Step 280

- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/target-timeframe-schema-discovery-step280-static-smoke.js`
- `node v6/tests/session-aware-display-timeframe-domain-step271-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 280 has exactly one implementation target.
- The selected slice directly follows the Step 278 phase plan.
- Runtime, API, database, projection, replay, viewport, chart-engine, and
  chart-data behavior remain unchanged in Step 279.
