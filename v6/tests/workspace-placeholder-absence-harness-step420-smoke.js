import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  WORKSPACE_CLEANUP_COMPLETED_THROUGH_STEP,
  WORKSPACE_PLACEHOLDER_REMOVALS,
  WORKSPACE_PRESERVED_CONTRACT_FILES,
} from './helpers/workspace-cleanup-manifest-step420.js';

const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

function shellHasSelector(selector) {
  return new RegExp(`${selector}(?=[\\s=>])`).test(shellSource);
}

assert.equal(WORKSPACE_CLEANUP_COMPLETED_THROUGH_STEP, 423);
assert.equal(WORKSPACE_PLACEHOLDER_REMOVALS.length > 0, true);
assert.equal(new Set(WORKSPACE_PLACEHOLDER_REMOVALS.map((item) => item.selector)).size, WORKSPACE_PLACEHOLDER_REMOVALS.length);

for (const item of WORKSPACE_PLACEHOLDER_REMOVALS) {
  assert.equal(Number.isInteger(item.step), true, `${item.selector} must have a cleanup step`);
  assert.equal(Boolean(item.family), true, `${item.selector} must have a cleanup family`);
  const shouldBeRemoved = item.step <= WORKSPACE_CLEANUP_COMPLETED_THROUGH_STEP;
  assert.equal(
    shellHasSelector(item.selector),
    !shouldBeRemoved,
    `${item.selector} must be ${shouldBeRemoved ? 'absent after' : 'present until'} Step ${item.step}`,
  );
}

for (const contractFile of WORKSPACE_PRESERVED_CONTRACT_FILES) {
  await access(contractFile);
}

const contractTests = await Promise.all([
  'v6/tests/account-trading-contract-smoke.js',
  'v6/tests/drawing-action-history-contract-smoke.js',
  'v6/tests/indicators-contract-smoke.js',
  'v6/tests/screenshot-export-contract-smoke.js',
  'v6/tests/session-settings-contract-smoke.js',
].map((file) => readFile(file, 'utf8')));

for (const source of contractTests) {
  assert.equal(source.includes("readFile('v6/src/shell/workstation-shell.js'"), false);
  assert.equal(source.includes('data-v6-bottom-buy disabled'), false);
  assert.equal(source.includes('data-v6-left-drawing-tool="cursor" disabled'), false);
  assert.equal(source.includes('data-v6-session-settings-name'), false);
  assert.equal(source.includes('data-v6-top-indicators disabled'), false);
  assert.equal(source.includes('data-v6-top-screenshot disabled'), false);
}

console.log('v6 workspace placeholder absence harness Step 420 smoke passed');
