import {
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  DISPLAY_TIMEFRAME_EVENTS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { subscribeEvent } from '../runtime/events.js';
import {
  createTargetMaterializationReplayDiagnosticsSnapshot,
  validateTargetMaterializationReplayDiagnosticsSnapshot,
} from './target-materialization-replay-diagnostics-contract.js';
import {
  mapTargetMaterializationReplayDiagnosticsProducerPayload,
} from './target-materialization-replay-diagnostics-producer-payload-mappers.js';

function cloneSnapshot(snapshot) {
  return snapshot ? { ...snapshot } : null;
}

function normalizeInitialSnapshot(initialSnapshot) {
  if (!initialSnapshot) return null;
  const snapshot = createTargetMaterializationReplayDiagnosticsSnapshot(initialSnapshot);
  const validation = validateTargetMaterializationReplayDiagnosticsSnapshot(snapshot);
  if (!validation.valid) {
    throw new Error(`Target materialization diagnostics initial snapshot invalid: ${validation.errors.map((error) => error.field).join(', ')}`);
  }
  return snapshot;
}

function createValidationErrors(validation) {
  return validation.errors.map((error) => ({ ...error }));
}

const PRODUCER_EVENTS = Object.freeze([
  DISPLAY_TIMEFRAME_EVENTS.APPLIED,
  CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
  CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED,
  CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED,
  CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED,
]);

export function createTargetMaterializationReplayDiagnosticsRuntime({
  initialSnapshot = null,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  let state = {
    snapshot: normalizeInitialSnapshot(initialSnapshot),
    status: initialSnapshot ? 'ready' : 'idle',
  };

  function getSnapshot() {
    return {
      snapshot: cloneSnapshot(state.snapshot),
      status: state.status,
    };
  }

  function updateSnapshot(payload = {}) {
    const candidate = createTargetMaterializationReplayDiagnosticsSnapshot({
      ...(state.snapshot || {}),
      ...(payload || {}),
    });
    const validation = validateTargetMaterializationReplayDiagnosticsSnapshot(candidate);
    if (!validation.valid) {
      return {
        errors: createValidationErrors(validation),
        rejectedSnapshot: cloneSnapshot(candidate),
        snapshot: cloneSnapshot(state.snapshot),
        status: 'rejected',
      };
    }
    state = {
      snapshot: candidate,
      status: 'ready',
    };
    const current = getSnapshot();
    emit(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY, current);
    return current;
  }

  function handleProducerEvent(eventName, payload) {
    const update = mapTargetMaterializationReplayDiagnosticsProducerPayload(eventName, payload);
    if (!update) return null;
    return updateSnapshot(update);
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT, () => getSnapshot()),
      registerCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT, updateSnapshot),
      ...PRODUCER_EVENTS.map((eventName) => (
        subscribeEvent(eventName, (payload) => handleProducerEvent(eventName, payload))
      )),
    );
    emit(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY, getSnapshot());
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      snapshot: normalizeInitialSnapshot(initialSnapshot),
      status: initialSnapshot ? 'ready' : 'idle',
    };
    emit = () => {};
  }

  return {
    id: 'runtime.target-materialization-replay-diagnostics',
    start,
    stop,
  };
}
