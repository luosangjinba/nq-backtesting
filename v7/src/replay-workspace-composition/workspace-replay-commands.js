import { GOTO_TARGET_UNAVAILABLE_IN_RANGE } from '../replay-navigation-runtime/public.js';
import { createTimePresentation } from '../workstation-settings/public.js';
import { readAutoplaySpeed } from './autoplay-speed.js';
import { quickGotoLabel } from './goto-quick-actions.js';

function formatCursor(settings, epochMs) {
  if (epochMs === null) return 'No Session bar visible';
  return createTimePresentation(settings).formatDateTime(epochMs);
}

/** Coordinate Replay transport, GoTo, Pane-location, and truncation commands. */
export function createWorkspaceReplayCommands({
  autoplayScheduler,
  execution,
  isDisposed,
  paneTimeLocation,
  presentation,
  range,
  readTruncationSelection,
  replay,
  restored,
  setTruncationSelection,
  workstationSettings,
}) {
  return Object.freeze({
    autoplay: () => autoplayScheduler.play(),
    changePlaybackSpeed(speedId) {
      if (isDisposed()) return;
      const speed = readAutoplaySpeed(speedId);
      autoplayScheduler.setCadenceMs(speed.cadenceMs);
      presentation.setPlaybackSpeed(speed.id);
    },
    locatePaneTime: (request) => paneTimeLocation.locate(request),
    openPaneTimeLocation: (request) => paneTimeLocation.open(request),
    gotoExact: (targetEpochMs) => execution.action('goto-exact', { targetEpochMs }, { allowDim: true }),
    async gotoQuick(anchor) {
      presentation.setGotoFeedback(null);
      const result = await execution.action('goto-anchor', { anchor }, { allowDim: true });
      if (result?.code === GOTO_TARGET_UNAVAILABLE_IN_RANGE) {
        presentation.setGotoFeedback(
          `No later ${quickGotoLabel(anchor)} is available. Replay range ends ${formatCursor(
            workstationSettings.snapshot().settings,
            range.endEpochMs,
          )}.`,
        );
      }
      return result;
    },
    next: () => execution.action('manual-next'),
    pause: () => (isDisposed() ? undefined : autoplayScheduler.pause()),
    previous: () => execution.action('manual-previous', {}, { allowDim: true }),
    restart() {
      if (replay.snapshot().cursorEpochMs <= range.startEpochMs) return;
      return execution.action('restart-back-to', { targetEpochMs: range.startEpochMs }, { allowDim: true });
    },
    start: () => (restored === null
      ? execution.action('manual-next', {}, { loading: true })
      : execution.materialize({}, { allowDim: true, loading: true })),
    toggleTruncationSelection() {
      if (isDisposed() || execution.isPending()) return;
      if (!readTruncationSelection()) autoplayScheduler.pause();
      setTruncationSelection(!readTruncationSelection());
    },
  });
}
