# Step 437 - V5 Lock Price-To-Bar Ratio Settings Contract

## Status

Completed.

## Goal

Implement the Settings backlog `Lock price-to-bar ratio` row through a
chart-engine presentation contract rather than a direct UI-to-chart shortcut.

## Plan

- Step 437.1: Treat lock price-to-bar ratio as a `chart-engine-contract`
  Settings row because it changes chart interaction behavior.
- Step 437.2: Add `scaleStyle.lockPriceToBarRatio` to presentation contracts
  and runtime normalization with default `false`.
- Step 437.3: Carry the setting through chart-engine context and presentation
  metadata.
- Step 437.4: Map the setting in the Lightweight adapter by disabling
  price-axis drag scaling while preserving time-axis zoom.
- Step 437.5: Add a Settings `Scales and lines` draft checkbox that applies
  only through `Ok`.
- Step 437.6: Update specs, backlog matrix, runtime smoke, adapter smoke,
  browser smoke, full smoke, and `git diff --check`.

## Changes

- Added `scaleStyle.lockPriceToBarRatio` to chart presentation defaults,
  normalization, and context normalization.
- Updated chart-engine presentation mapping so Lightweight receives
  `handleScale.axisPressedMouseMove: false` when the setting is enabled.
- Exposed the setting in the Settings modal under `Scales and lines`.
- Added fallback/Lightweight metadata coverage through
  `data-lock-price-to-bar-ratio` and
  `data-handle-scale-axis-pressed-mouse-move`.
- Updated `v5/docs/SETTINGS_BACKLOG_MATRIX.md`,
  `v5/docs/specs/chart-presentation-settings.md`, `v5/TODO.md`, and this
  handoff.

## Guardrails

- UI still edits a draft and applies through presentation runtime commands.
- The chart route does not call chart-engine APIs directly for this setting.
- Applying the setting must not request bars, mutate replay cursor, or mutate
  replay `displayBars`.
- The current Lightweight semantics lock price-axis drag scaling only; time
  axis zoom remains enabled.

## Verification

- `node --check v5/src/contracts/chart-presentation-contracts.js`
- `node --check v5/src/runtime/chart-presentation-runtime.js`
- `node --check v5/src/runtime/chart-engine-context.js`
- `node --check v5/src/runtime/chart-engine-presentation.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 438 should continue Settings backlog work with another explicit contract
row. `No-overlap labels` is a chart-engine label/collision contract; `Session
breaks` is a replay/session calendar contract. Pick based on whether the next
priority is chart readability or replay session semantics.
