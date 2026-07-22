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
  GOTO_TARGET_UNAVAILABLE_IN_RANGE,
} from '../replay-navigation-runtime/public.js';
import { readReplayNavigationSettings } from '../replay-navigation-settings/public.js';
import { createReplayRuntime } from '../replay-runtime/public.js';
import { createPaneLayout, readPaneLayout } from '../pane-layout-domain/public.js';
import { createWorkspaceTransactionRuntime } from '../workspace-transaction-runtime/public.js';
import { createReplayAutoplayScheduler } from './autoplay-scheduler.js';
import { DEFAULT_AUTOPLAY_SPEED, readAutoplaySpeed } from './autoplay-speed.js';
import { createFoundationMarket } from './foundation-market.js';
import { createFoundationSourceTraversal } from './foundation-source-traversal.js';
import { quickGotoLabel } from './goto-quick-actions.js';
import { createPaneDataComposition } from './pane-data-composition.js';
import { createPaneWorkspaceState } from './pane-workspace-state.js';
import { resolveReplayTruncationTarget } from './replay-truncation.js';
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
export function createReplayWorkspaceController({
  initialLayout,
  initialNavigationSettings,
  persistPaneLayout,
  persistReplayNavigationSettings,
  record,
  view,
  workstationSettings,
}) {
  const market = createFoundationMarket(record);
  const range = record.configuration.historicalRange;
  const replayStepById = new Map(market.replayStepOptions.map((option) => [option.id, option.step]));
  const replayStepIdByTimeframeId = new Map(
    market.timeframes.map(({ id, replayStepId }) => [id, replayStepId]),
  );
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
  let crosshairSync = false;
  let syncTimeframe = false;
  let truncationSelectionActive = false;
  let paneLayout = initialLayout ?? createPaneLayout();
  readReplayNavigationSettings(initialNavigationSettings);
  let navigationSchedule = createReplayNavigationSchedule({ settings: initialNavigationSettings });

  const paneState = createPaneWorkspaceState({
    initialCursorEpochMs: range.startEpochMs,
    initialPaneCount: readPaneLayout(paneLayout).paneCount,
    initialTarget: market.defaultTarget,
    record,
  });
  view.setSessionRange({ end: formatCursor(range.endEpochMs), start: formatCursor(range.startEpochMs) });
  view.setSelection({ sessionHoursMode: market.defaultTarget.sessionHoursMode });
  view.setLayout(paneLayout, paneState.paneIds());
  view.setCrosshairSync(false);
  view.setWorkspace(paneState.current());
  view.setTimeframeSync(false);
  view.setTruncationSelection({ active: false });

  function setReplayStep(replayStepId, publish = true) {
    const step = replayStepById.get(replayStepId);
    if (!step || replay.snapshot().replayStep === step) return replay.snapshot();
    const snapshot = replay.setReplayStep(step);
    if (publish) view.setReplay(snapshot);
    return snapshot;
  }

  function syncReplayStep(workspace = paneState.current(), publish = true) {
    if (!syncTimeframe) return replay.snapshot();
    const value = paneState.read(workspace);
    const active = value.panes.find(({ paneId }) => paneId === value.activePaneId);
    return setReplayStep(replayStepIdByTimeframeId.get(active.timeframeId), publish);
  }

  function setTruncationSelection(active, error = null) {
    truncationSelectionActive = active === true;
    adapter.setTruncationSelection(truncationSelectionActive);
    view.setTruncationSelection({ active: truncationSelectionActive, error });
  }

  function persistLayout(layout) {
    try {
      persistPaneLayout?.(layout);
      return true;
    } catch {
      view.setState('error', { message: 'Pane layout could not be saved locally.' });
      return false;
    }
  }

  async function handleTruncationSelect(_paneId, selection) {
    if (disposed || !truncationSelectionActive || execution.isPending()) return;
    let targetEpochMs;
    try {
      targetEpochMs = resolveReplayTruncationTarget({
        cursorEpochMs: replay.snapshot().cursorEpochMs,
        range,
        selection,
      });
    } catch (error) {
      view.setTruncationSelection({ active: true, error: error.message });
      return;
    }
    setTruncationSelection(false);
    await execution.action('goto-exact', { targetEpochMs }, { allowDim: true });
  }

  const adapter = createLightweightPaneSetAdapter({
    onCrosshairChange: ({ panes }) => view.setPaneOhlc(panes),
    onHistoryBoundary: (paneId, logicalRange) => {
      if (logicalRange.from < 24) void execution?.requestHistory(paneId);
    },
    onTruncationSelect: handleTruncationSelect,
    onViewportIntent: (paneId, intent) => view.setWall(paneId, intent.origin),
    resolveViewportPort: paneState.viewportPort,
    surfacePort: view.surfacePort,
  });
  const unregisterSettingsConsumer = workstationSettings.registerConsumer(
    adapter.workstationSettingsConsumer,
  );
  view.setWorkstationSettings(workstationSettings.snapshot());
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
    resolveSchedule: () => navigationSchedule,
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
    paneState.accept(desiredWorkspace, replay.snapshot().cursorEpochMs);
    syncReplayStep(paneState.current(), false);
    const replaySnapshot = replay.snapshot();
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
    view.setLayout(paneLayout, paneState.paneIds());
    view.setWorkspace(paneState.current());
    view.setWall(activePaneId, paneState.wallOrigin(activePaneId));
    view.setState(readyPanes.length === 0 ? 'empty' : 'ready');
  }

  execution = createWorkspaceExecution({
    acceptVisibleState, market, navigation, paneData, paneState, range, record, replay, runtime, view,
  });
  autoplayScheduler = createReplayAutoplayScheduler({
    cadenceMs: DEFAULT_AUTOPLAY_SPEED.cadenceMs,
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
  view.setPlaybackSpeed(DEFAULT_AUTOPLAY_SPEED.id);

  return Object.freeze({
    autoplay: () => autoplayScheduler.play(),
    changeCrosshairSync(enabled) {
      if (disposed || execution.isPending()) return;
      crosshairSync = enabled === true;
      adapter.setCrosshairSync(crosshairSync);
      view.setCrosshairSync(crosshairSync);
    },
    changeReplayStep(replayStepId) {
      if (disposed || execution.isPending() || syncTimeframe) return;
      setReplayStep(replayStepId);
    },
    changeTimeframeSync(enabled) {
      if (disposed || execution.isPending()) return;
      syncTimeframe = enabled === true;
      view.setTimeframeSync(syncTimeframe);
      if (syncTimeframe) syncReplayStep();
    },
    async changePaneLayout(variantId) {
      if (disposed || execution.isPending()) return null;
      const previousLayout = paneLayout;
      const previous = readPaneLayout(previousLayout);
      if (variantId === previous.variantId) return null;
      const desiredLayout = createPaneLayout({ variantId });
      const desired = readPaneLayout(desiredLayout);
      if (desired.paneCount === previous.paneCount) {
        paneLayout = desiredLayout;
        view.setLayout(paneLayout, paneState.paneIds());
        if (!persistLayout(paneLayout)) {
          paneLayout = previousLayout;
          view.setLayout(paneLayout, paneState.paneIds());
        }
        return null;
      }
      const current = paneState.read();
      const desiredWorkspace = paneState.desiredPaneCount(
        desired.paneCount,
        replay.snapshot().cursorEpochMs,
      );
      paneLayout = desiredLayout;
      view.setLayout(paneLayout, paneState.paneIds(desiredWorkspace));
      const terminal = await execution.materialize({ desiredWorkspace });
      if (terminal === null) {
        paneLayout = previousLayout;
        view.setLayout(paneLayout, current.panes.map(({ paneId }) => paneId));
        return null;
      }
      persistLayout(paneLayout);
      return terminal;
    },
    changePlaybackSpeed(speedId) {
      if (disposed) return;
      const speed = readAutoplaySpeed(speedId);
      autoplayScheduler.setCadenceMs(speed.cadenceMs);
      view.setPlaybackSpeed(speed.id);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unregisterSettingsConsumer();
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
      syncReplayStep();
    },
    gotoExact: (targetEpochMs) => execution.action('goto-exact', { targetEpochMs }, { allowDim: true }),
    async gotoQuick(anchor) {
      view.setGotoFeedback(null);
      const result = await execution.action('goto-anchor', { anchor }, { allowDim: true });
      if (result?.code === GOTO_TARGET_UNAVAILABLE_IN_RANGE) {
        view.setGotoFeedback(
          `No later ${quickGotoLabel(anchor)} is available. Replay range ends ${formatCursor(range.endEpochMs)}.`,
        );
      }
      return result;
    },
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
    resizePaneLayout(nextLayout) {
      if (disposed || execution.isPending()) return;
      const current = readPaneLayout(paneLayout);
      const next = readPaneLayout(nextLayout);
      if (current.variantId !== next.variantId || current.paneCount !== next.paneCount) return;
      const previousLayout = paneLayout;
      paneLayout = nextLayout;
      view.setLayout(paneLayout, paneState.paneIds());
      if (!persistLayout(paneLayout)) {
        paneLayout = previousLayout;
        view.setLayout(paneLayout, paneState.paneIds());
      }
    },
    resetView(paneId = null) {
      const target = paneId ?? paneState.activePaneId();
      adapter.resetView(target, 12);
    },
    saveGotoSettings(settings) {
      if (disposed || execution.isPending()) {
        return Object.freeze({ accepted: false, message: 'Wait for the current Replay update to finish.' });
      }
      try {
        readReplayNavigationSettings(settings);
        const schedule = createReplayNavigationSchedule({ settings });
        persistReplayNavigationSettings?.(settings);
        navigationSchedule = schedule;
        view.setGotoFeedback(null);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({ accepted: false, message: 'Quick GoTo settings could not be saved locally.' });
      }
    },
    saveWorkstationSettings(settings) {
      if (disposed) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        const snapshot = workstationSettings.save(settings);
        view.setWorkstationSettings(snapshot);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'Settings could not be applied to every Pane and saved locally.',
        });
      }
    },
    restart() {
      if (replay.snapshot().cursorEpochMs <= range.startEpochMs) return;
      return execution.action('restart-back-to', { targetEpochMs: range.startEpochMs }, { allowDim: true });
    },
    snapshot: () => Object.freeze({
      chart: adapter.snapshot(),
      crosshairSync,
      paneLayout,
      paneWorkspace: paneState.current(),
      replay: replay.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start() {
      return execution.action('manual-next', {}, { loading: true });
    },
    toggleTruncationSelection() {
      if (disposed || execution.isPending()) return;
      if (!truncationSelectionActive) autoplayScheduler.pause();
      setTruncationSelection(!truncationSelectionActive);
    },
  });
}
