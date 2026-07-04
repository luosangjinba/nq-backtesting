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
  getActivePaneId = () => undefined,
}) {
  const goToPopover = root.querySelector('[data-chart-go-to-popover]');
  const goToOpenButton = root.querySelector('[data-chart-go-to-open]');
  const goToCancelButtons = Array.from(root.querySelectorAll('[data-chart-go-to-cancel]'));
  const goToInput = root.querySelector('[data-chart-go-to-input]');
  const goToButton = root.querySelector('[data-chart-go-to]');
  const jumpCursorButton = root.querySelector('[data-chart-jump-cursor]');
  const jumpCursorPopoverButton = root.querySelector('[data-chart-jump-cursor-popover]');
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function openGoToPopover() {
    if (disposed) return;
    if (goToOpenButton.disabled) return;
    goToPopover.hidden = false;
    goToInput.focus();
    setControlsDisabled();
  }

  function closeGoToPopover() {
    if (disposed) return;
    goToPopover.hidden = true;
    setControlsDisabled();
  }

  async function runChartNavigation(action, statusText) {
    if (disposed) return null;
    if (getCommandInFlight()) return null;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      const result = await action();
      if (disposed) return null;
      if (statusText) {
        setStatusText(statusText(result));
      }
      return result;
    } catch (error) {
      if (disposed) return null;
      setStatusText(error?.message || String(error));
      return null;
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  async function goToTime() {
    if (disposed) return;
    if (!goToInput.value || getCommandInFlight()) return;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      const paneId = getActivePaneId();
      const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, { paneId }).catch(() => null);
      if (disposed) return;
      const targetTimestamp = displayWallClockToCanonicalTimestamp(goToInput.value, {
        displayTimezone: getDisplayTimezone(),
        exchangeTimezone: getExchangeTimezone(),
      });
      const result = await dispatchCommand(CHART_COMMANDS.GO_TO_TIME, {
        paneId,
        targetTimestamp,
        estimatedVisibleBars: metrics?.estimatedVisibleBars || null,
      });
      if (disposed) return;
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
      if (disposed) return;
      setStatusText(error?.message || String(error));
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  async function jumpToCursor() {
    if (disposed) return;
    if (getCommandInFlight()) return;
    setCommandInFlight(true);
    setControlsDisabled(true);
    try {
      await dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, {
        paneId: getActivePaneId(),
      });
      const state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null);
      if (disposed) return;
      await syncLayoutTime(state?.cursorTimestamp);
      setStatusText(`Following cursor ${formatReplayTimestamp(state?.cursorTimestamp)}.`);
    } catch (error) {
      if (disposed) return;
      setStatusText(error?.message || String(error));
    } finally {
      setCommandInFlight(false);
      setControlsDisabled(false);
    }
  }

  addListener(goToOpenButton, 'click', openGoToPopover);
  goToCancelButtons.forEach((button) => {
    addListener(button, 'click', closeGoToPopover);
  });
  function handleGoToInput() {
    setControlsDisabled();
  }
  function handleRootClick(event) {
    const resetViewButton = event.target.closest('[data-chart-reset-view]');
    if (!resetViewButton || !root.contains(resetViewButton)) return;
    const paneElement = resetViewButton.closest('[data-chart-pane-id]');
    const paneId = paneElement?.dataset?.chartPaneId || undefined;
    runChartNavigation(
      () => dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, { paneId }),
      () => 'Following cursor.'
    );
  }
  async function handleJumpCursorPopoverClick() {
    await jumpToCursor();
    closeGoToPopover();
  }
  addListener(goToInput, 'input', handleGoToInput);
  addListener(root, 'click', handleRootClick);
  addListener(goToButton, 'click', goToTime);
  if (jumpCursorButton) {
    addListener(jumpCursorButton, 'click', jumpToCursor);
  }
  addListener(jumpCursorPopoverButton, 'click', handleJumpCursorPopoverClick);

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
  }

  return {
    dispose,
    getGoToInputValue: () => goToInput.value,
    closeGoToPopover,
    runChartNavigation,
  };
}
