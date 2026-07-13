# V6 Settings Canvas View And Controls - Step 411

Date: 2026-07-13

## Decision

Canvas view preferences remain one Settings transaction, but they do not share
one mutation owner:

- navigation visibility and top/bottom price-scale margins flow through the
  Settings-to-Chart-Surface bridge;
- right-side K-line margin flows through a dedicated Settings-to-Chart-Viewport
  bridge and Chart Viewport commands/events;
- Settings never writes a Lightweight Charts instance or viewport directly.

This split is required because right-side margin is replay viewport intent,
not a cosmetic chart option.

## Active Controls

- Navigation: `On hover`, `Always visible`, `Hidden`;
- Top margin: integer `0..40%`;
- Bottom margin: integer `0..40%`;
- Right margin: integer `0..100` bars.

The defaults are hover navigation, 10% top, 8% bottom, and 8 right-side bars.
Settings schema v3 migrates v1/v2 records to these defaults.

## Viewport Invariants

- committing a right-margin change reprojects panes that still use the default
  wall;
- a pane with a manual wall keeps its measured range and does not jump;
- the changed value is still recorded as that pane's default, so Reset uses it;
- all visible/current and future panes obtain the same global preference;
- draft changes do nothing until OK, and Cancel discards them.

## Automated Gate

Passed:

- Settings v3 migration/validation and transactional UI smokes;
- Chart Surface option mapping and multi-pane application smokes;
- Chart Viewport store/runtime manual-wall preservation smokes;
- Settings-to-Chart-Viewport bridge smoke;
- Step 411 browser test covering draft isolation, direct controls, default-wall
  reprojection, manual-wall preservation, Reset, persistence, and hard reload;
- adjacent Step 409/410 browser tests;
- full chart browser regression pack `28/28`;
- V6 boundary smoke and `git diff --check`.

## Human Gate

Passed. The user visually accepted navigation visibility, top/bottom margins,
right margin, manual-drag preservation, Reset, and hard reload on the real
chart. Step 411 is closed.

## Next

Implement Step 412 Canvas Session Breaks through Session Calendar ownership.
It should support `18:00`, `00:00`, both, and hidden without embedding calendar
calculations in Settings or Chart Surface.
