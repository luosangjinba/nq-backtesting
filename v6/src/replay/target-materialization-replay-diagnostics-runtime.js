import {
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import {
  createTargetMaterializationReplayDiagnosticsSnapshot,
  validateTargetMaterializationReplayDiagnosticsSnapshot,
} from './target-materialization-replay-diagnostics-contract.js';

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

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT, () => getSnapshot()),
      registerCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT, updateSnapshot),
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
