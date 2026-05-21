# V4 PDA Export / Import Session

## Branch
- `feature/v4-pda-export-import`

## Goal
- Add a portable PDA archive layer after localStorage draft persistence.
- Keep this as file-based JSON archive first; do not introduce a database.

## Completed
- Added `v4/src/pda/pda-archive.js`.
  - Exports non-draft PDA annotations as JSON.
  - Archive schema includes `app`, `version`, `exportedAt`, `instrument`, `timeframe`, `range`, and `annotations`.
  - Import validates `app` and `version`.
  - Import filters out draft annotations.
  - Import merges into the current in-memory PDA store.
  - ID conflicts are renamed with an `-import-...` suffix and the original id is kept in `importedFromId`.
- Added Inspector Archive controls:
  - `Export PDA JSON`
  - `Import PDA JSON`
  - `Clear Saved PDA`
- Archive controls are available both when no PDA is selected and when a selected PDA is shown.
- Imported annotations go through `loadAnnotations()`, so renderer refresh and localStorage draft save are triggered by the normal `pda:changed` path.
- Added a per-annotation Inspector display toggle for current PDA label text.
  - Non-selected PDA labels are shown by default.
  - `Show current PDA label` writes the selected annotation's `display.showLabel`.
  - Label visibility persists after the PDA loses focus.
  - New PDA annotations default to visible labels.
  - The setting is part of the annotation display payload and is included in localStorage/export archives.
  - The setting only changes rendering semantics; it does not alter the structural PDA facts.
- Removed the visible rectangle border from FVG ranges.
  - Existing FVG annotations are forced to transparent borders by the renderer.
  - New manual FVG annotations store `borderColor: transparent`.
- Added per-range CE visibility editing in the Inspector.
  - FVG/OB/NDOG/NWOG show a `Show CE` checkbox in the Range section.
  - The checkbox writes `annotation.display.showCe`.
  - CE is the range midpoint dashed line; hiding it keeps the rectangle fill and labels unchanged.
  - FVG keeps a visible CE color even though its rectangle border is transparent.
- Added tick-aligned CE prices for NQ.
  - `v4/src/price-utils.js` provides tick-size rounding helpers.
  - New range annotations store `ce.raw`, `ce.price`, `ce.tickSize`, and `ce.rounding`.
  - Existing range annotations without `ce` compute it at render/Inspector time.
  - Range CE lines render at `ce.price`, not the pixel midpoint, so NQ CE is always on a 0.25 tick.
  - Inspector shows both CE and Raw CE.
- Aligned displayed chart prices to NQ tick size.
  - Candlestick series uses `priceFormat.minMove = 0.25`.
  - Chart `localization.priceFormatter` rounds displayed prices to the nearest NQ tick.
  - OHLC legend uses the same tick formatter.

## Current Behavior
- Export downloads a `.json` archive for the current browser annotations.
- Export scope is the full current PDA store, filtered to non-draft annotations.
- Export is not limited to the current visible chart viewport.
- Export does not include bar data, selection, hover, replay, or viewport state.
- Import reads a `.json` archive from disk and appends valid PDA annotations to the current set.
- Empty export is blocked with a status message.
- Unsupported archive app/version is rejected with a status error.
- PDA label text can be hidden per annotation from the Inspector without hiding PDA lines, rectangles, or EQH/EQL markers.

## Not Included
- No YAML format yet.
- No replace-import mode yet; current import is merge-only.
- No file picker styling beyond hidden native input.
- No database persistence.

## Verification
- `node --check v4/src/pda/pda-archive.js`
- `node --check v4/src/price-utils.js`
- `node --check v4/src/chart/chart-manager.js`
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`

## Next
- Add an explicit import mode choice if merge vs replace becomes important.
- Add schema migration when archive `version` changes.
- Consider YAML export after JSON schema stabilizes.
