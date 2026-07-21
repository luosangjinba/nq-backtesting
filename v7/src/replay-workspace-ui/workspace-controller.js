import { createBarDataRuntime } from '../bar-data-runtime/public.js';
import { createPaneSetChartSnapshotApplication } from '../chart-snapshot-application/public.js';
import { createLightweightPaneSetAdapter } from '../lightweight-chart-adapter/public.js';
import {
  createPaneSetMaterializationPorts,
} from '../pane-set-materialization/public.js';
import {
  createReplayNavigationExecutor,
  createReplayNavigationReplayPort,
  createReplayNavigationSchedule,
  createReplayNavigationTargetResolver,
} from '../replay-navigation-runtime/public.js';
import { createReplayRuntime } from '../replay-runtime/public.js';
import { createWorkspaceTransactionRuntime } from '../workspace-transaction-runtime/public.js';
import { createReplayAutoplayScheduler } from './autoplay-scheduler.js';
import { createFoundationMarket } from './foundation-market.js';
import { createFoundationSourceTraversal } from './foundation-source-traversal.js';
import { createPaneDataComposition } from './pane-data-composition.js';
import { createPaneWorkspaceState } from './pane-workspace-state.js';
import { createWorkspaceExecution } from './workspace-execution.js';

function formatCursor(epochMs) {
  if (epochMs === null) return 'No Session bar visible';
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short', year: 'numeric',
  });
  return formatter.format(new Date(epochMs));
}

