import { CHART_ENTRY_RESTART_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function toIsoTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value * 1000).toISOString();
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

export function mountReplayRestartSelectionController(root, {
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  getVisiblePaneIds = () => chartSurface?.getState?.().layout?.visiblePaneIds || [],
} = {}) {
  if (!root || typeof chartSurface?.subscribeCrosshairChange !== 'function') {
    throw new Error('Bar Replay restart selection requires the chart surface.');
  }
  const chartElement = root.querySelector('[data-v6-chart-surface]');
  if (!chartElement) throw new Error('Bar Replay restart selection requires the chart element.');
  const line = root.ownerDocument.createElement('div');
  line.className = 'replay-restart-selection-line';
  line.dataset.v6ReplayRestartSelectionLine = '';
  line.hidden = true;
  chartElement.appendChild(line);
  const errorDialog = root.ownerDocument.createElement('section');
  errorDialog.className = 'replay-restart-error-dialog';
  errorDialog.dataset.v6ReplayRestartErrorDialog = '';
  errorDialog.hidden = true;
  errorDialog.setAttribute('role', 'alertdialog');
  errorDialog.innerHTML = '<strong>Cannot select this Bar Replay point</strong><p data-v6-replay-restart-error-message></p><button type="button">Close</button>';
  chartElement.appendChild(errorDialog);
  let active = false;
  let candidate = null;

  function setActive(nextActive) {
    active = Boolean(nextActive);
    candidate = null;
    line.hidden = true;
    chartElement.dataset.v6ReplayRestartSelecting = String(active);
    return active;
  }

  function showError(message) {
    const normalized = String(message || 'Bar Replay restart failed.');
    root.dataset.v6ReplayRestartError = normalized;
    errorDialog.querySelector('[data-v6-replay-restart-error-message]').textContent = normalized;
    errorDialog.hidden = false;
  }

  function handleCrosshair(record = {}) {
    if (!active || !record.point || record.time == null) {
      candidate = null;
      line.hidden = true;
      return;
    }
    const host = [...root.querySelectorAll('[data-v6-chart-engine-host]')]
      .find((element) => element.dataset.v6PaneId === record.paneId);
    if (!host || host.hidden) return;
    const hostRect = host.getBoundingClientRect();
    const surfaceRect = chartElement.getBoundingClientRect();
    candidate = { cutoffTime: toIsoTime(record.time), paneId: record.paneId };
    if (!candidate.cutoffTime) {
      line.hidden = true;
      return;
    }
    line.style.left = `${hostRect.left - surfaceRect.left + Number(record.point.x)}px`;
    line.style.top = `${hostRect.top - surfaceRect.top}px`;
    line.style.height = `${hostRect.height}px`;
    line.hidden = false;
  }

  async function select() {
    if (!active || !candidate?.cutoffTime) return null;
    const result = await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, {
      cutoffTime: candidate.cutoffTime,
      paneIds: getVisiblePaneIds(),
    });
    if (result?.status === 'restarted') setActive(false);
    return result;
  }

  function handleChartClick(event) {
    if (!active || !event.target.closest?.('[data-v6-chart-engine-host]')) return;
    event.preventDefault();
    event.stopPropagation();
    void select().then((result) => {
      if (result?.status === 'error') {
        showError(result.error);
      }
    });
  }

  const unsubscribeCrosshair = chartSurface.subscribeCrosshairChange(handleCrosshair);
  chartElement.addEventListener('click', handleChartClick, true);
  errorDialog.querySelector('button').addEventListener('click', () => {
    errorDialog.hidden = true;
  });

  return {
    cancel: () => setActive(false),
    destroy() {
      setActive(false);
      unsubscribeCrosshair?.();
      chartElement.removeEventListener('click', handleChartClick, true);
      line.remove();
      errorDialog.remove();
    },
    isActive: () => active,
    preview: handleCrosshair,
    select,
    start: () => setActive(true),
  };
}
