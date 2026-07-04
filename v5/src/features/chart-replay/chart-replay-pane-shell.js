import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';
import {
  createChartPane,
  createSplitHandle,
  splitHandleSpecs,
  updatePaneElement,
} from './chart-replay-pane-dom.js';

function normalizeTrackValue(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(10, Math.max(0.1, number));
}

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
  let dragState = null;
  let handleFrame = null;
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function applySplitTracks(layoutState = DEFAULT_LAYOUT_STATE) {
    const ratios = layoutState.split?.ratios || DEFAULT_LAYOUT_STATE.split.ratios;
    const variant = layoutState.variant || DEFAULT_LAYOUT_STATE.variant;
    const compositeVariant = variant === 'triple.left'
      || variant === 'triple.right'
      || variant === 'triple.top'
      || variant === 'triple.bottom';
    const rawPrimary = normalizeTrackValue(ratios.primary, 1);
    const secondary = normalizeTrackValue(ratios.secondary, 1);
    const tertiary = normalizeTrackValue(ratios.tertiary, 1);
    const untouchedComposite = compositeVariant
      && Math.abs(rawPrimary - 1) < 0.001
      && Math.abs(secondary - 1) < 0.001
      && Math.abs(tertiary - 1) < 0.001;
    const primary = untouchedComposite ? 1.35 : rawPrimary;
    const side = compositeVariant ? ((secondary + tertiary) / 2) : (secondary + tertiary);
    shell.style.setProperty('--layout-primary-track', `${primary}fr`);
    shell.style.setProperty('--layout-secondary-track', `${secondary}fr`);
    shell.style.setProperty('--layout-tertiary-track', `${tertiary}fr`);
    shell.style.setProperty('--layout-side-track', `${side}fr`);
  }

  function ensureSplitHandles(layoutState = DEFAULT_LAYOUT_STATE) {
    const specs = splitHandleSpecs(layoutState.variant || DEFAULT_LAYOUT_STATE.variant);
    const activeIds = new Set(specs.map((spec) => spec.id));
    Array.from(shell.querySelectorAll('[data-layout-split-handle]')).forEach((handle) => {
      if (!activeIds.has(handle.dataset.layoutSplitHandle)) {
        handle.remove();
      }
    });
    specs.forEach((spec) => {
      let handle = shell.querySelector(`[data-layout-split-handle="${spec.id}"]`);
      if (!handle) {
        handle = createSplitHandle(spec);
        shell.append(handle);
      }
      handle.dataset.firstPaneId = spec.first;
      handle.dataset.secondPaneId = spec.second;
      handle.setAttribute('aria-orientation', spec.orientation);
    });
  }

  function positionSplitHandles() {
    const shellRect = shell.getBoundingClientRect();
    Array.from(shell.querySelectorAll('[data-layout-split-handle]')).forEach((handle) => {
      const first = shell.querySelector(`[data-layout-pane][data-pane-id="${handle.dataset.firstPaneId}"]`);
      const second = shell.querySelector(`[data-layout-pane][data-pane-id="${handle.dataset.secondPaneId}"]`);
      if (!first || !second) {
        handle.hidden = true;
        return;
      }
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const vertical = handle.getAttribute('aria-orientation') === 'vertical';
      handle.hidden = false;
      if (vertical) {
        const left = Math.round(((firstRect.right + secondRect.left) / 2) - shellRect.left);
        handle.style.left = `${left}px`;
        handle.style.top = `${Math.round(Math.min(firstRect.top, secondRect.top) - shellRect.top)}px`;
        handle.style.height = `${Math.round(Math.max(firstRect.bottom, secondRect.bottom) - Math.min(firstRect.top, secondRect.top))}px`;
        handle.style.width = '';
        return;
      }
      const top = Math.round(((firstRect.bottom + secondRect.top) / 2) - shellRect.top);
      handle.style.top = `${top}px`;
      handle.style.left = `${Math.round(Math.min(firstRect.left, secondRect.left) - shellRect.left)}px`;
      handle.style.width = `${Math.round(Math.max(firstRect.right, secondRect.right) - Math.min(firstRect.left, secondRect.left))}px`;
      handle.style.height = '';
    });
  }

  function scheduleHandlePosition() {
    if (disposed) return;
    if (handleFrame !== null) return;
    handleFrame = requestAnimationFrame(() => {
      handleFrame = null;
      if (disposed) return;
      positionSplitHandles();
    });
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
    applySplitTracks(layoutState);

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
    ensureSplitHandles(layoutState);
    scheduleHandlePosition();
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
    if (event.target.closest('[data-layout-split-handle]')) return;
    if (isPaneControlEvent(event)) return;
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    selectPane(paneElement.dataset.paneId);
  }

  function handleKeydown(event) {
    if (event.target.closest('[data-layout-split-handle]')) return;
    if (isPaneControlEvent(event)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const paneElement = event.target.closest('[data-layout-pane]');
    if (!paneElement || !shell.contains(paneElement)) return;
    event.preventDefault();
    selectPane(paneElement.dataset.paneId);
  }

  function handlePointerDown(event) {
    const handle = event.target.closest('[data-layout-split-handle]');
    if (!handle || !shell.contains(handle) || event.button !== 0) return;
    const first = shell.querySelector(`[data-layout-pane][data-pane-id="${handle.dataset.firstPaneId}"]`);
    const second = shell.querySelector(`[data-layout-pane][data-pane-id="${handle.dataset.secondPaneId}"]`);
    if (!first || !second) return;
    const vertical = handle.getAttribute('aria-orientation') === 'vertical';
    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();
    const start = vertical
      ? Math.min(firstRect.left, secondRect.left)
      : Math.min(firstRect.top, secondRect.top);
    const end = vertical
      ? Math.max(firstRect.right, secondRect.right)
      : Math.max(firstRect.bottom, secondRect.bottom);
    dragState = {
      pointerId: event.pointerId,
      handle,
      firstPaneId: handle.dataset.firstPaneId,
      secondPaneId: handle.dataset.secondPaneId,
      vertical,
      start,
      span: Math.max(1, end - start),
    };
    shell.classList.add('is-resizing');
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch (_error) {
      // Synthetic browser-smoke pointer events may not create an active pointer.
    }
    event.stopPropagation();
    event.preventDefault();
  }

  async function handlePointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const position = dragState.vertical ? event.clientX : event.clientY;
    const ratio = ((position - dragState.start) / dragState.span) * 100;
    try {
      const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, {
        firstPaneId: dragState.firstPaneId,
        secondPaneId: dragState.secondPaneId,
        ratio,
      });
      if (disposed) return;
      onLayoutState(layoutState);
    } catch (error) {
      if (disposed) return;
      setStatusText(error?.message || String(error));
    }
    event.stopPropagation();
    event.preventDefault();
  }

  function stopSplitDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    try {
      dragState.handle.releasePointerCapture?.(dragState.pointerId);
    } catch (_error) {
      // The pointer may already be released when a drag is cancelled.
    }
    dragState = null;
    shell.classList.remove('is-resizing');
    scheduleHandlePosition();
    event.stopPropagation();
    event.preventDefault();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
    if (handleFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(handleFrame);
    }
    handleFrame = null;
    dragState = null;
    shell.classList.remove('is-resizing');
  }

  addListener(shell, 'click', handleClick);
  addListener(shell, 'keydown', handleKeydown);
  addListener(shell, 'pointerdown', handlePointerDown);
  addListener(shell, 'pointermove', handlePointerMove);
  addListener(shell, 'pointerup', stopSplitDrag);
  addListener(shell, 'pointercancel', stopSplitDrag);
  addListener(window, 'resize', scheduleHandlePosition);

  return {
    dispose,
    renderState,
  };
}
