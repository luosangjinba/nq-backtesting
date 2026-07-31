import {
  createBarDataRuntime,
  createProjectedHistoryRuntime,
} from '../bar-data-runtime/public.js';
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
import {
  createPaneLayout,
  readPaneLayout,
} from '../pane-layout-domain/public.js';
import { readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { createTimePresentation, readWorkstationSettings } from '../workstation-settings/public.js';
import { createWorkspaceTransactionRuntime } from '../workspace-transaction-runtime/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import {
  createWorkspaceStateRuntime,
  readWorkspaceStateSnapshot,
} from '../workspace-state-runtime/public.js';
import { createReplayAutoplayScheduler } from './autoplay-scheduler.js';
import { DEFAULT_AUTOPLAY_SPEED, readAutoplaySpeed } from './autoplay-speed.js';
import { createFoundationMarket } from './foundation-market.js';
import { createFoundationSourceTraversal } from './foundation-source-traversal.js';
import { quickGotoLabel } from './goto-quick-actions.js';
import { planReplacementHistoryFill } from './history-fill-plan.js';
import { createLayoutSyncController } from './layout-sync-controller.js';
import { createPaneDataComposition } from './pane-data-composition.js';
import { createPaneTimeLocationController } from './pane-time-location-controller.js';
import { WORKSPACE_PANE_IDS } from './pane-identity.js';
import { resolveReplayTruncationTarget } from './replay-truncation.js';
import { createWorkspaceCheckpointPersistence } from './workspace-checkpoint-persistence.js';
import { createWorkspaceExecution } from './workspace-execution.js';
import { createWorkspacePublicationPort } from './workspace-publication-port.js';
import { createViewportSettingsConsumer } from './viewport-settings-consumer.js';
import { createWorkstationSettingsViewConsumer } from './workstation-settings-view-consumer.js';

function formatCursor(settings, epochMs) {
  if (epochMs === null) return 'No Session bar visible';
  return createTimePresentation(settings).formatDateTime(epochMs);
}

