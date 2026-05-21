# V4 Inspector Sidebar Plan

## Branch
- `main`

## Context
- V4 minimum usable PDA marking is now in `main`.
- Manual PDA types currently include:
  - BSL / SSL point annotations
  - FVG / OB range annotations
  - objective NDOG / NWOG overlays
  - EQH / EQL point-set annotations
- Current annotations are session-scoped and disappear on refresh.
- Next need: select an existing PDA on the chart, inspect/edit it in a hideable sidebar, and later reuse the sidebar for non-PDA tools.

## Decision
- Build a generic Inspector Sidebar, not a PDA-specific popup.
- Sidebar is a reusable right-side panel that displays the currently selected object.
- First supported selection kind is `pda`.
- Future possible selection kinds:
  - replay marker
  - structure path segment
  - session note
  - screenshot / image note

## Target Architecture

### Selection
- Add `v4/src/pda/pda-selection.js`.
- Maintain current selected PDA:
  ```js
  {
    kind: 'pda',
    id,
    type
  }
  ```
- API:
  - `selectPda(id)`
  - `clearSelection()`
  - `getSelectedPda()`
  - `initPdaSelection()`
- Events:
  - `pda:selected`
  - `pda:selection-cleared`

### Store Editing
- Extend `v4/src/pda/pda-store.js`.
- Add:
  - `getAnnotationById(id)`
  - `updateAnnotation(id, patch)`
  - `deleteAnnotation(id)`
  - `replaceAnnotation(id, nextAnnotation)`
- Store remains the single write path for sidebar edits.
- `id` should not be mutable through generic patch updates.

### Hit-Test
- Add `v4/src/pda/pda-hit-test.js`.
- Hit-test should use chart click coordinate/time/price and current annotations.
- First supported hit areas:
  - BSL/SSL line: price near rendered line and time within displayed line span.
  - Range PDA: click inside rendered rectangle.
  - EQH/EQL point-set: click near reference line or point-set markers.
- Prefer pixel-based tolerance:
  - line near hit: about 6 px
  - marker near hit: about 8 px
  - rectangle interior: direct hit

### Inspector UI
- Add `v4/src/ui/inspector-sidebar.js`.
- Add styles in `v4/style.css`.
- The sidebar can be hidden, opened, and eventually pinned.
- Selecting a PDA opens the sidebar.
- Closing the sidebar does not have to clear selection.
- Escape clears selection.

## Sidebar Read-Only Fields
- Common:
  - type
  - source
  - id
  - contexts
  - validation
  - createdAt / updatedAt
- Point PDA:
  - price
  - anchor time
- Range PDA:
  - top / bottom
  - start / end
  - direction
- EQH/EQL:
  - reference price
  - spread
  - point count
  - point list

## Editing Roadmap

### First Minimal PR
- `pda-store` get/update/delete helpers.
- `pda-selection.js`.
- `pda-hit-test.js`.
- `inspector-sidebar.js` read-only view.
- Chart click selects PDA and opens sidebar.
- Esc / blank click clears selection.

### Second PR
- Delete selected PDA from sidebar.
- Add editable `note`.
- Add editable `extendBars`.
- Renderer reads `extendBars` for lines, ranges, and point sets.
- `extendBars` changes display length only; original structural fields remain unchanged.

### Third PR
- EQH/EQL point list editing.
- Remove point from set.
- Recompute:
  - EQH reference = highest selected high
  - EQL reference = lowest selected low
  - spread
- If fewer than two points remain, delete the set or block the removal with a clear message.

### Later
- Selected PDA visual highlight.
- Add point to currently selected EQH/EQL set from right-click menu.
- localStorage persistence for all manual PDA annotations.

## Notes
- Avoid adding DB persistence before the annotation schema stabilizes.
- Keep structural facts separate from display settings:
  ```js
  {
    display: {
      extendBars,
      visible,
      colorOverride
    }
  }
  ```
- If implementation starts simpler, `extendBars` may initially live as a top-level annotation field, but should migrate into `display` before persistence.
