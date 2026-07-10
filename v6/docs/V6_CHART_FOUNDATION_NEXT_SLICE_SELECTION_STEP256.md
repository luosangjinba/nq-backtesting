# V6 Step 256 - Chart Foundation Next Slice Selection

Date: 2026-07-10

## Decision

Step 257 should implement **Visible K-Line Latency Regression Pack**.

This is a bounded chart-foundation regression slice. It should add a compact
pack focused on the V6 visible-candle latency contract across cache-hit replay,
mixed timeframe replay, HTF manual next, HTF auto-play, and replay-safe
leftward history latency.

## Why This Slice

Steps 245-255 now provide focused packs for replay/transport, multi-pane
foundation behavior, and date-range/boundary/chart-entry behavior. The
remaining roadmap-level V5 failure class that deserves its own focused pack is
visible K-line delay.

V6 already has several latency gates, but they are spread across different
feature steps:

- cache-hit visible candle latency proves already-buffered replay data stays on
  the visible path;
- mixed-timeframe visible latency protects pane/TF projection latency;
- manual-next HTF visible latency protects higher-timeframe chart-data
  projection on user input;
- auto-play HTF visible latency protects timer-driven replay rendering;
- replay-safe leftward history latency protects replay controls while delayed
  older-history extension is pending.

Step 257 should collect these into one compact latency pack so chart/replay,
display-timeframe, chart-data, chart-surface, and viewport changes can verify
the visible-candle contract without running the full chart browser pack.

## Owner Boundaries

- Replay runtime owns cursor/reveal state and command latency input.
- Chart-entry/manual-next/auto-play owners coordinate replay commands with
  chart-data updates.
- Chart-data runtime owns append/replace records and projection output.
- Chart viewport owns visible-range projection intent.
- Chart surface owns chart host application, visible logical range observation,
  and browser-visible candle state.
- Bar-data runtime owns cache/request metadata and must expose whether latency
  came from data fetch or visible chart application.
- Display-timeframe runtime owns timeframe projection inputs and does not own
  chart host rendering.

## Step 257 Scope

Implement Visible K-Line Latency Regression Pack:

- add a compact pack runner for visible latency browser/runtime gates;
- include cache-hit visible latency, mixed-timeframe visible latency,
  manual-next HTF visible latency, auto-play HTF visible latency,
  replay-safe leftward history latency, and the visible-latency domain gate;
- document pack purpose, membership, and expected use;
- keep the pack focused enough to run during chart/replay/chart-data/viewport
  latency-sensitive work;
- add no runtime behavior unless the pack exposes a specific owner regression.

## Non-Goals

- Do not tune thresholds or hide latency by loosening assertions in this
  selection step.
- Do not change replay semantics, chart-data projection, display timeframe
  behavior, bar-data requests, or viewport logic.
- Do not add new supported timeframes or custom interval UI.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

## Suggested Verification For Step 257

- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Acceptance For This Selection

- Step 257 has one visible K-line latency regression pack target.
- The selected slice stays inside chart foundation regression coverage.
- Verification commands are listed before implementation starts.
- Runtime behavior is unchanged in Step 256.
