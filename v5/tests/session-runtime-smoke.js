import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  subscribeEvent,
} from '../src/runtime/events.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

clearCommandsForTest();
clearEventsForTest();

const runtime = createSessionRuntime(createSessionRepository());
let createdEvent = null;
const unsubscribe = subscribeEvent('session:created', (payload) => {
  createdEvent = payload;
});

runtime.start();
assert.equal(hasCommand(SESSION_COMMANDS.CREATE), true);

const context = await dispatchCommand(SESSION_COMMANDS.GET_CONTEXT);
assert.equal(context.workspace.userId, context.user.id);

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'session-runtime-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T00:00:00.000Z',
  sessionEnd: '2026-06-05T00:00:00.000Z',
});
assert.equal(created.session.id, 'session-runtime-test');
assert.equal(created.session.userId, context.user.id);
assert.equal(created.session.workspaceId, context.workspace.id);
assert.deepEqual(createdEvent, created);

const listed = await dispatchCommand(SESSION_COMMANDS.LIST);
assert.equal(listed.length, 1);
assert.equal(listed[0].id, created.session.id);

const fetched = await dispatchCommand(SESSION_COMMANDS.GET, {
  sessionId: created.session.id,
});
assert.deepEqual(fetched, created);

runtime.stop();
unsubscribe();
assert.equal(hasCommand(SESSION_COMMANDS.CREATE), false);

console.log('v5 session runtime smoke passed');
