import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';
import {
  createChartPane,
  updatePaneElement,
} from './chart-replay-pane-dom.js';
import { createChartReplaySplitResizeController } from './chart-replay-split-resize-controller.js';

export function createChartReplayPaneShellController({
  root,
  dispatchCommand,
  onLayoutState,
  setStatusText = () => {},
}) {
  const shell = root.querySelector('[data-layout-pane-shell]');
  const primaryPane = root.querySelector('[data-layout-pane][data-pane-id="primary"]');
  const chartViewport = root.querySelector('.chart-viewport');
  const chartHost = root.querySelector('[data-chart-host]');
  let currentActivePaneId = DEFAULT_ACTIVE_PANE_ID;
  let currentLayoutState = DEFAULT_LAYOUT_STATE;
  let disposed = false;
  const cleanupCallbacks = [];
  const splitResizeController = createChartReplaySplitResizeController({
    shell,
    dispatchCommand,
    onLayoutState,
    setStatusText,
    isDisposed: () => disposed,
  });

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function renderState(layoutState = DEFAULT_LAYOUT_STATE) {
    if (disposed) return;
    currentLayoutState = layoutState;
    const panes = Array.isArray(layoutState.panes) && layoutState.panes.length
      ? layoutState.panes
      : DEFAULT_LAYOUT_STATE.panes;
    const activePaneId = layoutState.activePaneId || DEFAULT_ACTIVE_PANE_ID;
    currentActivePaneId = activePaneId;
    shell.dataset.layoutMode = layoutState.mode || DEFAULT_LAYOUT_STATE.mode;
    shell.dataset.layoutVariant = layoutState.variant || DEFAULT_LAYOUT_STATE.variant;
    shell.dataset.activePaneId = activePaneId;
    shell.dataset.paneCount = String(panes.length);

    const activeIds = new Set(panes.map((pane) => pane.id));
    Array.from(shell.querySelectorAll('[data-layout-pane]')).forEach((paneElement) => {
      if (paneElement !== primaryPane && !activeIds.has(paneElement.dataset.paneId)) {
        paneElement.remove();
      }
    });

    panes.forEach((pane, index) => {
      const id = pane.id || DEFAULT_ACTIVE_PANE_ID;
      const active = id === activePaneId;
      let paneElement = shell.querySelector(`[data-layout-pane][data-pane-id="${id}"]`);
      if (!paneElement) {
        paneElement = createChartPane(pane);
        shell.append(paneElement);
      }
      updatePaneElement(paneElement, pane, active);
      paneElement.style.order = String(index);
    });

    const primaryActive = activePaneId === DEFAULT_ACTIVE_PANE_ID;
    chartViewport.dataset.activePane = primaryActive ? 'true' : 'false';
    chartHost.dataset.activePane = primaryActive ? 'true' : 'false';
    splitResizeController.renderState(layoutState);
  }

  async function selectPane(paneId) {
    if (disposed) return;
    if (!paneId || paneId === currentActivePaneId) return;
    const panes = Array.isArray(currentLayoutState.panes) ? currentLayoutState.panes : [];
    if (panes.some((pane) => pane.id === paneId)) {
      const optimisticState = {
        ...currentLayoutState,
        activePaneId: paneId,
      };
      onLayoutState(optimisticState);
      renderState(optimisticState);
    }
    try {
      const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, { paneId });
      if (disposed) return;
      onLayoutState(layoutState);
      renderState(layoutState);
    } catch (error) {
      if (disposed) return;
      setStatusText(error?.message || String(error));
    }
  }

  function isPaneControlEvent(event) {
    return Boolean(event.target.closest(
      'button, input, select, textarea, a, [role="dialog"], [data-chart-go-to-popover], [data-layout-popover], [data-chart-settings-popover]'
    ));
  }

  function handleClick(event) {
    if (splitResizeController.isSplitHandleEvent(event)) return;
    if (isPaneControlEvent(event)) return;
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    selectPane(paneElement.dataset.paneId);
  }

  function handleKeydown(event) {
    if (splitResizeController.isSplitHandleEvent(event)) return;
    if (isPaneControlEvent(event)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    event.preventDefault();
    selectPane(paneElement.dataset.paneId);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    splitResizeController.dispose();
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
  }

  addListener(shell, 'click', handleClick);
  addListener(shell, 'keydown', handleKeydown);

  return {
    dispose,
    renderState,
  };
}
