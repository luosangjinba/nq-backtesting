import { CHART_COMMANDS } from '../../contracts/chart-contracts.js';
import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';

function parseTimestampMs(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBarTime(value) {
  if (value == null) return null;
  if (typeof value === 'number') return new Date(value * 1000).toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function createChartReplayTruncateController({
  root,
  dispatchCommand,
  getSessionId,
  getReplayLoaded,
  getStartTimestamp,
  getCursorTimestamp,
  formatReplayTimestamp,
  runReplayCommand,
  refreshReplayStatus,
  setControlsDisabled,
  setTerminalReason,
  setStatusText,
}) {
  const chartViewport = root.querySelector('.chart-viewport');
  const chartHost = root.querySelector('[data-chart-host]');
  const pickLine = root.querySelector('[data-replay-truncate-pick-line]');
  const errorPopover = root.querySelector('[data-replay-truncate-error]');
  const errorTitle = root.querySelector('[data-replay-truncate-error-title]');
  const errorMessage = root.querySelector('[data-replay-truncate-error-message]');
  const errorCloseButtons = Array.from(root.querySelectorAll('[data-replay-truncate-error-close]'));
  const truncateButton = root.querySelector('[data-replay-truncate-to-selection]');
  let truncatePickMode = false;

  function closeError() {
    errorPopover.hidden = true;
  }

  function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorPopover.hidden = false;
  }

  function setPickMode(enabled) {
    truncatePickMode = Boolean(enabled) && getReplayLoaded() && Boolean(getSessionId());
    chartViewport.dataset.truncatePickMode = truncatePickMode ? 'true' : 'false';
    pickLine.hidden = !truncatePickMode;
    if (!truncatePickMode) {
      pickLine.style.left = '';
    }
    truncateButton.setAttribute('aria-pressed', truncatePickMode ? 'true' : 'false');
    setControlsDisabled();
  }

  function updatePickGuide(event) {
    if (!truncatePickMode) return;
    const hostRect = chartHost.getBoundingClientRect();
    if (!hostRect.width) return;
    const viewportRect = chartViewport.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - hostRect.left, 0), hostRect.width);
    pickLine.style.left = `${Math.round(hostRect.left - viewportRect.left + x)}px`;
    pickLine.hidden = false;
  }

  async function timestampFromChartPointer(event) {
    const rendered = await dispatchCommand(CHART_COMMANDS.GET_RENDERED_BARS).catch(() => null);
    const bars = Array.isArray(rendered?.renderedBars) ? rendered.renderedBars : [];
    if (!bars.length) return null;
    const hostRect = chartHost.getBoundingClientRect();
    if (!hostRect.width) return null;
    const ratio = Math.min(Math.max((event.clientX - hostRect.left) / hostRect.width, 0), 1);
    const index = Math.min(
      bars.length - 1,
      Math.max(0, Math.round(ratio * Math.max(0, bars.length - 1)))
    );
    return normalizeBarTime(bars[index]?.time);
  }

  function validateTimestamp(timestamp) {
    const selectedMs = parseTimestampMs(timestamp);
    const startTimestamp = getStartTimestamp();
    const cursorTimestamp = getCursorTimestamp();
    const startMs = parseTimestampMs(startTimestamp);
    const cursorMs = parseTimestampMs(cursorTimestamp);
    if (selectedMs == null || startMs == null || cursorMs == null) {
      return {
        ok: false,
        title: 'Cannot truncate replay',
        message: 'Select a visible replay bar before truncating.',
      };
    }
    if (selectedMs < startMs) {
      return {
        ok: false,
        title: 'You cannot go further back than this date',
        message: `You cannot go further back than the session start date: ${formatReplayTimestamp(startTimestamp)}`,
      };
    }
    if (selectedMs > cursorMs) {
      return {
        ok: false,
        title: 'Cannot truncate beyond current replay bar',
        message: `Select a bar at or before the current replay cursor: ${formatReplayTimestamp(cursorTimestamp)}`,
      };
    }
    return { ok: true };
  }

  async function pickTimestamp(event) {
    if (!truncatePickMode) return;
    event.preventDefault();
    event.stopPropagation();
    updatePickGuide(event);
    const selectedTimestamp = await timestampFromChartPointer(event);
    const validation = validateTimestamp(selectedTimestamp);
    if (!validation.ok) {
      setPickMode(false);
      showError(validation.title, validation.message);
      return;
    }
    setPickMode(false);
    const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, {
      sessionId: getSessionId(),
      timestamp: selectedTimestamp,
    }));
    if (!state) return;
    setTerminalReason(state.truncated ? '' : state.reason || 'stopped');
    setStatusText(state.truncated
      ? `Truncated to ${formatReplayTimestamp(state.cursorTimestamp)}.`
      : `Replay stopped: ${state.reason || 'selected bar unavailable'}.`);
    await refreshReplayStatus();
  }

  truncateButton.addEventListener('click', () => {
    if (truncateButton.disabled) return;
    closeError();
    setPickMode(!truncatePickMode);
    setStatusText(truncatePickMode
      ? 'Select a replay bar to truncate future bars.'
      : 'Replay truncate selection canceled.');
  });

  chartHost.addEventListener('pointermove', updatePickGuide);
  chartHost.addEventListener('click', pickTimestamp);
  errorCloseButtons.forEach((button) => {
    button.addEventListener('click', closeError);
  });
  errorPopover.addEventListener('click', (event) => {
    if (event.target === errorPopover) {
      closeError();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && truncatePickMode) {
      setPickMode(false);
      setStatusText('Replay truncate selection canceled.');
    }
  });

  return {
    isPickMode: () => truncatePickMode,
    setPickMode,
    closeError,
  };
}
