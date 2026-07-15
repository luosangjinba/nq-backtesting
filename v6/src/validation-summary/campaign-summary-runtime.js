import { REPLAY_NAVIGATION_COMMANDS, VALIDATION_SUMMARY_COMMANDS, VALIDATION_SUMMARY_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand, registerCommand } from '../runtime/commands.js';

export function createCampaignSummaryRuntime({ dispatchCommand = dispatchRuntimeCommand, repository } = {}) {
  if (!repository) throw new Error('Campaign Summary runtime requires repository.');
  const unregisterCallbacks = [];
  return Object.freeze({
    id: 'runtime.validation-campaign-summary',
    async start({ emitEvent } = {}) {
      await repository.open?.();
      unregisterCallbacks.push(
        registerCommand(VALIDATION_SUMMARY_COMMANDS.GET, ({ campaignId } = {}) => repository.project(campaignId)),
        registerCommand(VALIDATION_SUMMARY_COMMANDS.DRILLBACK, async (payload) => {
          try {
            const descriptor = await repository.drillback(payload);
            const navigation = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.DRILLBACK, { descriptor });
            if (navigation.status !== 'completed') {
              throw new Error(`Evidence navigation rejected: ${navigation.lastResult?.reason || navigation.status}`);
            }
            const result = { descriptor, navigation, status: 'completed' };
            emitEvent?.(VALIDATION_SUMMARY_EVENTS.DRILLBACK_RESOLVED, result);
            return result;
          } catch (error) {
            const result = { reason: error?.message || String(error), status: 'rejected' };
            emitEvent?.(VALIDATION_SUMMARY_EVENTS.DRILLBACK_REJECTED, result);
            return result;
          }
        }),
      );
    },
    async stop() {
      while (unregisterCallbacks.length) unregisterCallbacks.pop()();
      await repository.close?.();
    },
  });
}
