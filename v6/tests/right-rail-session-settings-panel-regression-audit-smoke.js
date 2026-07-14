import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [cleanupDecision, contractSource, shellSource] = await Promise.all([
  readFile('v6/docs/V6_WORKSPACE_PLACEHOLDER_CLEANUP_DECISION_STEP418.md', 'utf8'),
  readFile('v6/src/session-settings/session-settings-contract.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(cleanupDecision, /entire Session Settings placeholder panel/);
assert.equal(shellSource.includes('data-v6-rail-session-settings'), false);
assert.equal(shellSource.includes('data-v6-session-settings-panel'), false);
assert.match(contractSource, /session-settings-runtime/);

console.log('v6 right rail session settings removal regression smoke passed');
