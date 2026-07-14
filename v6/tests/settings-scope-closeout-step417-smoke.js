import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [decision, catalog, model, shell] = await Promise.all([
  readFile('v6/docs/V6_SETTINGS_SCOPE_CLOSEOUT_STEP417.md', 'utf8'),
  readFile('v6/docs/V6_SETTINGS_CATALOG_ARCHITECTURE_STEP409_5.md', 'utf8'),
  readFile('v6/src/settings/settings-model.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(decision, /rejects the following Settings capabilities/);
assert.match(decision, /Settings templates/);
assert.match(decision, /Apply to all/);
assert.match(decision, /per-Pane Settings overrides/);
assert.match(decision, /workspaceSettings:global/);
assert.match(catalog, /Rejected by Step 417 for current product/);
assert.match(catalog, /there is no partial scope that needs an Apply-to-/);

assert.doesNotMatch(model, /paneOverrides|settingsTemplates|applyToAll/);
const settingsStart = shell.indexOf('data-v6-settings-panel');
const settingsEnd = shell.indexOf('data-v6-left-drawing-rail', settingsStart);
const settingsModal = shell.slice(settingsStart, settingsEnd);
assert.ok(settingsModal, 'Settings modal markup must remain present.');
assert.doesNotMatch(settingsModal, /data-v6-settings-template|Apply to all|Pane override/);
assert.match(settingsModal, /data-v6-settings-reset-draft>Reset/);

console.log('V6 Settings scope closeout Step 417 smoke passed.');