/** Wire one real Session-scoped Replay clock to a uniform one/multi-Pane chart surface. */
export function createReplayWorkspaceController({
  initialLayout,
  initialLayoutSync,
  initialCheckpoint = null,
  initialNavigationSettings,
  persistWorkspaceCheckpoint,
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
  const restored = initialCheckpoint === null ? null : readWorkspaceCheckpoint(initialCheckpoint);
  if (restored && !market.sessionHoursModes.includes(restored.sessionHoursMode)) {
    throw new TypeError('Restored Session Hours mode is not supported by this workspace.');
  }
  if (restored && restored.panes.some(
    (pane, index) => pane.paneId !== WORKSPACE_PANE_IDS[index]
      || !market.timeframes.some(({ id }) => id === pane.timeframeId)
      || !market.instruments.some(({ id }) => id === pane.instrumentId),
  )) {
    throw new TypeError('Restored Pane capabilities are not supported by this workspace.');
  }
  const initialCursorEpochMs = restored?.cursorEpochMs ?? range.startEpochMs;
  const initialSessionHoursMode = restored?.sessionHoursMode ?? market.defaultTarget.sessionHoursMode;
  const replay = createReplayRuntime({
    activationGeneration: record.activationGeneration,
    initialCursorEpochMs,
    initialReplayStep: market.replayStepOptions[0].step,
    range,
    sessionId: record.sessionId,
  });
  let runtime = null;
  let disposed = false;
  let execution = null;
  let autoplayScheduler = null;
  let layoutSyncController = null;
  let syncTimeframe = false;
  let truncationSelectionActive = false;
  let paneLayout = initialLayout ?? createPaneLayout();
  readReplayNavigationSettings(initialNavigationSettings);
  let navigationSchedule = createReplayNavigationSchedule({ settings: initialNavigationSettings });

  const workspaceState = createWorkspaceStateRuntime({
    activationGeneration: record.activationGeneration,
    allowedInstrumentIds: record.configuration.instrumentIds,
    calendarRevision: market.calendar.revision,
    checkpointContext: record.configuration,
    initialCheckpoint,
    initialCursorEpochMs,
    initialPaneCount: readPaneLayout(paneLayout).paneCount,
    initialRightMarginBars: readWorkstationSettings(
      workstationSettings.snapshot().settings,
    ).canvas.rightMarginBars,
    initialSessionHoursMode,
    initialTarget: market.defaultTarget,
    paneIds: WORKSPACE_PANE_IDS,
    primaryInstrumentId: record.configuration.instrumentIds[0],
    sessionHoursModes: market.sessionHoursModes,
    sessionId: record.sessionId,
  });
  const semanticState = () => readWorkspaceStateSnapshot(workspaceState.snapshot());
  const acceptedPaneWorkspace = () => semanticState().paneWorkspace;
  view.setSessionRange({ endEpochMs: range.endEpochMs, startEpochMs: range.startEpochMs });
  view.setSelection({ sessionHoursMode: initialSessionHoursMode });
  view.setLayout(paneLayout, workspaceState.paneIds());
  view.setWorkspace(acceptedPaneWorkspace());
  view.setTimeframeSync(false);
  view.setTruncationSelection({ active: false });

  function setReplayStep(replayStepId, publish = true) {
    const step = replayStepById.get(replayStepId);
    if (!step || replay.snapshot().replayStep === step) return replay.snapshot();
    const snapshot = replay.setReplayStep(step);
    if (publish) view.setReplay(snapshot);
    return snapshot;
  }

  function syncReplayStep(workspace = acceptedPaneWorkspace(), publish = true) {
    if (!syncTimeframe) return replay.snapshot();
    const value = workspaceState.read(workspace);
    const active = value.panes.find(({ paneId }) => paneId === value.activePaneId);
    return setReplayStep(replayStepIdByTimeframeId.get(active.timeframeId), publish);
  }

  function desiredReplayStep(workspace = acceptedPaneWorkspace()) {
    if (!syncTimeframe) return replay.snapshot().replayStep;
    const value = workspaceState.read(workspace);
    const active = value.panes.find(({ paneId }) => paneId === value.activePaneId);
    return replayStepById.get(replayStepIdByTimeframeId.get(active.timeframeId));
  }

  function setTruncationSelection(active, error = null) {
    truncationSelectionActive = active === true;
    adapter.setTruncationSelection(truncationSelectionActive);
    view.setTruncationSelection({ active: truncationSelectionActive, error });
  }

  const checkpointPersistence = createWorkspaceCheckpointPersistence({
    initialCheckpoint,
    initialLayout: paneLayout,
    initialLayoutSync,
    persist: persistWorkspaceCheckpoint,
    readLayout: () => paneLayout,
    readLayoutSync: () => layoutSyncController?.snapshot() ?? initialLayoutSync,
    view,
    workspaceState,
  });

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
    onViewportIntent: (paneId, intent) => {
      view.setWall(paneId, intent.origin);
      checkpointPersistence.save({ message: 'Pane viewport could not be saved locally.' });
    },
    resolveInstrumentLabel: (instrumentId) => {
      const instrument = market.instrumentOptions.find(({ id }) => id === instrumentId);
      if (!instrument) throw new TypeError(`Unknown instrument ${instrumentId}.`);
      return instrument.label;
    },
    resolvePriceIncrement: (instrumentId) => {
      const instrument = market.instruments.find(({ id }) => id === instrumentId);
      if (!instrument) throw new TypeError(`Unknown instrument ${instrumentId}.`);
      return instrument.priceIncrement;
    },
    resolveViewportPort: workspaceState.viewportPort,
    surfacePort: view.surfacePort,
  });
  layoutSyncController = createLayoutSyncController({
    adapter,
    initialLayoutSync,
    persist: (layoutSync) => checkpointPersistence.save({ layoutSync, rethrow: true }),
    view,
  });
  const unregisterViewportSettingsConsumer = workstationSettings.registerConsumer(
    createViewportSettingsConsumer({ viewportDefaultsPort: workspaceState }),
  );
  const unregisterSettingsConsumer = workstationSettings.registerConsumer(
    adapter.workstationSettingsConsumer,
  );
  const unregisterViewSettingsConsumer = workstationSettings.registerConsumer(
    createWorkstationSettingsViewConsumer({ view }),
  );
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
  const projectedHistoryData = createProjectedHistoryRuntime({
    maxCacheEntries: 24,
    maxConcurrentRequests: 2,
    resolveProvider: () => market.projectedHistoryProvider,
  });
  const paneData = createPaneDataComposition({
    barData,
    market,
    projectedHistoryData,
    readAcceptedSnapshot: () => runtime?.snapshot().acceptedSnapshot?.workspace ?? null,
  });
  const materialization = createPaneSetMaterializationPorts({
    acquisitionPort: paneData.acquisitionPort,
    projectionPort: paneData.projectionPort,
  });
  const traversal = createFoundationSourceTraversal({
    barData,
    market,
  });
  const targetResolver = createReplayNavigationTargetResolver({
    resolveSchedule: () => navigationSchedule,
    sourceTraversalPort: traversal,
  });
  const replayPort = createReplayNavigationReplayPort({ replayRuntime: replay, targetResolver });

  function publicationValue() {
    return Object.freeze({
      layout: paneLayout,
      layoutSync: layoutSyncController.snapshot(),
    });
  }

  function renderAcceptedPublication(candidate) {
    const state = candidate.workspaceState;
    const replaySnapshot = candidate.replay;
    const workspaceSnapshot = candidate.workspace;
    paneLayout = candidate.publication.layout;
    const semanticWorkspace = workspaceState.read(state.paneWorkspace);
    const activePaneId = semanticWorkspace.activePaneId;
    const activeSemanticPane = semanticWorkspace.panes.find(({ paneId }) => paneId === activePaneId);
    const active = workspaceSnapshot?.panes.find(({ paneId }) => paneId === activePaneId)
      ?? workspaceSnapshot?.panes[0] ?? null;
    const readyPanes = workspaceSnapshot?.panes.filter(({ status }) => status === 'ready') ?? [];
    view.setCursor(replaySnapshot.visibleThroughEpochMs);
    view.setEvidence({
      replayRevision: replaySnapshot.revision,
      workspaceRevision: candidate.revision,
    });
    view.setReplay(replaySnapshot);
    view.setSelection({ sessionHoursMode: state.sessionHours.mode });
    view.setVisibleThrough({
      barCount: active?.status === 'ready' ? active.snapshot.bars.length : 0,
      paneCount: workspaceSnapshot?.panes.length ?? semanticWorkspace.panes.length,
      visibleThroughEpochMs: replaySnapshot.visibleThroughEpochMs,
    });
    view.setLayout(paneLayout, semanticWorkspace.panes.map(({ paneId }) => paneId));
    view.setWorkspace(state.paneWorkspace);
    view.setWall(activePaneId, readViewportIntent(activeSemanticPane.viewportIntent).origin);
    view.setState(workspaceSnapshot === null ? 'loading' : readyPanes.length === 0 ? 'empty' : 'ready');
  }

  const initialSemanticState = semanticState();
  const initialPublication = Object.freeze({
    identity: initialSemanticState.identity,
    operation: 'initial',
    publication: publicationValue(),
    replay: replay.snapshot(),
    revision: 0,
    schemaVersion: 1,
    workspace: null,
    workspaceState: initialSemanticState,
  });
  const publicationPort = createWorkspacePublicationPort({
    initialAccepted: initialPublication,
    onApply(candidate) {
      renderAcceptedPublication(candidate);
      checkpointPersistence.save({
        layout: candidate.publication.layout,
        layoutSync: candidate.publication.layoutSync,
        rethrow: true,
      });
    },
    onFinalize(candidate) {
      paneData.finalize(workspaceState.paneIds(candidate.workspaceState.paneWorkspace));
    },
    onReject: paneData.reject,
    onRollback(previous) {
      if (previous !== null) renderAcceptedPublication(previous);
    },
  });
  runtime = createWorkspaceTransactionRuntime({
    activationGeneration: record.activationGeneration,
    acquisitionPort: materialization.acquisitionPort,
    chartPort: chartApplication,
    publicationPort,
    projectionPort: materialization.projectionPort,
    replayPort,
    sessionId: record.sessionId,
    workspaceStatePort: workspaceState,
  });
  const navigation = createReplayNavigationExecutor({
    paneRequestPort: Object.freeze({
      createRequest: ({ responsePlan }) => paneData.createRequest({ responsePlan }),
    }),
    replayRuntime: replay,
    transactionRuntime: runtime,
  });

  execution = createWorkspaceExecution({
    historyPort: adapter,
    market,
    navigation,
    paneData,
    range,
    record,
    replay,
    resolvePublication: publicationValue,
    resolveReplayStep: desiredReplayStep,
    runtime,
    view,
    workspaceState,
  });
  const paneTimeLocation = createPaneTimeLocationController({
    adapter,
    execution,
    market,
    readSettings: () => workstationSettings.snapshot().settings,
    view,
    workspaceState,
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
    changeLayoutSync(key, enabled) {
      if (disposed || execution.isPending()) return false;
      return layoutSyncController.change(key, enabled);
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
        view.setLayout(paneLayout, workspaceState.paneIds());
        if (!checkpointPersistence.save({
          layout: paneLayout,
          message: 'Pane layout could not be saved locally.',
        })) {
          paneLayout = previousLayout;
          view.setLayout(paneLayout, workspaceState.paneIds());
        }
        return null;
      }
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredPaneCount(
        desired.paneCount,
        replay.snapshot().cursorEpochMs,
      );
      paneLayout = desiredLayout;
      view.setLayout(paneLayout, workspaceState.paneIds(desiredWorkspace));
      const terminal = await execution.materialize({ desiredWorkspace });
      if (terminal === null) {
        paneLayout = previousLayout;
        view.setLayout(paneLayout, current.panes.map(({ paneId }) => paneId));
        return null;
      }
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
      try { workstationSettings.cancelPreview(); } catch { /* Disposal still owns teardown. */ }
      disposed = true;
      unregisterViewSettingsConsumer();
      unregisterSettingsConsumer();
      unregisterViewportSettingsConsumer();
      autoplayScheduler.dispose();
      paneTimeLocation.dispose();
      execution.dispose();
      runtime.dispose();
      chartApplication.dispose();
      adapter.dispose();
      barData.dispose();
      projectedHistoryData.dispose();
      replay.dispose();
      market.dispose();
      workspaceState.dispose();
    },
    focusPane(paneId) {
      if (disposed || execution.isPending()) return;
      const previousPaneId = workspaceState.activePaneId();
      const focused = readWorkspaceStateSnapshot(workspaceState.focus(paneId));
      view.setWorkspace(focused.paneWorkspace);
      view.setWall(paneId, workspaceState.wallOrigin(paneId));
      syncReplayStep();
      if (!checkpointPersistence.save({ message: 'Active Pane could not be saved locally.' })) {
        const restoredState = readWorkspaceStateSnapshot(workspaceState.focus(previousPaneId));
        view.setWorkspace(restoredState.paneWorkspace);
        view.setWall(previousPaneId, workspaceState.wallOrigin(previousPaneId));
        syncReplayStep();
      }
    },
    locatePaneTime: (request) => paneTimeLocation.locate(request),
    openPaneTimeLocation: (request) => paneTimeLocation.open(request),
    gotoExact: (targetEpochMs) => execution.action('goto-exact', { targetEpochMs }, { allowDim: true }),
    async gotoQuick(anchor) {
      view.setGotoFeedback(null);
      const result = await execution.action('goto-anchor', { anchor }, { allowDim: true });
      if (result?.code === GOTO_TARGET_UNAVAILABLE_IN_RANGE) {
        view.setGotoFeedback(
          `No later ${quickGotoLabel(anchor)} is available. Replay range ends ${formatCursor(
            workstationSettings.snapshot().settings,
            range.endEpochMs,
          )}.`,
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
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredInstrument(
        instrumentId,
        layoutSyncController.read().symbol,
      );
      const desired = workspaceState.read(desiredWorkspace);
      const requestKinds = new Map(desired.panes
        .filter((pane, index) => pane.instrumentId !== current.panes[index].instrumentId)
        .map(({ paneId }) => [paneId, { kind: 'instrument-replacement' }]));
      if (requestKinds.size === 0) return;
      return execution.materialize({ desiredWorkspace, requestKinds });
    },
    replaceSessionHours(mode) {
      if (disposed || execution.isPending()) return;
      const requestKinds = new Map(workspaceState.read(acceptedPaneWorkspace()).panes.map((pane) => [pane.paneId, {
        historyDisplayBars: planReplacementHistoryFill(
          readViewportIntent(pane.viewportIntent),
        ).displayBars,
        kind: 'session-hours-replacement',
      }]));
      return execution.replaceSessionHours(mode, requestKinds);
    },
    replaceTimeframe(timeframeId) {
      if (disposed || execution.isPending()) return;
      const current = workspaceState.read(acceptedPaneWorkspace());
      const desiredWorkspace = workspaceState.desiredTimeframe(
        timeframeId,
        layoutSyncController.read().interval,
      );
      const desired = workspaceState.read(desiredWorkspace);
      const changedPanes = desired.panes.filter(
        (pane, index) => pane.timeframeId !== current.panes[index].timeframeId,
      );
      if (changedPanes.length === 0) return;
      const requestKinds = new Map(changedPanes.map((pane) => [pane.paneId, {
        historyDisplayBars: planReplacementHistoryFill(
          readViewportIntent(pane.viewportIntent),
        ).displayBars,
        kind: 'timeframe-replacement',
      }]));
      return execution.materialize({ desiredWorkspace, requestKinds });
    },
    resizePaneLayout(nextLayout) {
      if (disposed || execution.isPending()) return;
      const current = readPaneLayout(paneLayout);
      const next = readPaneLayout(nextLayout);
      if (current.variantId !== next.variantId || current.paneCount !== next.paneCount) return;
      const previousLayout = paneLayout;
      paneLayout = nextLayout;
      view.setLayout(paneLayout, workspaceState.paneIds());
      if (!checkpointPersistence.save({
        layout: paneLayout,
        message: 'Pane layout could not be saved locally.',
      })) {
        paneLayout = previousLayout;
        view.setLayout(paneLayout, workspaceState.paneIds());
      }
    },
    resetView(paneId = null) {
      const target = paneId ?? workspaceState.activePaneId();
      adapter.resetView(target);
    },
    cancelWorkstationSettingsPreview() {
      if (disposed) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        workstationSettings.cancelPreview();
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'The Settings preview could not be restored on every Pane.',
        });
      }
    },
    previewWorkstationSettings(settings) {
      if (disposed) {
        return Object.freeze({ accepted: false, message: 'Settings are no longer available.' });
      }
      try {
        workstationSettings.preview(settings);
        return Object.freeze({ accepted: true, message: null });
      } catch {
        return Object.freeze({
          accepted: false,
          message: 'Settings preview could not be applied to every Pane.',
        });
      }
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
        workstationSettings.save(settings);
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
      crosshairSync: layoutSyncController.read().crosshair,
      layoutSync: layoutSyncController.snapshot(),
      paneLayout,
      paneWorkspace: acceptedPaneWorkspace(),
      replay: replay.snapshot(),
      semanticState: workspaceState.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start() {
      return restored === null
        ? execution.action('manual-next', {}, { loading: true })
        : execution.materialize({}, { allowDim: true, loading: true });
    },
    toggleTruncationSelection() {
      if (disposed || execution.isPending()) return;
      if (!truncationSelectionActive) autoplayScheduler.pause();
      setTruncationSelection(!truncationSelectionActive);
    },
  });
}
