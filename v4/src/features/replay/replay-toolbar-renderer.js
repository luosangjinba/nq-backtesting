import { timeframeToString } from '../../config.js';
import { getReplayHistoryForInstrument } from './replay-history-controller.js';
import { REPLAY_SPEEDS } from './replay-controller.js';
import { renderReplayControlsView } from './replay-view.js';

export function renderReplayToolbarControls({
  controlsEl,
  replayState,
  currentTimeframe,
  primaryInstrument,
  isPlaying,
  onSpeedChange,
  onJumpEnter,
}) {
  if (!controlsEl) return;

  const hasData = replayState.chartData.length > 0;
  const currentBar = replayState.cursorIndex >= 0 ? replayState.displayBars[replayState.cursorIndex] : null;
  const lastDisabled = !hasData || replayState.lastCursorIndex < 0;
  const history = getReplayHistoryForInstrument(primaryInstrument);
  controlsEl.innerHTML = renderReplayControlsView({
    hasData,
    enabled: replayState.enabled,
    currentBar,
    cursorIndex: replayState.cursorIndex,
    dataCount: replayState.chartData.length,
    isPlaying,
    tfLabel: timeframeToString(currentTimeframe),
    mode: replayState.mode,
    speedIndex: replayState.speedIndex,
    lastDisabled,
    historyOpen: replayState.historyOpen,
    history,
    speeds: REPLAY_SPEEDS,
  });

  controlsEl.querySelector('.replay-speed')?.addEventListener('change', onSpeedChange);
  controlsEl.querySelector('[data-replay-jump-input]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onJumpEnter();
    }
  });
}
