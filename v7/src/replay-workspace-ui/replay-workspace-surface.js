import { supportsFoundationWorkspace } from './foundation-market.js';
import { createReplayWorkspaceController } from './workspace-controller.js';
import { createReplayWorkspaceView } from './workspace-view.js';
import { createFoundationCapabilities } from './foundation-capabilities.js';
import { AUTOPLAY_SPEED_OPTIONS } from './autoplay-speed.js';

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
    mount({ onBack, record, root }) {
      unmount();
      const callbacks = {
        autoplay: null,
        exactGoto: null,
        focusPane: null,
        instrument: null,
        next: null,
        paneCount: null,
        pause: null,
        playbackSpeed: null,
        previous: null,
        quickGoto: null,
        reset: null,
        replayStep: null,
        restart: null,
        sessionHours: null,
        timeframe: null,
      };
      const capabilities = createFoundationCapabilities(record.configuration.instrumentIds);
      const view = createReplayWorkspaceView({
        instrumentOptions: capabilities.instrumentOptions,
        name: record.metadata.name,
        onAutoplay: () => callbacks.autoplay?.(),
        onBack,
        onExactGoto: (epochMs) => callbacks.exactGoto?.(epochMs),
        onFocusPane: (paneId) => callbacks.focusPane?.(paneId),
        onInstrument: (instrumentId) => callbacks.instrument?.(instrumentId),
        onNext: () => callbacks.next?.(),
        onPaneCount: (count) => callbacks.paneCount?.(count),
        onPause: () => callbacks.pause?.(),
        onPlaybackSpeed: (speedId) => callbacks.playbackSpeed?.(speedId),
        onPrevious: () => callbacks.previous?.(),
        onQuickGoto: (anchor) => callbacks.quickGoto?.(anchor),
        onReset: (paneId) => callbacks.reset?.(paneId),
        onReplayStep: (replayStepId) => callbacks.replayStep?.(replayStepId),
        onRestart: () => callbacks.restart?.(),
        onSessionHours: (mode) => callbacks.sessionHours?.(mode),
        onTimeframe: (timeframeId) => callbacks.timeframe?.(timeframeId),
        playbackSpeedOptions: AUTOPLAY_SPEED_OPTIONS,
        replayStepOptions: capabilities.replayStepOptions,
        sessionHoursModes: capabilities.sessionHoursModes,
        timeframeMenuGroups: capabilities.timeframeMenuGroups,
      });
      view.setSelection({ sessionHoursMode: capabilities.defaultTarget.sessionHoursMode });
      root.replaceChildren(view.root);
      const controller = createReplayWorkspaceController({ record, view });
      callbacks.autoplay = () => controller.autoplay();
      callbacks.exactGoto = (epochMs) => controller.gotoExact(epochMs);
      callbacks.focusPane = (paneId) => controller.focusPane(paneId);
      callbacks.instrument = (instrumentId) => controller.replaceInstrument(instrumentId);
      callbacks.next = () => controller.next();
      callbacks.paneCount = (count) => controller.changePaneCount(count);
      callbacks.pause = () => controller.pause();
      callbacks.playbackSpeed = (speedId) => controller.changePlaybackSpeed(speedId);
      callbacks.previous = () => controller.previous();
      callbacks.quickGoto = (anchor) => controller.gotoQuick(anchor);
      callbacks.reset = (paneId) => controller.resetView(paneId);
      callbacks.replayStep = (replayStepId) => controller.changeReplayStep(replayStepId);
      callbacks.restart = () => controller.restart();
      callbacks.sessionHours = (mode) => controller.replaceSessionHours(mode);
      callbacks.timeframe = (timeframeId) => controller.replaceTimeframe(timeframeId);
      active = { controller, view };
      void controller.start();
      return controller;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
