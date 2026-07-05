import assert from 'node:assert/strict';
import { createWorkflowPanelCoordinator } from '../src/shell/workflow-panel-coordinator.js';

function createController() {
  const calls = [];
  return {
    calls,
    setOpen(open) {
      calls.push(Boolean(open));
    },
  };
}

const coordinator = createWorkflowPanelCoordinator();
const sessions = createController();
const replay = createController();
const journal = createController();

const unregisterSessions = coordinator.register('sessions', sessions);
coordinator.register('replay', replay);
coordinator.register('journal', journal);

coordinator.closeOthers('replay');
assert.deepEqual(sessions.calls, [false]);
assert.deepEqual(replay.calls, []);
assert.deepEqual(journal.calls, [false]);

unregisterSessions();
coordinator.closeOthers('journal');
assert.deepEqual(sessions.calls, [false]);
assert.deepEqual(replay.calls, [false]);
assert.deepEqual(journal.calls, [false]);

assert.throws(
  () => coordinator.register('broken', {}),
  /Workflow panel controller with setOpen is required/,
);

console.log('v6 workflow panel coordinator smoke passed');
