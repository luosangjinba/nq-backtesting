# V4 Inspector Sidebar MVP Session

## Branch
- `feature/v4-inspector-sidebar`

## Goal
- Start Phase 4 with the smallest usable selection-to-sidebar chain.
- Do not add editing yet.
- Keep the sidebar generic enough to reuse beyond PDA later.

## Completed
- Added store helpers in `v4/src/pda/pda-store.js`:
  - `getAnnotationById(id)`
  - `updateAnnotation(id, patch)`
  - `replaceAnnotation(id, nextAnnotation)`
  - `deleteAnnotation(id)`
- Added `v4/src/pda/pda-selection.js`.
  - Tracks current selected PDA as `{ kind: 'pda', id, type }`.
  - Emits `pda:selected` and `pda:selection-cleared`.
  - Left click on chart selects a hit PDA.
  - Blank chart click clears selection.
  - Escape clears selection.
- Added `v4/src/pda/pda-hit-test.js`.
  - Liquidity line hit-test uses price-line pixel tolerance and rendered line span.
  - Range hit-test uses rendered rectangle bounds.
  - EQH/EQL hit-test uses reference line and point-set marker positions.
  - Draft point-set annotations are ignored.
- Added `v4/src/ui/inspector-sidebar.js`.
  - Dynamically creates `#inspector-sidebar`.
  - Opens when a PDA is selected.
  - Close button hides the sidebar without deleting selection.
  - Shows read-only fields for point, range, and point-set annotations.
- Wired selection and inspector initialization in `v4/src/app.js`.
- Added sidebar styling in `v4/style.css`.

## Current Behavior
- After marking a PDA, left-click near the rendered PDA selects it.
- Inspector opens on the right and displays:
  - common PDA metadata
  - contexts
  - validation where present
  - point/range/point-set details based on annotation shape
- Clicking blank chart space or pressing Escape clears the selection.
- Closing the sidebar only hides the panel; it does not delete annotations.

## Not Included
- No selected-PDA visual highlight yet.
- No Delete button yet.
- No editable note or extendBars yet.
- No EQH/EQL point removal yet.
- No localStorage persistence.

## Verification
- `node --check v4/src/pda/pda-store.js`
- `node --check v4/src/pda/pda-selection.js`
- `node --check v4/src/pda/pda-hit-test.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/app.js`
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8001/v4/index.html`

## Next
- Step 17: add Delete selected PDA, note, and extendBars controls.
- Step 18: make renderer honor extendBars for line/range/point-set display length.
- Step 20 can then add selected-PDA highlighting after the edit workflow is stable.
