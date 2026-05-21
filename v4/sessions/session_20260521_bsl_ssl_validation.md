# V4 BSL/SSL Validation Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Add a mechanical swing validation layer for manual BSL/SSL annotations.
- Validation is advisory only and must not block manual marking.

## Rules
- D: left 1 / right 1
- 4H: left 1 / right 1
- 1H: left 2 / right 2
- 30M: left 3 / right 3
- 15M: left 4 / right 4
- 5M and 1M are intentionally not validated yet to avoid noisy checks and extra scanning burden.

## Behavior
- Mark BSL/SSL still always creates the annotation.
- If the selected point satisfies the current timeframe swing rule, validation is stored as valid.
- If it does not satisfy the rule, the annotation is still stored, but status shows a warning.
- Validation is separate from context:
  - validation answers whether the point is a valid current-timeframe swing
  - context answers which timeframe highs/lows the price belongs to

## Completed
- Added `v4/src/pda/pda-swing-validator.js`.
- Manual BSL/SSL annotations now include a `validation` object.
- Status text reports warnings for invalid current-timeframe swings while preserving the annotation.

## Verification
- `node --check v4/src/pda/pda-swing-validator.js`
- `node --check v4/src/pda/manual-annotation.js`
- Node smoke checks covered valid swing high, invalid swing high, and unsupported 5M validation.
