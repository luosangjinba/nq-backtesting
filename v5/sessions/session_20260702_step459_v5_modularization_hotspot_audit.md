# Step 459 - V5 Modularization Hotspot Audit

Status: completed.

Date: 2026-07-02

## Goal

Pause broad chart-engine refactoring, measure current code hotspots, and choose
whether the next step should continue refactoring or return to a verified
product issue.

## Plan

1. Recount current chart replay feature, runtime, chart-engine, and CSS module
   sizes.
2. Confirm the Step 458 rename left no source/test imports of
   `chart-engine-presentation.js`.
3. Record current hotspots and ownership interpretation.
4. Update TODO and session handoff with the next step recommendation.
5. Run boundary and focused smoke checks.

## Audit Results

- Feature chart replay modules: 2400 total JS lines.
- `chart-replay-route.js`: 407 lines.
- Settings modules are split: `chart-settings-template.js` is 250 lines, and
  modal, panel, lifecycle, draft, bindings, and section adapters are all 179
  lines or smaller.
- Runtime modules: 5082 total JS lines.
- Largest runtime files: `chart-runtime.js` at 484 lines,
  `replay-navigation-controller.js` at 403 lines, `bar-data-runtime.js` at 324
  lines, and `chart-engine-lightweight-adapter.js` at 305 lines.
- CSS modules: 1217 total CSS lines; `app.css` remains 616 lines.
- Source and tests no longer import `chart-engine-presentation.js`.

## Decision

- Do not continue broad chart-engine splitting immediately.
- Keep monitoring `chart-runtime.js`, `chart-replay-route.js`,
  `replay-navigation-controller.js`, and `app.css`.
- Split future hotspots only when a concrete product step exposes a clean
  contract.
- Next candidate is a product step: Layout split panes contract/planning before
  implementation, because multi-chart ownership and sync rules must be explicit.

## Implementation Notes

- Updated `chart-engine-boundary-smoke.js` so
  `chart-engine-lightweight-options.js` is an allowed chart-engine API boundary
  file. That module owns Lightweight `timeScale` option mapping after Step 457.

## Verification

- `node v5/tests/boundary-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `git diff --check`

## Next Step Candidate

Step 460 should define the Layout split panes contract before implementation.
