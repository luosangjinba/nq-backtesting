import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';

export function createChartReplayControlsController({
  root,
  dispatchCommand,
  getSessionId,
  getReplayLoaded,
  getPlaybackPlaying,
  setPlaybackPlaying,
  getPlaybackIntervalMs,
  setPlaybackIntervalMs,
  getTerminalReason,
  setTerminalReason,
  getRevealedCount,
  getSessionTimeframe,
  getDisplayTimeframe,
  setDisplayTimeframe,
  setActivePaneDisplayTimeframe,
  getReplayIntervalTimeframe,
  setReplayIntervalTimeframe,
  getReplayIntervalSync,
  setReplayIntervalSync,
  getTruncatePickMode,
  getGoToInputValue,
  formatReplayTimestamp,
  refreshReplayStatus,
  setStatusText,
  getCommandInFlight = () => false,
  setCommandInFlight = () => {},
}) {
  const nextButton = root.querySelector('[data-replay-next]');
  const playButton = root.querySelector('[data-replay-play]');
  const pauseButton = root.querySelector('[data-replay-pause]');
  const resetButton = root.querySelector('[data-replay-reset]');
  const replayTruncateButton = root.querySelector('[data-replay-truncate-to-selection]');
  const replayPreviousButton = root.querySelector('[data-replay-previous]');
  const replaySpeedInput = root.querySelector('[data-replay-speed]');
  const replayIntervalSelect = root.querySelector('[data-replay-interval-select]');
  const replaySyncIntervalInput = root.querySelector('[data-replay-sync-interval]');
  const displayTimeframeSelect = root.querySelector('[data-display-timeframe-select]');
  const goToOpenButton = root.querySelector('[data-chart-go-to-open]');
  const goToInput = root.querySelector('[data-chart-go-to-input]');
  const goToButton = root.querySelector('[data-chart-go-to]');
  const jumpCursorButton = root.querySelector('[data-chart-jump-cursor]');
  const jumpCursorPopoverButton = root.querySelector('[data-chart-jump-cursor-popover]');
  let replayCommandQueue = Promise.resolve();

  function replayStepCount() {
    const base = Number(getSessionTimeframe() || 1);
    const selected = Number(getReplayIntervalTimeframe() || base);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(selected) || selected <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(selected / base));
  }

  function renderControls() {
    displayTimeframeSelect.value = getDisplayTimeframe() ? String(getDisplayTimeframe()) : '1';
    replayIntervalSelect.value = getReplayIntervalTimeframe() ? String(getReplayIntervalTimeframe()) : '1';
    replaySyncIntervalInput.checked = getReplayIntervalSync();
    replaySpeedInput.value = String(getPlaybackIntervalMs());
  }

  function setControlsDisabled(disabled = false) {
    const unavailable = disabled || !getReplayLoaded() || !getSessionId();
    const playbackPlaying = getPlaybackPlaying();
    nextButton.disabled = unavailable;
    playButton.disabled = unavailable || playbackPlaying;
    pauseButton.disabled = unavailable || !playbackPlaying;
    resetButton.disabled = unavailable;
    replayTruncateButton.disabled = unavailable;
    replayTruncateButton.setAttribute('aria-pressed', getTruncatePickMode() ? 'true' : 'false');
    replayPreviousButton.disabled = unavailable || getRevealedCount() <= 0;
    replaySpeedInput.disabled = unavailable;
    replayIntervalSelect.disabled = unavailable;
    replaySyncIntervalInput.disabled = unavailable;
    goToInput.disabled = unavailable;
    goToOpenButton.disabled = unavailable;
    goToButton.disabled = unavailable || !getGoToInputValue();
    if (jumpCursorButton) {
      jumpCursorButton.disabled = unavailable;
    }
    jumpCursorPopoverButton.disabled = unavailable;
    root.querySelectorAll('[data-chart-toolbar] button').forEach((button) => {
      button.disabled = unavailable;
    });
    displayTimeframeSelect.disabled = unavailable;
    playButton.hidden = playbackPlaying;
    pauseButton.hidden = !playbackPlaying;
  }

  async function runReplayCommand(action) {
    if (!getSessionId()) return null;
    const runQueued = async () => {
      if (getCommandInFlight()) return null;
      setCommandInFlight(true);
      try {
        return await action();
      } finally {
        setCommandInFlight(false);
        setControlsDisabled(false);
      }
    };
    const result = replayCommandQueue.then(runQueued, runQueued);
    replayCommandQueue = result.catch(() => null);
    return result;
  }

  nextButton.addEventListener('click', async () => {
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.NEXT, {
      sessionId: getSessionId(),
      stepCount: replayStepCount(),
    }));
    if (!state) return;
    setTerminalReason(state.advanced ? '' : state.reason || 'stopped');
    setStatusText(state.advanced
      ? `Loaded ${state.displayBars.length} bars.`
      : `Replay stopped: ${state.reason || 'no next bar'}.`);
    await refreshReplayStatus();
  });

  replayPreviousButton.addEventListener('click', async () => {
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
      sessionId: getSessionId(),
      stepCount: replayStepCount(),
    }));
    if (!state) return;
    setTerminalReason(state.rewound ? '' : state.reason || 'stopped');
    setStatusText(state.rewound
      ? `Rewound to ${formatReplayTimestamp(state.cursorTimestamp)}.`
      : `Replay stopped: ${state.reason || 'no previous bar'}.`);
    await refreshReplayStatus();
  });

  playButton.addEventListener('click', async () => {
    const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PLAY, {
      sessionId: getSessionId(),
      intervalMs: getPlaybackIntervalMs(),
      stepCount: replayStepCount(),
    }));
    if (!playback) return;
    setPlaybackPlaying(Boolean(playback.playing));
    setTerminalReason('');
    setStatusText(playback.playing ? 'Playing replay.' : 'Replay paused.');
    await refreshReplayStatus();
  });

  pauseButton.addEventListener('click', async () => {
    const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PAUSE));
    if (!playback) return;
    setPlaybackPlaying(Boolean(playback.playing));
    setStatusText(playback.playing ? 'Playing replay.' : 'Replay paused.');
    await refreshReplayStatus();
  });

  resetButton.addEventListener('click', async () => {
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.RESET, {
      sessionId: getSessionId(),
    }));
    if (!state) return;
    setTerminalReason('');
    setStatusText(`Loaded ${state.displayBars.length} bars.`);
    await refreshReplayStatus();
  });

  replaySpeedInput.addEventListener('input', () => {
    const nextInterval = Number(replaySpeedInput.value);
    if (!Number.isFinite(nextInterval) || nextInterval <= 0) return;
    setPlaybackIntervalMs(nextInterval);
  });

  replayIntervalSelect.addEventListener('change', () => {
    const nextReplayInterval = Number(replayIntervalSelect.value);
    if (!Number.isFinite(nextReplayInterval) || nextReplayInterval <= 0) return;
    setReplayIntervalSync(false);
    setReplayIntervalTimeframe(nextReplayInterval);
    renderControls();
  });

  replaySyncIntervalInput.addEventListener('change', () => {
    setReplayIntervalSync(replaySyncIntervalInput.checked);
    if (getReplayIntervalSync()) {
      setReplayIntervalTimeframe(Number(getDisplayTimeframe() || getSessionTimeframe() || 1));
    }
    renderControls();
  });

  displayTimeframeSelect.addEventListener('change', async () => {
    const nextDisplayTimeframe = Number(displayTimeframeSelect.value);
    if (!nextDisplayTimeframe || nextDisplayTimeframe === getDisplayTimeframe()) return;
    const selectedOption = displayTimeframeSelect.selectedOptions[0];
    const state = await runReplayCommand(() => setActivePaneDisplayTimeframe({
      displayTimeframe: nextDisplayTimeframe,
    }));
    if (!state) return;
    setDisplayTimeframe(Number(state.displayTimeframe || nextDisplayTimeframe));
    if (getReplayIntervalSync()) {
      setReplayIntervalTimeframe(getDisplayTimeframe());
    }
    setStatusText(state.replayReloaded
      ? `Loaded ${state.displayBars?.length || 0} ${selectedOption?.textContent || ''} bars.`
      : `Updated ${state.paneId || 'active pane'} timeframe to ${selectedOption?.textContent || ''}.`);
    renderControls();
    await refreshReplayStatus();
  });

  return {
    getCommandInFlight,
    getTerminalReason,
    renderControls,
    runReplayCommand,
    setCommandInFlight,
    setControlsDisabled,
  };
}
