import { CHART_COMMANDS } from '../../contracts/chart-contracts.js';
import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';
import { displayWallClockToCanonicalTimestamp } from '../../domain/timezone-format.js';

export function createChartReplayNavigationController({
  root,
  dispatchCommand,
  getDisplayTimezone,
  getExchangeTimezone,
  formatReplayTimestamp,
  getCommandInFlight,
  setCommandInFlight,
  setControlsDisabled,
  setStatusText,
  syncLayoutTime = () => {},
}) {
  const goToPopover = root.querySelector('[data-chart-go-to-popover]');
  const goToOpenButton = root.querySelector('[data-chart-go-to-open]');
  const goToCancelButtons = Array.from(root.querySelectorAll('[data-chart-go-to-cancel]'));
  const goToInput = root.querySelector('[data-chart-go-to-input]');
  const goToButton = root.querySelector('[data-chart-go-to]');
  const jumpCursorButton = root.querySelector('[data-chart-jump-cursor]');
  const jumpCursorPopoverButton = root.querySelector('[data-chart-jump-cursor-popover]');

  function openGoToPopover() {
    if (goToOpenButton.disabled) return;
    goToPopover.hidden = false;
    goToInput.focus();
    setControlsDisabled();
  }

  function closeGoToPopover() {
    goToPopover.hidden = true;
    setControlsDisabled();
  }

  async function runChartNavigation(action, statusText) {
    if (getCommandInFlight()) return null;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      const result = await action();
      if (statusText) {
        setStatusText(statusText(result));
      }
      return result;
    } catch (error) {
      setStatusText(error?.message || String(error));
      return null;
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  async function goToTime() {
    if (!goToInput.value || getCommandInFlight()) return;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS).catch(() => null);
      const targetTimestamp = displayWallClockToCanonicalTimestamp(goToInput.value, {
        displayTimezone: getDisplayTimezone(),
        exchangeTimezone: getExchangeTimezone(),
      });
      const result = await dispatchCommand(CHART_COMMANDS.GO_TO_TIME, {
        targetTimestamp,
        estimatedVisibleBars: metrics?.estimatedVisibleBars || null,
      });
      const visibleTo = result.visibleRange?.to
        ? new Date(result.visibleRange.to * 1000).toISOString()
        : targetTimestamp;
      const requestedText = formatReplayTimestamp(targetTimestamp);
      const visibleText = formatReplayTimestamp(visibleTo);
      setStatusText(result.visibleRange?.to && result.targetTimestamp > result.visibleRange.to
        ? `Viewing ${visibleText}; requested ${requestedText} is beyond cursor.`
        : `Viewing ${requestedText}.`);
      await syncLayoutTime(targetTimestamp);
      closeGoToPopover();
    } catch (error) {
      setStatusText(error?.message || String(error));
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  async function jumpToCursor() {
    if (getCommandInFlight()) return;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      await dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW);
      const state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null);
      await syncLayoutTime(state?.cursorTimestamp);
      setStatusText(`Following cursor ${formatReplayTimestamp(state?.cursorTimestamp)}.`);
    } catch (error) {
      setStatusText(error?.message || String(error));
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  goToOpenButton.addEventListener('click', openGoToPopover);
  goToCancelButtons.forEach((button) => {
    button.addEventListener('click', closeGoToPopover);
  });
  goToInput.addEventListener('input', () => {
    setControlsDisabled();
  });
  root.addEventListener('click', (event) => {
    const resetViewButton = event.target.closest('[data-chart-reset-view]');
    if (!resetViewButton || !root.contains(resetViewButton)) return;
    runChartNavigation(
      () => dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW),
      () => 'Following cursor.'
    );
  });
  goToButton.addEventListener('click', goToTime);
  jumpCursorButton?.addEventListener('click', jumpToCursor);
  jumpCursorPopoverButton.addEventListener('click', async () => {
    await jumpToCursor();
    closeGoToPopover();
  });

  return {
    getGoToInputValue: () => goToInput.value,
    closeGoToPopover,
    runChartNavigation,
  };
}
