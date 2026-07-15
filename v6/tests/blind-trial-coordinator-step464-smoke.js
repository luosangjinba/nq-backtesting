import assert from 'node:assert/strict';
import {
  BLIND_TRIAL_COMMANDS,
  BLIND_TRIAL_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBlindTrialCoordinatorRuntime } from '../src/blind-trial/blind-trial-coordinator-runtime.js';
import { createMemoryValidationPersistenceAdapter } from '../src/validation-persistence/validation-persistence-adapters.js';
import { createValidationRepository } from '../src/validation-persistence/validation-repository.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const repository = createValidationRepository({
  adapter: createMemoryValidationPersistenceAdapter(),
  now: () => 150,
});
await repository.open();
await repository.createPlaybookVersion({
  createdAt: 100,
  id: 'playbook-v1',
  name: 'Model v1',
  playbookId: 'playbook',
  rules: [{ id: 'rule-1', statement: 'Wait for displacement.' }],
  version: 1,
});
await repository.createCampaign({
  createdAt: 110,
  hypothesis: 'The setup has positive expectancy.',
  id: 'campaign-1',
  name: 'Campaign 1',
  playbookVersionId: 'playbook-v1',
});
await repository.transitionCampaign('campaign-1', 'active', { updatedAt: 120 });
await repository.createTrial({ campaignId: 'campaign-1', createdAt: 130, id: 'trial-1' });

let replayState = {
  cursorIndex: 3,
  cursorTime: '2026-07-15T13:33:00.000Z',
  revealedCount: 4,
  sessionId: 'replay-1',
  status: 'ready',
};
let replayReadCount = 0;
const dispatch = async (command) => {
  assert.equal(command, REPLAY_COMMANDS.GET_STATE);
  replayReadCount += 1;
  return { ...replayState };
};
const events = [];
const unsubscribers = [
  subscribeEvent(BLIND_TRIAL_EVENTS.STARTED, (payload) => events.push(payload)),
  subscribeEvent(BLIND_TRIAL_EVENTS.RESUMED, (payload) => events.push(payload)),
  subscribeEvent(BLIND_TRIAL_EVENTS.REJECTED, (payload) => events.push(payload)),
];
const registry = createRuntimeRegistry();
registry.registerRuntime(createBlindTrialCoordinatorRuntime({
  dispatchCommand: dispatch,
  now: () => 140,
  repository,
}));
await registry.start({ emitEvent });

const started = await dispatchCommand(BLIND_TRIAL_COMMANDS.START, { trialId: 'trial-1' });
assert.equal(started.status, 'started');
assert.equal(started.activeTrialId, 'trial-1');
assert.equal(started.lastResult.trial.replaySessionId, 'replay-1');
assert.equal(started.lastResult.startVisibleThroughTime, '2026-07-15T13:33:00.000Z');
assert.equal(events.at(-1).status, 'started');

replayState = {
  ...replayState,
  cursorIndex: 5,
  cursorTime: '2026-07-15T13:35:00.000Z',
  revealedCount: 6,
};
const resumed = await dispatchCommand(BLIND_TRIAL_COMMANDS.RESUME, { trialId: 'trial-1' });
assert.equal(resumed.status, 'resumed');
assert.equal(resumed.lastResult.currentReplay.visibleThroughTime, '2026-07-15T13:35:00.000Z');
assert.equal(resumed.lastResult.startVisibleThroughTime, '2026-07-15T13:33:00.000Z');
assert.equal(events.at(-1).status, 'resumed');
assert.equal(replayReadCount, 2);

replayState = { ...replayState, sessionId: 'other-replay' };
const rejected = await dispatchCommand(BLIND_TRIAL_COMMANDS.RESUME, { trialId: 'trial-1' });
assert.equal(rejected.status, 'rejected');
assert.match(rejected.error, /does not match/);
assert.equal(events.at(-1).status, 'rejected');

await registry.stop();
unsubscribers.forEach((unsubscribe) => unsubscribe());
clearCommandsForTest();
clearEventsForTest();

console.log('v6 blind trial coordinator step464 smoke passed');
