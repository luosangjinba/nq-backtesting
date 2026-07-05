import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const audit = readFileSync(path.join(ROOT, 'v6/docs/V6_WORKFLOW_SHELL_AUDIT.md'), 'utf8');
const index = readFileSync(path.join(ROOT, 'v6/docs/INDEX.md'), 'utf8');

[
  'v6/src/shell/workstation-shell.js',
  'v6/src/shell/workflow-action-state.js',
  'v6/src/shell/workflow-panel-close.js',
  'v6/src/shell/workflow-panel-coordinator.js',
  'v6/tests/workflow-panels-browser-smoke.js',
  'v6/tests/workflow-action-state-smoke.js',
  'v6/tests/workflow-panel-close-smoke.js',
  'v6/tests/workflow-panel-coordinator-smoke.js',
  'v6/tests/boundary-smoke.js',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be listed in workflow shell audit`);
});

[
  'chart engine',
  'bar-data runtime',
  'replay runtime',
  'viewport-intent',
  'pane runtime',
  'next executable step',
].forEach((needle) => {
  assert.equal(audit.includes(needle), true, `${needle} should be covered in workflow shell audit`);
});

assert.equal(index.includes('V6_WORKFLOW_SHELL_AUDIT.md'), true);

console.log('v6 workflow shell audit smoke passed');
