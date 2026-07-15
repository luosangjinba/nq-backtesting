import { VALIDATION_TRADE_PLAN_COMMANDS, VALIDATION_TRADE_PLAN_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';

export function createTradePlanRuntime({ now = () => Date.now(), repository } = {}) {
  if (!repository) throw new Error('Trade Plan runtime requires a repository.');
  const unregister = [];
  async function create(payload = {}, emitEvent) {
    try {
      const plan = await repository.create({ ...payload, createdAt: payload.createdAt ?? now() });
      const result = { plan, status: 'created' };
      emitEvent?.(VALIDATION_TRADE_PLAN_EVENTS.CREATED, result);
      return result;
    } catch (error) {
      const result = { reason: error?.message || String(error), status: 'rejected' };
      emitEvent?.(VALIDATION_TRADE_PLAN_EVENTS.REJECTED, result);
      return result;
    }
  }
  async function start({ emitEvent } = {}) {
    await repository.open?.();
    unregister.push(
      registerCommand(VALIDATION_TRADE_PLAN_COMMANDS.CREATE, (payload) => create(payload, emitEvent)),
      registerCommand(VALIDATION_TRADE_PLAN_COMMANDS.GET, (id) => repository.get(id)),
      registerCommand(VALIDATION_TRADE_PLAN_COMMANDS.LIST, ({ trialId } = {}) => repository.list(trialId)),
    );
  }
  async function stop() { while (unregister.length) unregister.pop()(); await repository.close?.(); }
  return Object.freeze({ id: 'runtime.validation-trade-plan', start, stop });
}
