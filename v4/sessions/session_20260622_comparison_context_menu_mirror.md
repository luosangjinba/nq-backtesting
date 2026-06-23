# Session: Comparison Context Menu Mirror

Date: 2026-06-22

## Goal

Make the Comparison Window right-click menu follow the same high-level structure as the Main chart context menu, so users do not have to learn a separate reduced menu shape.

## Decision

Mirror the Main menu's group layout first, while keeping unsupported Comparison actions disabled.

Reason:

- The previous Comparison menu was a compact standalone menu with only PDA, Segment, Order Setup Evidence, Locate, and copy actions.
- The Main menu has more groups: Locate, Order Setup, Live Records, PDA, SMT, Segment, Point Sets, Chart Note, Time Overlays, Objective Gaps, and Clear.
- Several Main actions are tied to Main-specific state or need additional source-context routing before they can safely write Comparison-owned objects.
- Showing unsupported actions as disabled avoids accidental writes to the wrong chart context while making the intended menu parity visible.

## Implemented

Updated `v4/src/comparison/comparison-context-menu.js`:

- Reorganized Comparison right-click menu into Main-style groups:
  - Locate
  - Order Setup Evidence
  - PDA
  - SMT
  - Segment
  - Point Sets
  - Chart Note
  - Time Overlays
  - Objective Gaps
  - Clear
- Kept existing working Comparison actions enabled:
  - Comparison PDA: BSL, SSL, Wick CE, FVG, IFVG, OB Last Bar.
  - Comparison Segment start/end actions.
  - Order Setup evidence and link actions.
  - Locate Time in Main.
  - Copy Comparison Time / Price.
- Marked not-yet-wired Comparison actions disabled with a tooltip:
  - Bullish/Bearish OB.
  - Bullish/Bearish Breaker.
  - Fib.
  - SMT creation.
  - Point Sets.
  - Chart Notes.
  - Time Overlays / Killzones.
  - Objective Gaps.
  - Clear PDA / Segments / Killzones.

## Verification

Ran:

```bash
node --check v4/src/comparison/comparison-context-menu.js
git diff --check
node v4/tests/comparison-window-browser-smoke.js
```

Result:

- Browser smoke passed.
- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.

## Follow-Up

Future work can wire currently disabled groups one by one, but each group needs explicit source-context handling and tests so actions do not write Main-owned objects from the Comparison Window.
