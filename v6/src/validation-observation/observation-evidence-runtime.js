import {
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  VALIDATION_OBSERVATION_COMMANDS,
  VALIDATION_OBSERVATION_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as runtimeDispatch, registerCommand } from '../runtime/commands.js';

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export function createObservationEvidenceRuntime({
  dispatchCommand = runtimeDispatch,
  now = () => Date.now(),
  repository,
} = {}) {
  if (!repository) throw new Error('Observation Evidence runtime requires a repository.');
  const unregister = [];

  async function capture(payload = {}, emitEvent) {
    try {
      const replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      if (!replay?.sessionId || replay.status === 'ended') throw new Error('Observation requires active Replay.');
      const pane = payload.paneId
        ? await dispatchCommand(PANE_COMMANDS.GET_BY_ID, payload.paneId)
        : await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
      if (!pane?.id) throw new Error('Observation requires a chart pane.');
      const createdAt = payload.createdAt ?? now();
      const result = await repository.create({
        evidence: {
          createdAt,
          id: payload.evidenceId,
          observationId: payload.observationId,
          paneId: pane.id,
          price: payload.price,
          replayCursorTime: replay.cursorTime,
          replaySessionId: replay.sessionId,
          replayVisibleThroughTime: replay.cursorTime,
          symbol: pane.instrument || replay.symbol,
          time: payload.time,
          timeframe: pane.displayTimeframe || replay.timeframe,
          trialId: payload.trialId,
        },
        observation: {
          category: payload.category,
          createdAt,
          evidenceId: payload.evidenceId,
          id: payload.observationId,
          text: payload.text,
          trialId: payload.trialId,
        },
      });
      emitEvent?.(VALIDATION_OBSERVATION_EVENTS.CAPTURED, clone(result));
      return { ...clone(result), status: 'captured' };
    } catch (error) {
      const result = { reason: error?.message || String(error), status: 'rejected' };
      emitEvent?.(VALIDATION_OBSERVATION_EVENTS.REJECTED, result);
      return result;
    }
  }

  async function start({ emitEvent } = {}) {
    await repository.open?.();
    unregister.push(
      registerCommand(VALIDATION_OBSERVATION_COMMANDS.CAPTURE, (payload) => capture(payload, emitEvent)),
      registerCommand(VALIDATION_OBSERVATION_COMMANDS.GET_EVIDENCE, (id) => repository.getEvidence(id)),
      registerCommand(VALIDATION_OBSERVATION_COMMANDS.GET_OBSERVATION, (id) => repository.getObservation(id)),
      registerCommand(VALIDATION_OBSERVATION_COMMANDS.LIST, async ({ trialId } = {}) => ({
        evidence: await repository.listEvidence(trialId),
        observations: await repository.listObservations(trialId),
      })),
    );
  }

  async function stop() {
    while (unregister.length) unregister.pop()();
    await repository.close?.();
  }

  return Object.freeze({ id: 'runtime.validation-observation-evidence', start, stop });
}
