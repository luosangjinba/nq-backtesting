import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const document = await readFile(
  'v6/docs/V6_POST_STABILIZATION_FOUNDATION_REAUDIT_STEP461.md',
  'utf8',
);
const normalizedDocument = document.replaceAll(/\s+/g, ' ');

for (const required of [
  'conditionally ready',
  'no known P0 chart-foundation defect',
  'Product Infrastructure, Not Foundation Repair',
  'It does not release implementation',
  'chart-owned projection interface',
]) {
  assert.equal(normalizedDocument.includes(required), true, required);
}

assert.equal(
  document.includes('create a second chart'),
  false,
  'foundation assessment must not authorize a second chart path',
);

console.log('v6 post-stabilization foundation re-audit step461 smoke passed');
