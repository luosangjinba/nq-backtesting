import {
  createReplayNavigationSchedule,
} from '../replay-navigation-runtime/public.js';
import { readReplayNavigationSettings } from '../replay-navigation-settings/public.js';
import { createReplayRuntime } from '../replay-runtime/public.js';
import { createPaneLayout, readPaneLayout } from '../pane-layout-domain/public.js';
import { readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { readWorkstationSettings } from '../workstation-settings/public.js';
import {
  createWorkspaceStateRuntime,
  readWorkspaceStateSnapshot,
} from '../workspace-state-runtime/public.js';
import { createFoundationMarket } from './foundation-market.js';
import { WORKSPACE_PANE_IDS } from './pane-identity.js';

function sessionRangePresentation(range) {
  return Object.freeze({
    endEpochMs: range.presentationEndEpochMs ?? range.endEpochMs,
    startEpochMs: range.startEpochMs,
  });
}

function validateRestoredWorkspace(restored, market) {
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
}

function createSessionOwners({
  initialCheckpoint,
  initialPaneCount,
  record,
  workstationSettings,
}) {
  const market = createFoundationMarket(record);
  const range = record.configuration.historicalRange;
  const restored = initialCheckpoint === null ? null : readWorkspaceCheckpoint(initialCheckpoint);
  validateRestoredWorkspace(restored, market);
  const initialCursorEpochMs = restored?.cursorEpochMs ?? range.startEpochMs;
  const initialSessionHoursMode = restored?.sessionHoursMode ?? market.defaultTarget.sessionHoursMode;
  const replay = createReplayRuntime({
    activationGeneration: record.activationGeneration,
    initialCursorEpochMs,
    initialReplayStep: market.replayStepOptions[0].step,
    range,
    sessionId: record.sessionId,
  });
  const workspaceState = createWorkspaceStateRuntime({
    activationGeneration: record.activationGeneration,
    allowedInstrumentIds: record.configuration.instrumentIds,
    calendarRevision: market.calendar.revision,
    checkpointContext: record.configuration,
    initialCheckpoint,
    initialCursorEpochMs,
    initialPaneCount,
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
  return Object.freeze({
    initialSessionHoursMode, market, range, replay, restored, workspaceState,
  });
}

/** Construct Session-scoped market, Replay, and semantic Workspace owner state. */
export function createWorkspaceSessionState({
  initialCheckpoint,
  initialLayout,
  initialNavigationSettings,
  presentation,
  record,
  workstationSettings,
}) {
  let paneLayout = initialLayout ?? createPaneLayout();
  const {
    initialSessionHoursMode, market, range, replay, restored, workspaceState,
  } = createSessionOwners({
    initialCheckpoint,
    initialPaneCount: readPaneLayout(paneLayout).paneCount,
    record,
    workstationSettings,
  });
  let navigationSchedule = createReplayNavigationSchedule({ settings: initialNavigationSettings });
  let readLayoutSyncValue = () => null;
  let syncTimeframe = false;
  let truncationSelectionActive = false;
  readReplayNavigationSettings(initialNavigationSettings);
  const replayStepById = new Map(market.replayStepOptions.map((option) => [option.id, option.step]));
  const maximumReplayStepOption = market.replayStepOptions.at(-1);
  const replayStepIdByTimeframeId = new Map(
    market.timeframes.map(({ id, replayStepId }) => [id, replayStepId]),
  );
  const semanticState = () => readWorkspaceStateSnapshot(workspaceState.snapshot());
  const acceptedPaneWorkspace = () => semanticState().paneWorkspace;

  function setReplayStep(replayStepId, publish = true) {
    const step = replayStepById.get(replayStepId);
    if (!step || replay.snapshot().replayStep === step) return replay.snapshot();
    const snapshot = replay.setReplayStep(step);
    if (publish) presentation.setReplay(snapshot);
    return snapshot;
  }

  function synchronizedReplayStepId(timeframeId) {
    return replayStepIdByTimeframeId.get(timeframeId) ?? maximumReplayStepOption.id;
  }

  function syncReplayStep(workspace = acceptedPaneWorkspace(), publish = true) {
    if (!syncTimeframe) return replay.snapshot();
    const value = workspaceState.read(workspace);
    const active = value.panes.find(({ paneId }) => paneId === value.activePaneId);
    return setReplayStep(synchronizedReplayStepId(active.timeframeId), publish);
  }

  presentation.setSessionRange(sessionRangePresentation(range));
  presentation.setSelection({ sessionHoursMode: initialSessionHoursMode });
  presentation.setLayout(paneLayout, workspaceState.paneIds());
  presentation.setWorkspace(acceptedPaneWorkspace());
  presentation.setTimeframeSync(false);
  presentation.setTruncationSelection({ active: false });

  return Object.freeze({
    acceptedPaneWorkspace,
    desiredReplayStep(workspace = acceptedPaneWorkspace()) {
      if (!syncTimeframe) return replay.snapshot().replayStep;
      const value = workspaceState.read(workspace);
      const active = value.panes.find(({ paneId }) => paneId === value.activePaneId);
      return replayStepById.get(synchronizedReplayStepId(active.timeframeId));
    },
    market,
    range,
    readNavigationSchedule: () => navigationSchedule,
    readLayoutSync: () => readLayoutSyncValue(),
    readPaneLayout: () => paneLayout,
    readSyncTimeframe: () => syncTimeframe,
    readTruncationSelection: () => truncationSelectionActive,
    replay,
    restored,
    semanticState,
    setNavigationSchedule: (value) => { navigationSchedule = value; },
    setLayoutSyncReader: (reader) => { readLayoutSyncValue = reader; },
    setPaneLayout: (value) => { paneLayout = value; },
    setReplayStep,
    setSyncTimeframe: (value) => { syncTimeframe = value; },
    setTruncationSelection: (value) => { truncationSelectionActive = value === true; },
    syncReplayStep,
    workspaceState,
  });
}
