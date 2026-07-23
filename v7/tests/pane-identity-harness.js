import assert from 'node:assert/strict';
import {
  readWorkspacePaneIdentity,
  WORKSPACE_PANE_IDS,
} from '../src/replay-workspace-ui/pane-identity.js';

assert.deepEqual(WORKSPACE_PANE_IDS, [
  'pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary',
]);
assert.deepEqual(WORKSPACE_PANE_IDS.map((paneId) => readWorkspacePaneIdentity(paneId).label),
  ['P1', 'P2', 'P3', 'P4']);
assert.deepEqual(WORKSPACE_PANE_IDS.map((paneId) => readWorkspacePaneIdentity(paneId).number),
  [1, 2, 3, 4]);
assert.throws(() => readWorkspacePaneIdentity('pane-unknown'), TypeError);

console.log('v7 Pane identity harness passed (stable P1-P4 mapping)');
