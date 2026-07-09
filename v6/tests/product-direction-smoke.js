import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const direction = await readFile('v6/docs/V6_PRODUCT_DIRECTION.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const architecture = await readFile('v6/docs/V6_ARCHITECTURE.md', 'utf8');
const agents = await readFile('AGENTS.md', 'utf8');

for (const text of [direction, todo, architecture, agents]) {
  assert.match(text, /SMC\/ICT/);
  assert.match(text, /prop\s+firm/i);
}

assert.match(direction, /Backtesting/);
assert.match(direction, /Journal/);
assert.match(direction, /Foundation scope:/);
assert.match(direction, /plugin-friendly/);
assert.match(direction, /not a generic FXReplay clone/);
assert.match(direction, /Deferred or undecided:[\s\S]*indicators/);
assert.match(direction, /Pine Script compatibility/);

assert.match(todo, /Current product direction:/);
assert.match(todo, /Current foundation priority:/);
assert.match(todo, /Backtesting and Journal are the two primary\s+modules/);
assert.match(todo, /select the next bounded foundation slice/);

assert.match(architecture, /Product Module Rule/);
assert.match(architecture, /Backtesting/);
assert.match(architecture, /Journal/);
assert.match(architecture, /plugin-friendly/);

assert.match(agents, /Before Working On V6/);
assert.match(agents, /V6_PRODUCT_DIRECTION\.md/);

console.log('v6 product direction smoke passed');
