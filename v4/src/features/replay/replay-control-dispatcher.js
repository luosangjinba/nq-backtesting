import { getPrimaryInstrument } from '../../data/primary-instrument-store.js';
import { getReplayActionFromEvent } from './replay-controller.js';
import { handleReplayHistoryControlAction } from './replay-history-controller.js';
import {
  applyReplayComparisonState,
  setReplayToolbarPrimaryInstrument,
  setReplayToolbarRange,
} from './replay-toolbar-sync.js';

export function handleReplayControlClick({
  event,
  replayState,
  restoreReplayToTimestamp,
  render,
  actions,
}) {
  const action = getReplayActionFromEvent(event);
  if (!action) return false;

  if (action === 'history-toggle') {
    replayState.historyOpen = !replayState.historyOpen;
    render();
    return true;
  }
  if (handleReplayHistoryControlAction({
    action,
    event,
    primaryInstrument: getPrimaryInstrument(),
    setToolbarPrimaryInstrument: setReplayToolbarPrimaryInstrument,
    setToolbarRange: setReplayToolbarRange,
    applyComparisonState: applyReplayComparisonState,
    restoreReplayToTimestamp,
    closeHistoryPanel: () => {
      replayState.historyOpen = false;
    },
    render,
  })) {
    return true;
  }

  const handler = actions[action];
  if (typeof handler === 'function') {
    handler();
    return true;
  }
  return false;
}
