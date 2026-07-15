import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  STEP458_EXPLICIT_RUNNERS,
  STEP458_FALSE_POSITIVE_RUNNERS,
} from './test-runner-migration-step458.js';

assert.equal(STEP458_EXPLICIT_RUNNERS.length, 18);
assert.equal(STEP458_FALSE_POSITIVE_RUNNERS.length, 5);
assert.equal(new Set([
  ...STEP458_EXPLICIT_RUNNERS,
  ...STEP458_FALSE_POSITIVE_RUNNERS,
]).size, 23);

for (const path of STEP458_EXPLICIT_RUNNERS) {
  await access(path);
  const source = await readFile(path, 'utf8');
  assert.match(source, /(?:node:child_process|test-process-runner)/, path);
}

for (const path of STEP458_FALSE_POSITIVE_RUNNERS) {
  await access(path);
  const source = await readFile(path, 'utf8');
  assert.doesNotMatch(source, /from 'node:child_process'/, path);
}

console.log('v6 explicit runner audit Step 458 smoke passed');
