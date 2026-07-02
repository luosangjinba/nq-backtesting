# Step 429 - V5 Settings Backlog Matrix And Price Scale Side

Status: completed.

## Trigger

Resume Settings work after chart-engine modularization without mixing pure
presentation controls with chart-engine, replay-runtime, persistence, or future
pane concerns.

## Plan

1. Document a Settings backlog ownership matrix.
2. Pick one low-risk presentation-runtime setting to implement now.
3. Add the setting to presentation contracts/runtime normalization.
4. Wire Settings draft UI through `Ok`/`Cancel` semantics only.
5. Apply the setting through chart display context and chart-engine adapter
   options, not direct UI calls to chart APIs.
6. Add runtime/adapter/browser smoke coverage and run full V5 smoke.

## Implementation

- Added `v5/docs/SETTINGS_BACKLOG_MATRIX.md` and linked it from
  `v5/docs/INDEX.md`.
- Added `scaleStyle.priceScaleSide` with `right` and `left` values to chart
  presentation contracts and normalization.
- Added a `Price scale side` select to the Settings `Scales` section.
- Mapped the side through chart display context to Lightweight left/right price
  scale visibility and series `priceScaleId`.
- Added smoke coverage for the default right side, applied left side, and
  invalid side rejection.

## Guardrails

- Price scale side is display-only and does not mutate replay cursor,
  `displayBars`, bar requests, sessions, or persistence.
- `priceScaleVisible` remains the visibility switch; side only chooses left or
  right when the price scale is shown.
- Settings UI still edits draft state until `Ok`; cancel/close/backdrop discard
  the draft.
- Non-presentation settings remain matrix rows until a dedicated contract step
  defines their owner and acceptance harness.

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

Step 430 should plan the first high-risk settings contract before UI. The best
candidates are lock price-to-bar ratio or countdown/session breaks because both
need explicit runtime/adapter ownership and smoke acceptance before controls are
added.
