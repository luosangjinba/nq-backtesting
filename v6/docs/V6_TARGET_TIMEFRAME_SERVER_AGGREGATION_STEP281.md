# V6 Step 281 - Target-Timeframe Server Aggregation Boundary

Date: 2026-07-10

## Decision

Step 281 adds the first backend/data-layer target-timeframe aggregation
boundary.

The new path is backend-only from V6's perspective. It does not route
display-timeframe switching, leftward history, replay, chart-data, or
chart-engine behavior through target bars yet.

## Implemented Boundary

Backend service:

- `v4/server/target_bars_service.py`
- aggregates target bars on demand from authoritative `futures_1m` source bars;
- supports `8h` fixed-duration bars and `1D` session-aware futures daily bars
  in the Step 281 smoke path;
- normalizes canonical target ids such as `8h` and `1D`;
- keeps an in-process cache keyed by instrument, target timeframe, start, and
  end;
- returns target bars, not the underlying source `1m` bars.

Backend endpoint:

- `GET /v4/target_bars`
- query params: `instrument`, `start`, `end`, `tf`
- response includes `bars`, `requestedRange`, `targetTimeframe`, `cacheHit`,
  and `source`.

V6 adapter contract:

- `v6/src/bar-data/v4-target-bars-adapter.js`
- builds `/v4/target_bars` URLs using the Step 280 canonical target timeframe
  ids;
- validates that responses include a `bars` array;
- is not registered with bar-data runtime and is not used by chart-history or
  display-timeframe runtime yet.

## Preserved Behavior

- Existing `GET /v4/bars` behavior remains unchanged and still accepts
  integer-minute `tf`.
- V6 frontend owners still request bars through the existing source-bar path.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-data, chart-engine, and frontend projection behavior remain unchanged.
- No database schema or persistent `target_bars` table was created.

## Verification

- `python3 v4/tests/target-bars-service-step281-smoke.py`
- `python3 v4/tests/target-bars-api-boundary-step281-smoke.py`
- `node v6/tests/v4-target-bars-adapter-step281-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `python3 v4/tests/bars-service-boundary-smoke.py`
- `python3 v4/tests/backend-handler-boundary-smoke.py`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 282 should add bar-data runtime target-TF support behind an explicit
contract, still without making display-timeframe or leftward-history request
target bars by default.
