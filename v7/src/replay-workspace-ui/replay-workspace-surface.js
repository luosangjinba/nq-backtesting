import { supportsFoundationWorkspace } from './foundation-market.js';
import { createReplayWorkspaceController } from './workspace-controller.js';
import { createReplayWorkspaceView } from './workspace-view.js';
import { createFoundationCapabilities } from './foundation-capabilities.js';
import { AUTOPLAY_SPEED_OPTIONS } from './autoplay-speed.js';
import {
  createPaneLayout,
  deserializePaneLayout,
  PANE_LAYOUT_OPTIONS,
} from '../pane-layout-domain/public.js';

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
      onBack,
      onPersistPaneLayout = () => {},
      onPersistReplayNavigationSettings = () => {},
      record,
      root,
    }) {
      unmount();
      const initialLayout = record.workspace.state === 'configured'
        ? deserializePaneLayout(record.workspace.paneLayout)
        : createPaneLayout();
      const callbacks = {
        autoplay: null,
        crosshairSync: null,
        exactGoto: null,
        focusPane: null,
        instrument: null,
        layout: null,
        layoutResize: null,
        next: null,
        pause: null,
        playbackSpeed: null,
        previous: null,
        quickGoto: null,
        reset: null,
        replayStep: null,
        restart: null,
        saveGotoSettings: null,
        sessionHours: null,
        timeframeSync: null,
        timeframe: null,
        truncation: null,
      };
      const capabilities = createFoundationCapabilities(record.configuration.instrumentIds);
      const view = createReplayWorkspaceView({
        initialNavigationSettings,
        initialLayout,
        instrumentOptions: capabilities.instrumentOptions,
        layoutOptions: PANE_LAYOUT_OPTIONS,
        name: record.metadata.name,
        onAutoplay: () => callbacks.autoplay?.(),
        onBack,
        onCrosshairSync: (enabled) => callbacks.crosshairSync?.(enabled),
        onExactGoto: (epochMs) => callbacks.exactGoto?.(epochMs),
        onFocusPane: (paneId) => callbacks.focusPane?.(paneId),
        onInstrument: (instrumentId) => callbacks.instrument?.(instrumentId),
        onLayout: (layoutId) => callbacks.layout?.(layoutId),
        onLayoutResize: (layout) => callbacks.layoutResize?.(layout),
        onNext: () => callbacks.next?.(),
        onPause: () => callbacks.pause?.(),
        onPlaybackSpeed: (speedId) => callbacks.playbackSpeed?.(speedId),
        onPrevious: () => callbacks.previous?.(),
        onQuickGoto: (anchor) => callbacks.quickGoto?.(anchor),
        onReset: (paneId) => callbacks.reset?.(paneId),
        onReplayStep: (replayStepId) => callbacks.replayStep?.(replayStepId),
        onRestart: () => callbacks.restart?.(),
        onSaveGotoSettings: (settings) => callbacks.saveGotoSettings?.(settings),
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
      view.setSelection({ sessionHoursMode: capabilities.defaultTarget.sessionHoursMode });
      root.replaceChildren(view.root);
      const controller = createReplayWorkspaceController({
        initialLayout,
        initialNavigationSettings,
        persistPaneLayout: onPersistPaneLayout,
        persistReplayNavigationSettings: onPersistReplayNavigationSettings,
        record,
        view,
      });
      callbacks.autoplay = () => controller.autoplay();
      callbacks.crosshairSync = (enabled) => controller.changeCrosshairSync(enabled);
      callbacks.exactGoto = (epochMs) => controller.gotoExact(epochMs);
      callbacks.focusPane = (paneId) => controller.focusPane(paneId);
      callbacks.instrument = (instrumentId) => controller.replaceInstrument(instrumentId);
      callbacks.layout = (layoutId) => controller.changePaneLayout(layoutId);
      callbacks.layoutResize = (layout) => controller.resizePaneLayout(layout);
      callbacks.next = () => controller.next();
      callbacks.pause = () => controller.pause();
      callbacks.playbackSpeed = (speedId) => controller.changePlaybackSpeed(speedId);
      callbacks.previous = () => controller.previous();
      callbacks.quickGoto = (anchor) => controller.gotoQuick(anchor);
      callbacks.reset = (paneId) => controller.resetView(paneId);
      callbacks.replayStep = (replayStepId) => controller.changeReplayStep(replayStepId);
      callbacks.restart = () => controller.restart();
      callbacks.saveGotoSettings = (settings) => controller.saveGotoSettings(settings);
      callbacks.sessionHours = (mode) => controller.replaceSessionHours(mode);
      callbacks.timeframeSync = (enabled) => controller.changeTimeframeSync(enabled);
      callbacks.timeframe = (timeframeId) => controller.replaceTimeframe(timeframeId);
      callbacks.truncation = () => controller.toggleTruncationSelection();
      active = { controller, view };
      void controller.start();
      return controller;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
