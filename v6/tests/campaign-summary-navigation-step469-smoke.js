import assert from 'node:assert/strict';
import { REPLAY_NAVIGATION_COMMANDS, VALIDATION_SUMMARY_COMMANDS } from '../src/contracts/app-contracts.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { createCampaignSummaryRuntime } from '../src/validation-summary/campaign-summary-runtime.js';

clearCommandsForTest();
const descriptor = {
  evidenceId: 'evidence-469',
  replaySessionId: 'session-469',
  replayVisibleThroughTime: '2026-05-03T14:30:00.000Z',
  trialId: 'trial-469',
};
const calls = [];
const runtime = createCampaignSummaryRuntime({
  dispatchCommand: async (command, payload) => {
    calls.push({ command, payload });
    return { lastResult: { descriptor }, status: 'completed' };
  },
  repository: {
    close: async () => {},
    drillback: async () => descriptor,
    open: async () => {},
    project: async () => ({ campaignId: 'campaign-469' }),
  },
});
await runtime.start();
const result = await dispatchCommand(VALIDATION_SUMMARY_COMMANDS.DRILLBACK, {
  campaignId: 'campaign-469',
  trialId: 'trial-469',
});
assert.equal(result.status, 'completed');
assert.equal(result.descriptor.evidenceId, 'evidence-469');
assert.deepEqual(calls, [{
  command: REPLAY_NAVIGATION_COMMANDS.DRILLBACK,
  payload: { descriptor },
}]);
await runtime.stop();
console.log('v6 campaign summary navigation step469 smoke passed');
