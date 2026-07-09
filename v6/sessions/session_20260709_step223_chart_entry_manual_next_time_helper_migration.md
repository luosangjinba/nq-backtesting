# V6 Session - Step 223 Chart Entry Manual-Next Time Helper Migration

Date: 2026-07-09

## Summary

Step 223 routed chart-entry manual-next TF parsing, replay timestamp parsing,
cursor-bar picking timestamp parsing, and projection-source summary through
shared `time-domain` helpers while preserving manual-next behavior.

## Changes

- Updated `v6/src/chart-entry/chart-entry-manual-next-runtime.js` so local
  timeframe parsing uses `normalizeMinuteTimeframe` behind the existing
  `normalizeTimeframeMinutes` wrapper.
- Updated replay cursor/start timestamp parsing to use `normalizeUnixSeconds`
  behind the existing `parseReplayTimestamp` wrapper.
- Updated non-projected cursor bar picking to reuse `parseReplayTimestamp`.
- Replaced the local projection-source summary builder with
  `summarizeProjectionSource`.

## Preserved Boundaries

- Chart-entry manual-next still owns append orchestration, playback-period
  stepping, pane fanout, and loaded-window handoff.
- Projection remains owned by chart-data-projection.
- Manual-next append payloads, projection dispatch payloads, cursor bar picking,
  playback-period stepping, and error text were preserved.
- Pane-intent reload, layout bootstrap, TF support, indicators, Pine Script
  compatibility, SMC/ICT overlays, trading, order tickets, prop firm rule
  engines, and pseudo-live simulation behavior were not changed.

## Verification

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `47306e4e refactor(v6): share manual next time parsing`
- `fa9cc76b refactor(v6): share manual next projection summary`

## Next

Step 224 should migrate only
`v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js` window
cursor parsing, integer timeframe parsing, optional session timestamp parsing,
and projection-source summary through `time-domain`.
