import {
  AUTOPLAY_SPEED_OPTIONS,
  createFoundationCapabilities,
  createReplayWorkspaceComposition,
} from '../replay-workspace-composition/public.js';
import { createLayoutSync, deserializeLayoutSync } from '../layout-sync-domain/public.js';
import {
  createPaneLayout,
  deserializePaneLayout,
  PANE_LAYOUT_OPTIONS,
} from '../pane-layout-domain/public.js';
import { deserializeWorkspaceCheckpoint, readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { createReplayWorkspaceView } from './workspace-view.js';
import { createWorkspacePresentationPort } from './workspace-presentation-port.js';
import { createWorkstationSettingsViewConsumer } from './workstation-settings-view-consumer.js';

function restoredWorkspace(record) {
  const configured = record.workspace.state === 'configured';
  return Object.freeze({
    initialCheckpoint: configured && record.workspace.schemaVersion >= 6
      ? deserializeWorkspaceCheckpoint(record.workspace.checkpoint, record.configuration)
      : null,
    initialLayout: configured ? deserializePaneLayout(record.workspace.paneLayout) : createPaneLayout(),
    initialLayoutSync: configured && record.workspace.schemaVersion >= 5
      ? deserializeLayoutSync(record.workspace.layoutSync)
      : createLayoutSync(),
  });
}

function createCallbacks() {
  return {
    annotationApply: null,
    annotationCancel: null,
    annotationReset: null,
    annotationToggleTool: null,
    annotationUpdateField: null,
    autoplay: null,
    cancelWorkstationSettingsPreview: null,
    exactGoto: null,
    focusPane: null,
    instrument: null,
    layout: null,
    layoutResize: null,
    layoutSync: null,
    next: null,
    paneContext: null,
    paneTimeLocation: null,
    pause: null,
    playbackSpeed: null,
    previewWorkstationSettings: null,
    previous: null,
    quickGoto: null,
    replayStep: null,
    reset: null,
    restart: null,
    saveGotoSettings: null,
    saveWorkstationSettings: null,
    sessionHours: null,
    timeframe: null,
    timeframeSync: null,
    truncation: null,
  };
}

function createBoundView(options, state, capabilities, callbacks) {
  const { colorHistory, initialNavigationSettings, onBack, record, workstationSettings } = options;
  return createReplayWorkspaceView({
    initialNavigationSettings,
    initialLayout: state.initialLayout,
    getWorkstationSettings: () => workstationSettings.snapshot(),
    getRecentColors: () => colorHistory.snapshot(),
    instrumentOptions: capabilities.instrumentOptions,
    layoutOptions: PANE_LAYOUT_OPTIONS,
    name: record.metadata.name,
    onAutoplay: () => callbacks.autoplay?.(),
    onAnnotationApply: () => callbacks.annotationApply?.(),
    onAnnotationCancel: () => callbacks.annotationCancel?.(),
    onAnnotationReset: () => callbacks.annotationReset?.(),
    onAnnotationToggleTool: (toolId) => callbacks.annotationToggleTool?.(toolId),
    onAnnotationUpdateField: (value) => callbacks.annotationUpdateField?.(value),
    onBack,
    onLayoutSync: (key, enabled) => callbacks.layoutSync?.(key, enabled),
    onExactGoto: (epochMs) => callbacks.exactGoto?.(epochMs),
    onFocusPane: (paneId) => callbacks.focusPane?.(paneId),
    onInstrument: (instrumentId) => callbacks.instrument?.(instrumentId),
    onLayout: (layoutId) => callbacks.layout?.(layoutId),
    onLayoutResize: (layout) => callbacks.layoutResize?.(layout),
    onNext: () => callbacks.next?.(),
    onPause: () => callbacks.pause?.(),
    onPaneContext: (request) => callbacks.paneContext?.(request) ?? false,
    onPaneTimeLocation: (request) => callbacks.paneTimeLocation?.(request),
    onPlaybackSpeed: (speedId) => callbacks.playbackSpeed?.(speedId),
    onPrevious: () => callbacks.previous?.(),
    onPreviewWorkstationSettings: (settings) => callbacks.previewWorkstationSettings?.(settings),
    onQuickGoto: (anchor) => callbacks.quickGoto?.(anchor),
    onCancelWorkstationSettingsPreview: () => callbacks.cancelWorkstationSettingsPreview?.(),
    onReset: (paneId) => callbacks.reset?.(paneId),
    onReplayStep: (replayStepId) => callbacks.replayStep?.(replayStepId),
    onRestart: () => callbacks.restart?.(),
    onSaveGotoSettings: (settings) => callbacks.saveGotoSettings?.(settings),
    onSaveWorkstationSettings: (settings) => callbacks.saveWorkstationSettings?.(settings),
    onRecordRecentColors: (colors) => colorHistory.record(colors),
    onSessionHours: (mode) => callbacks.sessionHours?.(mode),
    onTimeframeSync: (enabled) => callbacks.timeframeSync?.(enabled),
    onTimeframe: (timeframeId) => callbacks.timeframe?.(timeframeId),
    onTruncation: () => callbacks.truncation?.(),
    playbackSpeedOptions: AUTOPLAY_SPEED_OPTIONS,
    replayRange: record.configuration.historicalRange,
    replayStepOptions: capabilities.replayStepOptions,
    sessionHoursModes: capabilities.sessionHoursModes,
    timeframeMenuGroups: capabilities.timeframeMenuGroups,
  });
}

function bindCommands(callbacks, commands) {
  callbacks.annotationApply = () => commands.applyAnnotationInspector?.();
  callbacks.annotationCancel = () => commands.cancelAnnotationInspector?.();
  callbacks.annotationReset = () => commands.resetAnnotationInspector?.();
  callbacks.annotationToggleTool = (toolId) => commands.toggleAnnotationTool?.(toolId);
  callbacks.annotationUpdateField = (value) => commands.updateAnnotationInspectorField?.(value);
  callbacks.autoplay = () => commands.autoplay();
  callbacks.cancelWorkstationSettingsPreview = () => commands.cancelWorkstationSettingsPreview();
  callbacks.layoutSync = (key, enabled) => commands.changeLayoutSync(key, enabled);
  callbacks.exactGoto = (epochMs) => commands.gotoExact(epochMs);
  callbacks.focusPane = (paneId) => commands.focusPane(paneId);
  callbacks.instrument = (instrumentId) => commands.replaceInstrument(instrumentId);
  callbacks.layout = (layoutId) => commands.changePaneLayout(layoutId);
  callbacks.layoutResize = (layout) => commands.resizePaneLayout(layout);
  callbacks.next = () => commands.next();
  callbacks.pause = () => commands.pause();
  callbacks.paneContext = (request) => commands.openPaneTimeLocation(request);
  callbacks.paneTimeLocation = (request) => commands.locatePaneTime(request);
  callbacks.playbackSpeed = (speedId) => commands.changePlaybackSpeed(speedId);
  callbacks.previous = () => commands.previous();
  callbacks.previewWorkstationSettings = (settings) => commands.previewWorkstationSettings(settings);
  callbacks.quickGoto = (anchor) => commands.gotoQuick(anchor);
  callbacks.reset = (paneId) => commands.resetView(paneId);
  callbacks.replayStep = (replayStepId) => commands.changeReplayStep(replayStepId);
  callbacks.restart = () => commands.restart();
  callbacks.saveGotoSettings = (settings) => commands.saveGotoSettings(settings);
  callbacks.saveWorkstationSettings = (settings) => commands.saveWorkstationSettings(settings);
  callbacks.sessionHours = (mode) => commands.replaceSessionHours(mode);
  callbacks.timeframeSync = (enabled) => commands.changeTimeframeSync(enabled);
  callbacks.timeframe = (timeframeId) => commands.replaceTimeframe(timeframeId);
  callbacks.truncation = () => commands.toggleTruncationSelection();
}

export function mountReplayWorkspace(options) {
  const state = restoredWorkspace(options.record);
  const callbacks = createCallbacks();
  const capabilities = createFoundationCapabilities(options.record.configuration.instrumentIds);
  const view = createBoundView(options, state, capabilities, callbacks);
  view.setSelection({
    sessionHoursMode: state.initialCheckpoint === null
      ? capabilities.defaultTarget.sessionHoursMode
      : readWorkspaceCheckpoint(state.initialCheckpoint).sessionHoursMode,
  });
  options.root.replaceChildren(view.root);
  const commands = createReplayWorkspaceComposition({
    ...state,
    annotationWorkflow: options.annotationWorkflow,
    initialNavigationSettings: options.initialNavigationSettings,
    persistWorkspaceCheckpoint: options.onPersistWorkspaceCheckpoint,
    persistReplayNavigationSettings: options.onPersistReplayNavigationSettings,
    record: options.record,
    presentation: createWorkspacePresentationPort(view),
    workstationSettings: options.workstationSettings,
    workstationSettingsViewConsumer: createWorkstationSettingsViewConsumer({ view }),
  });
  bindCommands(callbacks, commands);
  void commands.start();
  return Object.freeze({ controller: commands, view });
}
