import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page();

try {
  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { BLIND_TRIAL_COMMANDS, REPLAY_COMMANDS } = await import('/v6/src/contracts/app-contracts.js');
      const { createBlindTrialCoordinatorRuntime } = await import(
        '/v6/src/blind-trial/blind-trial-coordinator-runtime.js'
      );
      const { createIndexedDbValidationPersistenceAdapter } = await import(
        '/v6/src/validation-persistence/validation-persistence-adapters.js'
      );
      const { createValidationRepository } = await import(
        '/v6/src/validation-persistence/validation-repository.js'
      );
      const { clearCommandsForTest, dispatchCommand } = await import('/v6/src/runtime/commands.js');
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const { createRuntimeRegistry } = await import('/v6/src/runtime/lifecycle.js');
      const databaseName = 'v6.validation.step464.browser';
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('pre-test delete blocked'));
      });

      const first = createValidationRepository({
        adapter: createIndexedDbValidationPersistenceAdapter({ databaseName }),
      });
      await first.open();
      await first.createPlaybookVersion({
        createdAt: 1000,
        id: 'pbv-1',
        name: 'Playbook v1',
        playbookId: 'pb-1',
        rules: [{ id: 'rule-1', statement: 'Commit before reveal.' }],
        version: 1,
      });
      await first.createCampaign({
        createdAt: 2000,
        hypothesis: 'Prospective commitments improve integrity.',
        id: 'campaign-1',
        name: 'Campaign',
        playbookVersionId: 'pbv-1',
      });
      await first.transitionCampaign('campaign-1', 'active', { updatedAt: 2100 });
      await first.createTrial({ campaignId: 'campaign-1', createdAt: 2200, id: 'trial-1' });

      const replayState = {
        cursorIndex: 9,
        cursorTime: '2026-07-15T13:39:00.000Z',
        revealedCount: 10,
        sessionId: 'replay-1',
        status: 'ready',
      };
      const replayDispatch = async (command) => {
        if (command !== REPLAY_COMMANDS.GET_STATE) throw new Error('unexpected Replay command');
        return replayState;
      };
      clearCommandsForTest();
      const firstRegistry = createRuntimeRegistry();
      firstRegistry.registerRuntime(createBlindTrialCoordinatorRuntime({
        dispatchCommand: replayDispatch,
        now: () => 2300,
        repository: first,
      }));
      await firstRegistry.start({ emitEvent });
      await dispatchCommand(BLIND_TRIAL_COMMANDS.START, { trialId: 'trial-1' });
      await firstRegistry.stop();

      const second = createValidationRepository({
        adapter: createIndexedDbValidationPersistenceAdapter({ databaseName }),
      });
      clearCommandsForTest();
      const secondRegistry = createRuntimeRegistry();
      secondRegistry.registerRuntime(createBlindTrialCoordinatorRuntime({
        dispatchCommand: replayDispatch,
        repository: second,
      }));
      await secondRegistry.start({ emitEvent });
      const resumed = await dispatchCommand(BLIND_TRIAL_COMMANDS.RESUME, { trialId: 'trial-1' });
      const stored = await second.getTrial('trial-1');
      await secondRegistry.stop();
      clearCommandsForTest();

      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('post-test delete blocked'));
      });
      return { resumed, stored };
    })()))()
  `));

  assert.equal(result.resumed.status, 'resumed');
  assert.equal(result.resumed.activeTrialId, 'trial-1');
  assert.equal(result.stored.status, 'active');
  assert.equal(result.stored.replaySessionId, 'replay-1');
  assert.equal(result.stored.replayVisibleThroughTime, '2026-07-15T13:39:00.000Z');
} finally {
  await page.cleanup();
}

console.log('v6 blind trial IndexedDB resume browser step464 smoke passed');
