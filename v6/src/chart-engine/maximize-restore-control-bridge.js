function resolvePaneId(chartSurface, fallbackPaneId) {
  const state = chartSurface.getState?.() || {};
  const paneId = String(fallbackPaneId || state.panes?.[0]?.paneId || '').trim();
  if (!paneId) {
    throw new Error('Maximize restore control requires a chart pane.');
  }
  return paneId;
}

function renderButtonState(button, paneId, maximizedPaneId) {
  const restoring = maximizedPaneId === paneId;
  const label = restoring ? 'Restore chart' : 'Maximize chart';
  button.dataset.v6ChartMaximizeState = restoring ? 'restore' : 'maximize';
  button.setAttribute?.('aria-label', label);
  button.setAttribute?.('title', label);
  const labelElement = button.querySelector?.('[data-v6-chart-maximize-label]');
  if (labelElement) {
    labelElement.textContent = label;
  }
  return {
    label,
    state: button.dataset.v6ChartMaximizeState,
  };
}

export function connectMaximizeRestoreControl({
  button,
  chartSurface,
  paneId = 'main',
} = {}) {
  if (!button || typeof button.addEventListener !== 'function') {
    throw new Error('Maximize restore control requires a button.');
  }
  if (
    !chartSurface ||
    typeof chartSurface.getState !== 'function' ||
    typeof chartSurface.maximizePane !== 'function' ||
    typeof chartSurface.restorePane !== 'function'
  ) {
    throw new Error('Maximize restore control requires a chart surface with maximize/restore APIs.');
  }

  const abortController = new AbortController();
  const signal = abortController.signal;
  const targetPaneId = resolvePaneId(chartSurface, paneId);

  function syncButtonState() {
    const maximizedPaneId = chartSurface.getState?.().maximize?.maximizedPaneId || null;
    return renderButtonState(button, targetPaneId, maximizedPaneId);
  }

  function toggle() {
    const maximizedPaneId = chartSurface.getState?.().maximize?.maximizedPaneId || null;
    const result = maximizedPaneId === targetPaneId
      ? chartSurface.restorePane()
      : chartSurface.maximizePane(targetPaneId);
    syncButtonState();
    return result;
  }

  button.addEventListener('click', () => {
    try {
      toggle();
    } catch (error) {
      button.dataset.lastError = error?.message || String(error);
    }
  }, { signal });

  syncButtonState();

  return {
    destroy() {
      abortController.abort();
    },
    paneId: targetPaneId,
    syncButtonState,
    toggle,
  };
}
