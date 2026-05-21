# V4 EQH/EQL Point-Set Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Implement Step 13: manual EQH/EQL point-set grouping.
- Keep EQH/EQL as a collection structure, not a tag on a single BSL/SSL point.
- Keep the feature session-scoped with no database writes.

## Completed
- Added `PointSetPrimitive` in `v4/src/chart/primitives.js`.
- `PointSetPrimitive` draws:
  - a dashed reference price line from first visible point to last visible point
  - a label on the right side of the set
  - small outside triangle markers for selected points
  - no selected-point circles, so wick inspection stays unobstructed
- Updated `pda-renderer.js` to render `shape: point-set` annotations.
- Updated `pda-store.js` identity handling for point-set annotations and added ID-based upsert for draft previews.
- Added EQH/EQL registry details in `pda-types.js`.
- Added right-click workflow in `manual-annotation.js`:
  - `Start EQH Set`
  - `Start EQL Set`
  - `Add EQH/EQL Point`
  - `Finish EQH/EQL`
  - `Cancel Set`
- Escape, Clear PDA, bars reload, and bars clear now cancel any in-progress point-set selection.
- After the second selected point, the in-progress set is rendered as a draft annotation and updates as more points are added.

## Behavior
- EQH points use the selected bar high.
- EQL points use the selected bar low.
- EQH reference line uses the highest selected high.
- EQL reference line uses the lowest selected low.
- EQH point markers render above the EQH line; EQL point markers render below the EQL line.
- Marker placement is tied to the set line rather than each wick, so multiple EQH/EQL sets can be distinguished by membership.
- Finishing requires at least two points.
- The set stores all selected points plus the reference price used for the line.
- Before finish, the same reference line is shown as a `draft` annotation; finish removes the draft and creates the final manual annotation.
- Status text reports point count, reference price, and spread.
- Cross-timeframe rendering maps each point timestamp to the current chart timeframe bucket, reusing existing PDA anchor mapping behavior.

## Not Included
- No strict equal-high/equal-low tolerance gate.
- No automatic point-set scanner.
- No persistence/localStorage/YAML/DB writes.
- No edit/remove-one-point UI for an unfinished or finished set.

## Verification
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/pda/pda-store.js`
- `node --check v4/src/pda/pda-types.js`
- `git diff --check`

## Next
- Decide whether EQH/EQL needs a tolerance rule before finishing, for example exact tick match versus max spread threshold.
- Consider adding edit/delete-point controls if manual grouping becomes frequent.
- Consider localStorage persistence after the manual annotation workflow stabilizes.
