export function syncComparisonLayoutGeometry({ root, windowEl, state }) {
  if (!root || !windowEl) return;
  const host = document.getElementById('chart-stack');
  root.hidden = !state.enabled;
  host?.classList.toggle('chart-stack-two-pane', Boolean(state.enabled));
  root.classList.toggle('comparison-pane-root', Boolean(state.enabled));
  if (!state.enabled) {
    host?.classList.remove('chart-stack-two-pane');
    root.classList.remove('comparison-pane-root');
    host?.style.setProperty('--primary-legend-left-offset', '0px');
    host?.style.setProperty('--primary-viewport-center-left', '50%');
    return;
  }
  const { visibleWindow, layoutMode } = state.descriptor;
  const isSliding = false;
  const rootRect = root.getBoundingClientRect();
  host?.style.setProperty('--primary-legend-left-offset', '0px');
  root.style.setProperty('--comparison-viewport-center-left', `${Math.max(0, Math.round(rootRect.width / 2))}px`);
  host?.style.setProperty('--primary-viewport-center-left', '50%');
  windowEl.classList.toggle('comparison-window-sliding', isSliding);
  windowEl.classList.toggle('comparison-window-floating', !isSliding);
  windowEl.classList.toggle('comparison-window-pane', true);
  windowEl.style.left = 'auto';
  windowEl.style.top = 'auto';
  windowEl.style.right = 'auto';
  windowEl.style.width = '100%';
  windowEl.style.height = '100%';
  windowEl.dataset.layoutMode = layoutMode || 'two-column';
}

export function createComparisonWindowDragHandlers({
  getRoot,
  getWindowEl,
  getState,
  updateVisibleWindow,
  resetVisibleWindow,
}) {
  let dragState = null;

  function suppressComparisonDragEvent(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  function startDrag(event) {
    const root = getRoot();
    const windowEl = getWindowEl();
    if (!root || !windowEl || event.button !== 0) return;
    if (getState().descriptor.layoutMode === 'sliding') return;
    if (event.target.closest('button, select, input, textarea, label, .comparison-window-actions')) return;
    const bounds = root.getBoundingClientRect();
    const target = event.currentTarget;
    const current = getState().descriptor.visibleWindow;
    dragState = {
      mode: 'move',
      pointerId: event.pointerId,
      target,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWindow: current,
      bounds,
    };
    root.classList.add('comparison-window-dragging');
    target.setPointerCapture?.(event.pointerId);
    target.addEventListener('pointermove', dragWindow);
    target.addEventListener('pointerup', stopDrag, { once: true });
    target.addEventListener('pointercancel', stopDrag, { once: true });
    event.stopPropagation();
    event.preventDefault();
  }

  function startSlideResize(event) {
    const root = getRoot();
    const windowEl = getWindowEl();
    if (!root || !windowEl || event.button !== 0) return;
    const bounds = root.getBoundingClientRect();
    const target = event.currentTarget;
    const current = getState().descriptor.visibleWindow;
    dragState = {
      mode: 'slide-left',
      pointerId: event.pointerId,
      target,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWindow: current,
      bounds,
    };
    root.classList.add('comparison-window-dragging');
    target.setPointerCapture?.(event.pointerId);
    target.addEventListener('pointermove', dragWindow);
    target.addEventListener('pointerup', stopDrag, { once: true });
    target.addEventListener('pointercancel', stopDrag, { once: true });
    event.stopPropagation();
    event.preventDefault();
  }

  function dragWindow(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = ((event.clientX - dragState.startClientX) / Math.max(1, dragState.bounds.width)) * 100;
    if (dragState.mode === 'slide-left') {
      const minWidth = 18;
      const nextWidth = Math.max(minWidth, Math.min(96, dragState.startWindow.width + dx));
      updateVisibleWindow({
        x: 0,
        y: 0,
        width: nextWidth,
        height: 100,
      });
    } else {
      const dy = ((event.clientY - dragState.startClientY) / Math.max(1, dragState.bounds.height)) * 100;
      updateVisibleWindow({
        x: dragState.startWindow.x + dx,
        y: dragState.startWindow.y + dy,
      });
    }
    event.stopPropagation();
    event.preventDefault();
  }

  function stopDrag(event) {
    const root = getRoot();
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState.target.removeEventListener('pointermove', dragWindow);
    dragState.target.releasePointerCapture?.(dragState.pointerId);
    root?.classList.remove('comparison-window-dragging');
    dragState = null;
    event.stopPropagation();
    event.preventDefault();
  }

  return {
    startDrag,
    startSlideResize,
    suppressComparisonDragEvent,
    resetVisibleWindow,
  };
}
