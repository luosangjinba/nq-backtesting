import {
  createReplayNavigationExecutor,
} from '../replay-navigation-runtime/public.js';
import { createWorkspaceTransactionRuntime } from '../workspace-transaction-runtime/public.js';
import { createReplayAutoplayScheduler } from './autoplay-scheduler.js';
import { DEFAULT_AUTOPLAY_SPEED } from './autoplay-speed.js';
import { createPaneTimeLocationController } from './pane-time-location-controller.js';
import { createWorkspaceExecution } from './workspace-execution.js';

function createAutoplayScheduler({ execution, presentation, replay }) {
  return createReplayAutoplayScheduler({
    cadenceMs: DEFAULT_AUTOPLAY_SPEED.cadenceMs,
    playbackPort: Object.freeze({
      pause() {
        const snapshot = replay.pause();
        presentation.setReplay(snapshot);
        return snapshot;
      },
      play() {
        const snapshot = replay.play();
        presentation.setReplay(snapshot);
        return snapshot;
      },
      snapshot: replay.snapshot,
    }),
    runNext: () => execution.action('autoplay-next'),
  });
}

/** Construct transaction, navigation, execution, Pane-location, and autoplay orchestration. */
export function createWorkspaceRuntimeAssembly({
  chart,
  data,
  presentation,
  publication,
  record,
  session,
  workstationSettings,
}) {
  const { market, range, replay, workspaceState } = session;
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: record.activationGeneration,
    acquisitionPort: data.materialization.acquisitionPort,
    chartPort: chart.chartApplication,
    publicationPort: publication.publicationPort,
    projectionPort: data.materialization.projectionPort,
    replayPort: data.replayPort,
    sessionId: record.sessionId,
    workspaceStatePort: workspaceState,
  });
  const navigation = createReplayNavigationExecutor({
    paneRequestPort: Object.freeze({
      createRequest: ({ responsePlan }) => data.paneData.createRequest({ responsePlan }),
    }),
    replayRuntime: replay,
    transactionRuntime: runtime,
  });
  const execution = createWorkspaceExecution({
    historyPort: chart.adapter,
    market,
    navigation,
    paneData: data.paneData,
    range,
    record,
    replay,
    resolvePublication: publication.publicationValue,
    resolveReplayStep: session.desiredReplayStep,
    runtime,
    view: presentation,
    workspaceState,
  });
  const paneTimeLocation = createPaneTimeLocationController({
    adapter: chart.adapter,
    execution,
    market,
    readSettings: () => workstationSettings.snapshot().settings,
    view: presentation,
    workspaceState,
  });
  const autoplayScheduler = createAutoplayScheduler({ execution, presentation, replay });
  presentation.setPlaybackSpeed(DEFAULT_AUTOPLAY_SPEED.id);
  return Object.freeze({ autoplayScheduler, execution, paneTimeLocation, runtime });
}
