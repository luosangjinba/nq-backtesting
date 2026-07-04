import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';
import { markReplayTrace } from '../../runtime/replay-trace.js';

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
  const ownerDocument = root.ownerDocument || globalThis.document || null;
  let replayCommandQueue = Promise.resolve();
  let pendingNextStepCount = 0;
  let pendingNextTimer = null;
  let pendingNextMicrotask = false;
  let nextBatchRunning = false;
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function replayStepCount() {
    const base = Number(getSessionTimeframe() || 1);
    const selected = Number(getReplayIntervalTimeframe() || base);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(selected) || selected <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(selected / base));
  }

  function renderControls() {
    if (disposed) return;
    displayTimeframeSelect.value = getDisplayTimeframe() ? String(getDisplayTimeframe()) : '1';
    replayIntervalSelect.value = getReplayIntervalTimeframe() ? String(getReplayIntervalTimeframe()) : '1';
    replaySyncIntervalInput.checked = getReplayIntervalSync();
    replaySpeedInput.value = String(getPlaybackIntervalMs());
  }

  function setControlsDisabled(disabled = false) {
    if (disposed) return;
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
    if (disposed) return null;
    if (!getSessionId()) return null;
    const runQueued = async () => {
      if (disposed) return null;
      if (getCommandInFlight()) return null;
      setCommandInFlight(true);
      try {
        if (disposed) return null;
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

  async function runNext(stepCount, { refreshStatus = true } = {}) {
    if (disposed) return;
    markReplayTrace('controls.next.command.start', { stepCount });
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.NEXT, {
      sessionId: getSessionId(),
      stepCount,
    }));
    markReplayTrace('controls.next.command.end', {
      stepCount,
      advanced: Boolean(state?.advanced),
      cursorTimestamp: state?.cursorTimestamp || '',
    });
    if (disposed) return;
    if (!state) return;
    setTerminalReason(state.advanced ? '' : state.reason || 'stopped');
    setStatusText(state.advanced
      ? `Loaded ${state.displayBars.length} bars.`
      : `Replay stopped: ${state.reason || 'no next bar'}.`);
    if (refreshStatus) {
      await refreshReplayStatus();
    }
  }

  async function flushPendingNext() {
    pendingNextTimer = null;
    if (disposed) return;
    if (nextBatchRunning) return;
    nextBatchRunning = true;
    markReplayTrace('controls.next.flush.start', { pendingNextStepCount });
    let shouldRefresh = false;
    try {
      while (pendingNextStepCount > 0) {
        if (disposed) return;
        const stepCount = pendingNextStepCount;
        pendingNextStepCount = 0;
        await runNext(stepCount, { refreshStatus: false });
        shouldRefresh = true;
      }
    } finally {
      nextBatchRunning = false;
      if (disposed) return;
      if (shouldRefresh) {
        markReplayTrace('controls.next.refresh.start');
        await refreshReplayStatus();
        markReplayTrace('controls.next.refresh.end');
      }
      if (pendingNextStepCount > 0 && pendingNextTimer === null) {
        pendingNextTimer = setTimeout(flushPendingNext, 0);
      }
      markReplayTrace('controls.next.flush.end', { pendingNextStepCount });
    }
  }

  function schedulePendingNext() {
    if (disposed) return;
    if (nextBatchRunning || pendingNextTimer !== null || pendingNextMicrotask) return;
    pendingNextMicrotask = true;
    markReplayTrace('controls.next.schedule.microtask', { pendingNextStepCount });
    queueMicrotask(() => {
      pendingNextMicrotask = false;
      void flushPendingNext();
    });
  }

  function queueNextStep() {
    if (disposed) return;
    const stepCount = pendingNextStepCount;
    if (stepCount <= 0) return;
    markReplayTrace('controls.next.queue', { pendingNextStepCount: stepCount });
    schedulePendingNext();
  }

  function handleNextClick() {
    markReplayTrace('controls.next.click', { replayStepCount: replayStepCount() });
    pendingNextStepCount += replayStepCount();
    queueNextStep();
  }

  function isEditableShortcutTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.closest('input, select, textarea, button, a[href]')) return true;
    return Boolean(target.closest('[contenteditable=""], [contenteditable="true"]'));
  }

  function hasOpenBlockingPopover() {
    return Array.from(root.querySelectorAll([
      '[data-chart-go-to-popover]',
      '[data-chart-settings-popover]',
      '[data-layout-popover]',
      '[data-replay-truncate-error]',
      '[role="dialog"]',
    ].join(','))).some((element) => !element.hidden);
  }

  function shouldIgnoreReplayShortcut(event) {
    return disposed
      || event.defaultPrevented
      || event.repeat
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || !getReplayLoaded()
      || !getSessionId()
      || isEditableShortcutTarget(event.target)
      || hasOpenBlockingPopover();
  }

  function handleKeyboardShortcut(event) {
    if (shouldIgnoreReplayShortcut(event)) return;
    if (event.key === 'ArrowRight') {
      if (nextButton.disabled) return;
      event.preventDefault();
      handleNextClick();
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (replayPreviousButton.disabled) return;
      event.preventDefault();
      void handlePreviousClick();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (getPlaybackPlaying()) {
        if (!pauseButton.disabled) {
          void handlePauseClick();
        }
        return;
      }
      if (!playButton.disabled) {
        void handlePlayClick();
      }
    }
  }

  async function handlePreviousClick() {
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
      sessionId: getSessionId(),
      stepCount: replayStepCount(),
    }));
    if (disposed) return;
    if (!state) return;
    setTerminalReason(state.rewound ? '' : state.reason || 'stopped');
    setStatusText(state.rewound
      ? `Rewound to ${formatReplayTimestamp(state.cursorTimestamp)}.`
      : `Replay stopped: ${state.reason || 'no previous bar'}.`);
    await refreshReplayStatus();
  }

  async function handlePlayClick() {
    const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PLAY, {
      sessionId: getSessionId(),
      intervalMs: getPlaybackIntervalMs(),
      stepCount: replayStepCount(),
    }));
    if (disposed) return;
    if (!playback) return;
    setPlaybackPlaying(Boolean(playback.playing));
    setTerminalReason('');
    setStatusText(playback.playing ? 'Playing replay.' : 'Replay paused.');
    await refreshReplayStatus();
  }

  async function handlePauseClick() {
    const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PAUSE));
    if (disposed) return;
    if (!playback) return;
    setPlaybackPlaying(Boolean(playback.playing));
    setStatusText(playback.playing ? 'Playing replay.' : 'Replay paused.');
    await refreshReplayStatus();
  }

  async function handleResetClick() {
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.RESET, {
      sessionId: getSessionId(),
    }));
    if (disposed) return;
    if (!state) return;
    setTerminalReason('');
    setStatusText(`Loaded ${state.displayBars.length} bars.`);
    await refreshReplayStatus();
  }

  function handleSpeedInput() {
    const nextInterval = Number(replaySpeedInput.value);
    if (!Number.isFinite(nextInterval) || nextInterval <= 0) return;
    setPlaybackIntervalMs(nextInterval);
  }

  function handleReplayIntervalChange() {
    const nextReplayInterval = Number(replayIntervalSelect.value);
    if (!Number.isFinite(nextReplayInterval) || nextReplayInterval <= 0) return;
    setReplayIntervalSync(false);
    setReplayIntervalTimeframe(nextReplayInterval);
    renderControls();
  }

  function handleReplaySyncIntervalChange() {
    setReplayIntervalSync(replaySyncIntervalInput.checked);
    if (getReplayIntervalSync()) {
      setReplayIntervalTimeframe(Number(getDisplayTimeframe() || getSessionTimeframe() || 1));
    }
    renderControls();
  }

  async function handleDisplayTimeframeChange() {
    const nextDisplayTimeframe = Number(displayTimeframeSelect.value);
    if (!nextDisplayTimeframe || nextDisplayTimeframe === getDisplayTimeframe()) return;
    const selectedOption = displayTimeframeSelect.selectedOptions[0];
    const state = await runReplayCommand(() => setActivePaneDisplayTimeframe({
      displayTimeframe: nextDisplayTimeframe,
    }));
    if (disposed) return;
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
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
    if (pendingNextTimer !== null) {
      clearTimeout(pendingNextTimer);
      pendingNextTimer = null;
    }
    pendingNextMicrotask = false;
    pendingNextStepCount = 0;
    nextBatchRunning = false;
  }

  addListener(nextButton, 'click', handleNextClick);
  addListener(replayPreviousButton, 'click', handlePreviousClick);
  addListener(playButton, 'click', handlePlayClick);
  addListener(pauseButton, 'click', handlePauseClick);
  addListener(resetButton, 'click', handleResetClick);
  addListener(replaySpeedInput, 'input', handleSpeedInput);
  addListener(replayIntervalSelect, 'change', handleReplayIntervalChange);
  addListener(replaySyncIntervalInput, 'change', handleReplaySyncIntervalChange);
  addListener(displayTimeframeSelect, 'change', handleDisplayTimeframeChange);
  addListener(ownerDocument, 'keydown', handleKeyboardShortcut);

  return {
    dispose,
    getCommandInFlight,
    getTerminalReason,
    renderControls,
    runReplayCommand,
    setCommandInFlight,
    setControlsDisabled,
  };
}
