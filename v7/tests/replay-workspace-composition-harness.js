import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTOPLAY_SPEED_OPTIONS,
  createReplayWorkspaceComposition,
  supportsFoundationWorkspace,
  WORKSPACE_PANE_IDS,
} from '../src/replay-workspace-composition/public.js';
import { validateReplayWorkspaceBoundary } from './support/replay-workspace-boundary-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.resolve(TEST_DIR, relativePath), 'utf8');
const compositionDirectory = path.resolve(TEST_DIR, '../src/replay-workspace-composition');
const compositionSources = fs.readdirSync(compositionDirectory)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => fs.readFileSync(path.join(compositionDirectory, file), 'utf8'));
const production = Object.freeze({
  commandSource: compositionSources.filter((source) => /export function create\w+Commands|createReplayWorkspaceCommandPort/.test(source)).join('\n'),
  compositionSource: compositionSources.join('\n'),
  uiSource: read('../src/replay-workspace-ui/replay-workspace-surface.js'),
});

assert.equal(typeof createReplayWorkspaceComposition, 'function');
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.cme.nq'] },
}), true);
assert.equal(supportsFoundationWorkspace({
  configuration: { instrumentIds: ['instrument.unsupported'] },
}), false);
assert.deepEqual(WORKSPACE_PANE_IDS, [
  'pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary',
]);
assert.equal(AUTOPLAY_SPEED_OPTIONS.length, 4);
assert.deepEqual(validateReplayWorkspaceBoundary(production), []);

const negativeCases = Object.freeze([
  {
    code: 'ui-constructs-runtime-owner',
    value: { ...production, uiSource: `${production.uiSource}\ncreateReplayRuntime({});` },
  },
  {
    code: 'ui-missing-public-composition-port',
    value: { ...production, uiSource: production.uiSource.replace(
      'createReplayWorkspaceComposition({', 'missingComposition({',
    ) },
  },
  {
    code: 'ui-missing-presentation-subscription',
    value: { ...production, uiSource: production.uiSource.replace(
      'createWorkspacePresentationPort(view)', 'view',
    ) },
  },
  {
    code: 'composition-touches-dom',
    value: { ...production, compositionSource: `${production.compositionSource}\ndocument.querySelector('#app');` },
  },
  {
    code: 'composition-missing-runtime-owner',
    value: { ...production, compositionSource: production.compositionSource.replace(
      'createBarDataRuntime({', 'missingBarDataRuntime({',
    ) },
  },
  {
    code: 'command-port-constructs-owner',
    value: { ...production, commandSource: `${production.commandSource}\ncreateWorkspaceStateRuntime({});` },
  },
]);

for (const entry of negativeCases) {
  assert.ok(validateReplayWorkspaceBoundary(entry.value).some(({ code }) => code === entry.code),
    `negative control must report ${entry.code}`);
}

console.log('v7 Replay Workspace composition harness passed', {
  scope: 'public boot, UI command/presentation boundary, owner composition, DOM isolation',
  negativeControls: negativeCases.length,
});
