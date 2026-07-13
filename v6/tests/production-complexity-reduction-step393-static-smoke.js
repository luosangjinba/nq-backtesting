import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [doc, todo, index, handoff, html] = await Promise.all([
  readFile('v6/docs/V6_PRODUCTION_COMPLEXITY_REDUCTION_STEP393.md', 'utf8'),
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/index.html', 'utf8'),
]);

assert.match(doc, /Step 393 - Production Complexity Reduction/);
assert.match(doc, /Step 394 should consolidate historical static closeout tests/);
assert.match(todo, /Step 394 - Historical Static Closeout Test\s+Consolidation/);
assert.match(index, /V6_PRODUCTION_COMPLEXITY_REDUCTION_STEP393\.md/);
assert.match(handoff, /Latest completed step: Step 393/);
assert.match(html, /\.\/vendor\/lightweight-charts\.standalone\.production\.js/);
assert.doesNotMatch(html, /\.\.\/v5\/vendor/);

console.log('v6 production complexity reduction step393 static smoke passed');
