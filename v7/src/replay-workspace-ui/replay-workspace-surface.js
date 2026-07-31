import {
  AUTOPLAY_SPEED_OPTIONS,
  createFoundationCapabilities,
  createReplayWorkspaceComposition,
  supportsFoundationWorkspace,
} from '../replay-workspace-composition/public.js';
import { createReplayWorkspaceView } from './workspace-view.js';
import { createWorkspacePresentationPort } from './workspace-presentation-port.js';
import { createWorkstationSettingsViewConsumer } from './workstation-settings-view-consumer.js';
import {
  createPaneLayout,
  deserializePaneLayout,
  PANE_LAYOUT_OPTIONS,
} from '../pane-layout-domain/public.js';
import { createLayoutSync, deserializeLayoutSync } from '../layout-sync-domain/public.js';
import { deserializeWorkspaceCheckpoint, readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';

/** Own the professional replay-workspace DOM subtree mounted by the route UI. */
export function createReplayWorkspaceSurface() {
  let active = null;

  function unmount() {
    if (!active) return;
    active.controller.dispose();
    active.view.dispose();
    active = null;
  }

  return Object.freeze({
    dispose: unmount,
    mount({
      initialNavigationSettings,
      colorHistory,
      workstationSettings,
      onBack,
      onPersistWorkspaceCheckpoint = () => {},
      onPersistReplayNavigationSettings = () => {},
      record,
      root,
    }) {
      unmount();
      const initialLayout = record.workspace.state === 'configured'
        ? deserializePaneLayout(record.workspace.paneLayout)
        : createPaneLayout();
      const initialLayoutSync = record.workspace.state === 'configured'
        && record.workspace.schemaVersion >= 5
        ? deserializeLayoutSync(record.workspace.layoutSync)
        : createLayoutSync();
      const initialCheckpoint = record.workspace.state === 'configured'
        && record.workspace.schemaVersion >= 6
        ? deserializeWorkspaceCheckpoint(record.workspace.checkpoint, record.configuration)
        : null;
      const callbacks = {
        autoplay: null,
        cancelWorkstationSettingsPreview: null,
        layoutSync: null,
        exactGoto: null,
        focusPane: null,
        instrument: null,
        layout: null,
        layoutResize: null,
        next: null,
        pause: null,
        paneContext: null,
        paneTimeLocation: null,
        playbackSpeed: null,
        previous: null,
        previewWorkstationSettings: null,
        quickGoto: null,
        reset: null,
        replayStep: null,
        restart: null,
        saveGotoSettings: null,
        saveWorkstationSettings: null,
        sessionHours: null,
        timeframeSync: null,
        timeframe: null,
        truncation: null,
      };
      const capabilities = createFoundationCapabilities(record.configuration.instrumentIds);
      const view = createReplayWorkspaceView({
        initialNavigationSettings,
        initialLayout,
        getWorkstationSettings: () => workstationSettings.snapshot(),
        getRecentColors: () => colorHistory.snapshot(),
        instrumentOptions: capabilities.instrumentOptions,
        layoutOptions: PANE_LAYOUT_OPTIONS,
        name: record.metadata.name,
        onAutoplay: () => callbacks.autoplay?.(),
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
      view.setSelection({
        sessionHoursMode: initialCheckpoint === null
          ? capabilities.defaultTarget.sessionHoursMode
          : readWorkspaceCheckpoint(initialCheckpoint).sessionHoursMode,
      });
      root.replaceChildren(view.root);
      const commands = createReplayWorkspaceComposition({
        initialLayout,
        initialLayoutSync,
        initialCheckpoint,
        initialNavigationSettings,
        persistWorkspaceCheckpoint: onPersistWorkspaceCheckpoint,
        persistReplayNavigationSettings: onPersistReplayNavigationSettings,
        record,
        presentation: createWorkspacePresentationPort(view),
        workstationSettings,
        workstationSettingsViewConsumer: createWorkstationSettingsViewConsumer({ view }),
      });
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
      active = { controller: commands, view };
      void commands.start();
      return commands;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
