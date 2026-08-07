import assert from 'node:assert/strict';
import {
  createReplayWorkspaceSurface,
  REPLAY_WORKSPACE_STATES,
  workspaceErrorCopy,
} from '../src/replay-workspace-ui/public.js';

assert.deepEqual(REPLAY_WORKSPACE_STATES, [
  'loading', 'empty', 'unavailable', 'stale', 'error', 'ready',
]);
assert.equal(
  workspaceErrorCopy('provider-unavailable'),
  'Market data is unavailable. Check the data service and retry.',
);
assert.equal(
  workspaceErrorCopy('some-internal-code'),
  'The chart update failed. Retry the update.',
  'unknown stable internal codes must not leak into the UI',
);
assert.equal(workspaceErrorCopy('A specific user-facing explanation.'), 'A specific user-facing explanation.');

const surface = createReplayWorkspaceSurface();
assert.equal(typeof surface.mount, 'function');
assert.equal(typeof surface.supports, 'function');
assert.equal(typeof surface.unmount, 'function');
assert.equal(typeof surface.dispose, 'function');

assert.equal(surface.supports({
  configuration: { instrumentIds: ['instrument.cme.nq'] },
}), true, 'the independent public surface must recognize its production Session capability');
assert.equal(surface.supports({
  configuration: { instrumentIds: ['instrument.unsupported'] },
}), false, 'the independent public surface must reject unsupported Session capabilities');

surface.unmount();
surface.dispose();
surface.dispose();

console.log('v7 Replay Workspace UI independent harness passed (public boot, capability, disposal)');
