# V6 Session - Step 222 Chart Entry Projection Preparation Time Helper Migration

Date: 2026-07-09

## Summary

Step 222 routed chart-entry projection-preparation domain/runtime cursor and
optional session timestamp parsing through shared `time-domain` helpers while
preserving prepared payloads, projection dispatch payloads, cursor lookup, and
chart browser behavior.

## Changes

- Updated `v6/src/chart-entry/chart-entry-projection-preparation.js` so
  cursor timestamp parsing uses `normalizeUnixSeconds` behind the existing
  local `parseCursorTimestamp` wrapper.
- Updated `v6/src/chart-entry/chart-entry-projection-preparation-runtime.js`
  so cursor timestamp parsing uses `normalizeUnixSeconds`.
- Updated optional session timestamp parsing in the projection-preparation
  runtime to use `normalizeOptionalUnixSeconds`.

## Preserved Boundaries

- Chart-entry projection preparation still owns prepared payload construction,
  cursor lookup, and projection-preparation state.
- The runtime still owns command/event orchestration only.
- Error text, prepared payloads, projection dispatch payloads, cursor lookup,
  and chart browser behavior were preserved.
- Manual-next, pane-intent-reload, layout bootstrap, TF support, indicators,
  Pine Script compatibility, SMC/ICT overlays, trading, order tickets, prop firm
  rule engines, and pseudo-live simulation behavior were not changed.

## Verification

- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/initial-htf-chart-entry-browser-step195-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `3e0ca34f refactor(v6): share projection preparation cursor parsing`
- `a63f9295 refactor(v6): share projection preparation runtime time parsing`

## Next

Step 223 should migrate only `chart-entry-manual-next-runtime.js` local TF
parsing, replay timestamp parsing, and projection-source summary through
`time-domain`.
