import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [decision, guardrails, parity, shell] = await Promise.all([
  readFile('v6/docs/V6_WORKSPACE_PLACEHOLDER_CLEANUP_DECISION_STEP418.md', 'utf8'),
  readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8'),
  readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(guardrails, /Step 418 supersession/);
assert.match(parity, /Superseded for placeholder visibility by Step 418/);
assert.match(decision, /Class A - Delete clone-only or duplicate UI/);
assert.match(decision, /Class B - Remove current entry, preserve future capability boundary/);
assert.match(decision, /Class C - Keep visible/);
assert.match(decision, /entire Session Settings placeholder panel/);
assert.match(decision, /complete Replay transport, including state-disabled controls/);
assert.match(decision, /Do not delete owner\/domain files/);

// Audit baseline: cleanup has not started in this planning step.
for (const selector of [
  'data-v6-top-search',
  'data-v6-rail-watch',
  'data-v6-session-settings-panel',
  'data-v6-left-drawing-rail',
  'data-v6-bottom-account-chrome',
]) {
  assert.match(shell, new RegExp(selector));
}

console.log('V6 Workspace placeholder cleanup decision Step 418 smoke passed.');
