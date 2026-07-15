import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const archivedTodo = await readFile('v6/archive/TODO_THROUGH_STEP453.md', 'utf8');
const archivedIndex = await readFile('v6/archive/DOCS_INDEX_THROUGH_STEP453.md', 'utf8');

assert.equal(todo.split('\n').length < 100, true);
assert.equal(index.split('\n').length < 100, true);
assert.match(todo, /Milestone stabilization Steps 438-454 are complete/);
assert.match(index, /current-state\s+router/);
assert.equal(archivedTodo.split('\n').length > 10_000, true);
assert.equal(archivedIndex.split('\n').length > 900, true);

const ledgerAssertion = classifyTestFile({
  path: 'v6/tests/historical-closeout-static-smoke.js',
  source: "const todo = await readFile('v6/TODO.md', 'utf8');",
});
assert.equal(ledgerAssertion.role, 'support');

console.log('v6 current ledger routing smoke passed');
