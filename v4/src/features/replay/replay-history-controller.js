import {
  clearReplayHistory,
  deleteReplayHistoryItem,
  getReplayHistory,
} from '../../ui/replay-history-store.js';
import { loadReplayHistoryItem } from '../../ui/replay/replay-history-actions.js';

export function getReplayHistoryForInstrument(primaryInstrument) {
  return getReplayHistory(primaryInstrument);
}

export function handleReplayHistoryControlAction({
  action,
  event,
  primaryInstrument,
  setToolbarPrimaryInstrument,
  setToolbarRange,
  applyComparisonState,
  restoreReplayToTimestamp,
  closeHistoryPanel,
  render,
}) {
  if (action === 'history-toggle') {
    return false;
  }
  if (action === 'history-delete') {
    const id = event.target.closest('[data-history-id]')?.dataset.historyId;
    if (deleteReplayHistoryItem(id)) render();
    return true;
  }
  if (action === 'history-clear') {
    clearReplayHistory(primaryInstrument);
    render();
    return true;
  }
  if (action === 'history-load') {
    const id = event.target.closest('[data-history-id]')?.dataset.historyId;
    loadReplayHistoryItem(id, {
      primaryInstrument,
      setToolbarPrimaryInstrument,
      setToolbarRange,
      applyComparisonState,
      restoreReplayToTimestamp,
      closeHistoryPanel,
      render,
    });
    return true;
  }
  return false;
}
