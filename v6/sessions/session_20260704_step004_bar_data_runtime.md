# V6 Session - Step 4 Bar Data Runtime

Date: 2026-07-04 PDT

## Result

V6 Step 4 is complete. The app now has bounded bar window planning, bar
normalization, an in-memory bar window cache, a V4 `/v4/bars` adapter with
timing metadata, and a bar data runtime exposed through commands/events.

## Commits

- `a790062 feat(v6): add bar data window cache`
- `7693073 feat(v6): add v4 bars adapter`
- `dc7f958 feat(v6): register bar data runtime`
- `a853113 test(v6): gate bar data runtime`

## Verification

- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Boundary Notes

- Bar data runtime owns request planning, fetch adapter use, normalized bar
  windows, cache hit/miss behavior, and API timing metadata.
- Bar data runtime exposes `barData.planWindow`, `barData.loadWindow`,
  `barData.getWindow`, `barData.releaseWindow`, and
  `barData.getCacheSummary`.
- Bar data runtime emits `barData:windowLoaded` and `barData:windowReleased`.
- Bar data modules do not import or own chart, replay, session, or viewport
  state.

## Next

Step 5 should add replay cursor/revealed state and replay transport commands.
It must run without a chart engine and must not mutate chart bars or viewport
intent.