/** Wire one real Session-scoped Replay clock to a uniform one/multi-Pane chart surface. */
export function createReplayWorkspaceController({ record, view }) {
  const market = createFoundationMarket(record);
  const range = record.configuration.historicalRange;
  const replayStepById = new Map(market.replayStepOptions.map((option) => [option.id, option.step]));
  const replay = createReplayRuntime({
    activationGeneration: record.activationGeneration,
    initialCursorEpochMs: range.startEpochMs,
    initialReplayStep: market.replayStepOptions[0].step,
    range,
    sessionId: record.sessionId,
  });
  let runtime = null;
  let disposed = false;
  let execution = null;
  let autoplayScheduler = null;

  const paneState = createPaneWorkspaceState({
    initialCursorEpochMs: range.startEpochMs,
    initialTarget: market.defaultTarget,
    record,
  });
  view.setSessionRange({ end: formatCursor(range.endEpochMs), start: formatCursor(range.startEpochMs) });
  view.setSelection({ sessionHoursMode: market.defaultTarget.sessionHoursMode });
  view.setWorkspace(paneState.current());

  const adapter = createLightweightPaneSetAdapter({
    onHistoryBoundary: (paneId, logicalRange) => {
      if (logicalRange.from < 24) void execution?.requestHistory(paneId);
    },
    onViewportIntent: (paneId, intent) => view.setWall(paneId, intent.origin),
    resolveViewportPort: paneState.viewportPort,
    surfacePort: view.surfacePort,
  });
  const chartApplication = createPaneSetChartSnapshotApplication({
    activationGeneration: record.activationGeneration,
    adapter,
    sessionId: record.sessionId,
  });
  const barData = createBarDataRuntime({
    maxCacheEntries: 48,
    maxConcurrentRequests: 2,
    resolveProvider: () => market.provider,
  });
  const paneData = createPaneDataComposition({
    barData,
    market,
    readAcceptedSnapshot: () => runtime?.snapshot().acceptedSnapshot?.workspace ?? null,
  });
  const materialization = createPaneSetMaterializationPorts({
    acquisitionPort: paneData.acquisitionPort,
    projectionPort: paneData.projectionPort,
  });
  const traversal = createFoundationSourceTraversal({
    barData,
    market,
    readCachedSourceBars: (instrumentId) => paneData.sourceBars(instrumentId),
  });
  const targetResolver = createReplayNavigationTargetResolver({
    schedule: createReplayNavigationSchedule(),
    sourceTraversalPort: traversal,
  });
  const replayPort = createReplayNavigationReplayPort({ replayRuntime: replay, targetResolver });
  runtime = createWorkspaceTransactionRuntime({
    activationGeneration: record.activationGeneration,
    acquisitionPort: materialization.acquisitionPort,
    projectionPort: materialization.projectionPort,
    replayPort,
    sessionId: record.sessionId,
    visibleCompletionPort: chartApplication,
  });
  const navigation = createReplayNavigationExecutor({
    paneRequestPort: Object.freeze({
      createRequest: ({ responsePlan }) => paneData.createRequest({ responsePlan }),
    }),
    replayRuntime: replay,
    transactionRuntime: runtime,
  });

  function acceptVisibleState(desiredWorkspace, desiredMode) {
    const replaySnapshot = replay.snapshot();
    paneState.accept(desiredWorkspace, replaySnapshot.cursorEpochMs);
    const workspaceSnapshot = runtime.snapshot().acceptedSnapshot.workspace;
    const activePaneId = paneState.activePaneId();
    const active = workspaceSnapshot.panes.find(({ paneId }) => paneId === activePaneId)
      ?? workspaceSnapshot.panes[0];
    const readyPanes = workspaceSnapshot.panes.filter(({ status }) => status === 'ready');
    const visibleThroughEpochMs = replaySnapshot.visibleThroughEpochMs;
    view.setCursor(formatCursor(visibleThroughEpochMs));
    view.setEvidence({
      replayRevision: replaySnapshot.revision,
      workspaceRevision: runtime.snapshot().acceptedRevision,
    });
    view.setReplay(replaySnapshot);
    view.setSelection({ sessionHoursMode: desiredMode });
    view.setVisibleThrough({
      barCount: active.status === 'ready' ? active.snapshot.bars.length : 0,
      paneCount: workspaceSnapshot.panes.length,
      text: formatCursor(visibleThroughEpochMs),
    });
    view.setWorkspace(paneState.current());
    view.setWall(activePaneId, paneState.wallOrigin(activePaneId));
    view.setState(readyPanes.length === 0 ? 'empty' : 'ready');
  }

  execution = createWorkspaceExecution({
    acceptVisibleState, market, navigation, paneData, paneState, range, record, replay, runtime, view,
  });
  autoplayScheduler = createReplayAutoplayScheduler({
    playbackPort: Object.freeze({
      pause() {
        const snapshot = replay.pause();
        view.setReplay(snapshot);
        return snapshot;
      },
      play() {
        const snapshot = replay.play();
        view.setReplay(snapshot);
        return snapshot;
      },
      snapshot: replay.snapshot,
    }),
    runNext: () => execution.action('autoplay-next'),
  });

  return Object.freeze({
    autoplay: () => autoplayScheduler.play(),
    changeReplayStep(replayStepId) {
      if (disposed || execution.isPending()) return;
      const step = replayStepById.get(replayStepId);
      if (!step || replay.snapshot().replayStep === step) return;
      view.setReplay(replay.setReplayStep(step));
    },
    changePaneCount(count) {
      const current = paneState.read();
      if (count === current.panes.length || (count !== 1 && count !== 2)) return;
      const desiredWorkspace = paneState.desiredPaneCount(count, replay.snapshot().cursorEpochMs);
      return execution.materialize({ desiredWorkspace });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      autoplayScheduler.dispose();
      execution.dispose();
      runtime.dispose();
      chartApplication.dispose();
      adapter.dispose();
      barData.dispose();
      replay.dispose();
      market.dispose();
      paneState.dispose();
    },
    focusPane(paneId) {
      if (disposed || execution.isPending()) return;
      view.setWorkspace(paneState.focus(paneId));
      view.setWall(paneId, paneState.wallOrigin(paneId));
    },
    gotoExact: (targetEpochMs) => execution.action('goto-exact', { targetEpochMs }, { allowDim: true }),
    gotoQuick: (anchor) => execution.action('goto-anchor', { anchor }, { allowDim: true }),
    next: () => execution.action('manual-next'),
    pause() {
      if (disposed) return;
      return autoplayScheduler.pause();
    },
    previous: () => execution.action('manual-previous', {}, { allowDim: true }),
    replaceInstrument(instrumentId) {
      if (disposed || execution.isPending()) return;
      const current = paneState.read();
      const desiredWorkspace = paneState.desiredInstrument(instrumentId);
      if (desiredWorkspace === paneState.current()) return;
      const desired = paneState.read(desiredWorkspace);
      const requestKinds = new Map(desired.panes
        .filter((pane, index) => pane.instrumentId !== current.panes[index].instrumentId)
        .map(({ paneId }) => [paneId, { kind: 'instrument-replacement' }]));
      return execution.materialize({ desiredWorkspace, requestKinds });
    },
    replaceSessionHours(mode) {
      return execution.replaceSessionHours(mode);
    },
    replaceTimeframe(timeframeId) {
      if (disposed || execution.isPending()) return;
      const current = paneState.read();
      const desiredWorkspace = paneState.desiredTimeframe(timeframeId);
      const desired = paneState.read(desiredWorkspace);
      const active = desired.panes.find(({ paneId }) => paneId === desired.activePaneId);
      const prior = current.panes.find(({ paneId }) => paneId === current.activePaneId);
      if (active.timeframeId === prior.timeframeId) return;
      return execution.materialize({ desiredWorkspace });
    },
    resetView(paneId = null) {
      const target = paneId ?? paneState.activePaneId();
      adapter.resetView(target, 12);
    },
    restart() {
      if (replay.snapshot().cursorEpochMs <= range.startEpochMs) return;
      return execution.action('restart-back-to', { targetEpochMs: range.startEpochMs }, { allowDim: true });
    },
    snapshot: () => Object.freeze({
      chart: adapter.snapshot(),
      paneWorkspace: paneState.current(),
      replay: replay.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start() {
      return execution.action('manual-next', {}, { loading: true });
    },
  });
}
