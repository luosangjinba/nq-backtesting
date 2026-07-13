import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_PRODUCT_FOUNDATION_GAP_REAUDIT_STEP398.md', 'utf8');

assert.match(doc, /Step 276 foundation pack passed `8\/8` in `45651ms`/);
assert.match(doc, /Step 253 multi-pane foundation pack passed `9\/9` in `27520ms`/);
assert.match(doc, /Step 255 date-range boundary-entry pack passed `7\/7` in `19151ms`/);
assert.match(doc, /missing post-entry user action/);
assert.match(doc, /superseded by the Step 402 Go-to semantic correction/);
assert.match(doc, /former Active-Pane Loaded-Window Date Locator selection is rejected/);

console.log('v6 product foundation gap reaudit step398 static smoke passed');
