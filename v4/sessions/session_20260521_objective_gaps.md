# V4 Objective Gap Overlay Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Continue Step 11/12 after manual FVG and OB range work.
- Add objective gap overlays as passive, on-demand chart ranges.
- Do not persist objective gaps and do not auto-expand the chart data range.

## Completed
- Added `v4/src/pda/objective-gaps.js`.
- Added right-click menu commands:
  - `Show/Hide Today NDOG`
  - `Show/Hide This Week NWOG`
- `NDOG`:
  - keyed by the clicked bar's CME trading day
  - requires the current display range to include that day's `18:00` open
  - requires the loaded data to include the previous session close
  - range is `previous close -> day open`
- `NWOG`:
  - keyed by the clicked bar's Sunday `18:00` week start
  - requires the current display range to include this week's Sunday `18:00` open
  - requires the loaded data to include the previous week close
  - range is `previous week close -> week open`
- Both overlays:
  - use existing range annotations and `RangePrimitive`
  - are source `objective`
  - are toggled by deterministic objective IDs
  - use semi-transparent fill and no border
  - show a status error if the required open/close bars are outside the current loaded/display data

## Not Included
- No database writes.
- No automatic full-range objective PDA scan.
- No automatic data reload when a gap is outside the loaded range.
- No EQH/EQL point-set work.

## Verification
- `node --check v4/src/pda/objective-gaps.js`
- `node --check v4/src/pda/manual-annotation.js`
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8000/v4/index.html`

## Next
- Step 13: EQH/EQL point-set grouping and rendering, after deciding how strict equal-high/equal-low grouping should be.
