import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_ACTIVE_PANE_DATE_LOCATOR_SELECTION_STEP398.md', 'utf8');

assert.match(doc, /Step 399 - Active-Pane Loaded-Window Date Locator/);
assert.match(doc, /nearest existing bar/);
assert.match(doc, /replay cursor and source bars are unchanged/i);
assert.match(doc, /Bar Data receives zero requests/);
assert.match(doc, /No fetch when the requested time is outside the loaded window/);
assert.match(doc, /No copy of the V5 Chart Runtime ownership model/);

console.log('v6 active pane date locator selection step398 static smoke passed');
