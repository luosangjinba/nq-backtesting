export function renderReplayFloatingControls() {
  return `
          <div class="replay-floating-controls" data-replay-floating-controls aria-label="Replay controls">
            <div class="replay-drag-handle" data-replay-drag-handle role="button" tabindex="0" aria-label="Move replay controls">::</div>
            <button type="button" data-replay-truncate-to-selection title="Replay to selected bar is planned" aria-label="Replay to selected bar" disabled>|&lt;</button>
            <label class="replay-speed-control" aria-label="Playback speed">
              <span class="sr-only">Playback speed</span>
              <input type="range" data-replay-speed min="100" max="1000" step="100" value="500" disabled>
            </label>
            <div class="replay-controls" data-replay-controls>
              <button type="button" data-replay-previous title="Previous bar is planned" aria-label="Previous bar" disabled>&lt;|</button>
              <button type="button" data-replay-play title="Play replay" aria-label="Play replay" disabled>&#9654;</button>
              <button type="button" data-replay-pause title="Pause replay" aria-label="Pause replay" disabled hidden>&#10073;&#10073;</button>
              <button type="button" data-replay-next title="Next bar" aria-label="Next bar" disabled>&gt;|</button>
            </div>
            <label class="replay-interval-controls" data-replay-interval-controls aria-label="Replay interval">
              <span class="sr-only">Replay interval</span>
              <select data-replay-interval-select disabled title="Replay interval">
                <option value="1">1m</option>
                <option value="2">2m</option>
                <option value="3">3m</option>
                <option value="4">4m</option>
                <option value="5">5m</option>
                <option value="10">10m</option>
                <option value="15">15m</option>
                <option value="30">30m</option>
                <option value="60">1H</option>
                <option value="120">2H</option>
                <option value="180">3H</option>
                <option value="240">4H</option>
              </select>
            </label>
            <label class="replay-sync-control" title="Sync replay interval with active chart interval">
              <span class="sr-only">Sync active chart interval</span>
              <input type="checkbox" data-replay-sync-interval disabled>
            </label>
          </div>
  `;
}

export function createReplayFloatingControlsController({ root }) {
  const replayFloatingControls = root.querySelector('[data-replay-floating-controls]');
  const replayDragHandle = root.querySelector('[data-replay-drag-handle]');
  let floatingPosition = null;
  let floatingDragState = null;
  let disposed = false;
  const cleanupCallbacks = [];

  function addListener(target, type, handler, options) {
    target?.addEventListener?.(type, handler, options);
    cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options));
  }

  function clampFloatingPosition(position) {
    const controlsRect = replayFloatingControls.getBoundingClientRect();
    const edgePadding = 12;
    const minLeft = edgePadding;
    const minTop = edgePadding;
    const maxLeft = Math.max(
      minLeft,
      window.innerWidth - controlsRect.width - edgePadding
    );
    const maxTop = Math.max(
      minTop,
      window.innerHeight - controlsRect.height - edgePadding
    );
    return {
      left: Math.min(Math.max(position.left, minLeft), maxLeft),
      top: Math.min(Math.max(position.top, minTop), maxTop),
    };
  }

  function applyFloatingPosition(position) {
    if (disposed) return;
    const nextPosition = clampFloatingPosition(position);
    floatingPosition = nextPosition;
    replayFloatingControls.style.left = `${Math.round(nextPosition.left)}px`;
    replayFloatingControls.style.top = `${Math.round(nextPosition.top)}px`;
    replayFloatingControls.style.right = 'auto';
    replayFloatingControls.style.bottom = 'auto';
    replayFloatingControls.style.transform = 'none';
    replayFloatingControls.dataset.dragged = 'true';
  }

  function getCurrentFloatingPosition() {
    const controlsRect = replayFloatingControls.getBoundingClientRect();
    return {
      left: controlsRect.left,
      top: controlsRect.top,
    };
  }

  function beginFloatingDrag(event) {
    if (disposed) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startPosition = floatingPosition || getCurrentFloatingPosition();
    floatingDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: startPosition.left,
      startTop: startPosition.top,
    };
    replayFloatingControls.dataset.dragging = 'true';
    try {
      replayDragHandle.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events in browser smokes may not have an active pointer capture target.
    }
  }

  function moveFloatingDrag(event) {
    if (disposed) return;
    if (!floatingDragState || floatingDragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    applyFloatingPosition({
      left: floatingDragState.startLeft + event.clientX - floatingDragState.startX,
      top: floatingDragState.startTop + event.clientY - floatingDragState.startY,
    });
  }

  function endFloatingDrag(event) {
    if (disposed) return;
    if (!floatingDragState || floatingDragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      replayDragHandle.releasePointerCapture?.(event.pointerId);
    } catch {
      // See pointer capture note in beginFloatingDrag.
    }
    floatingDragState = null;
    delete replayFloatingControls.dataset.dragging;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    while (cleanupCallbacks.length) {
      cleanupCallbacks.pop()();
    }
    floatingDragState = null;
    delete replayFloatingControls.dataset.dragging;
  }

  addListener(replayDragHandle, 'pointerdown', beginFloatingDrag);
  addListener(replayDragHandle, 'pointermove', moveFloatingDrag);
  addListener(replayDragHandle, 'pointerup', endFloatingDrag);
  addListener(replayDragHandle, 'pointercancel', endFloatingDrag);

  return {
    applyPosition: applyFloatingPosition,
    dispose,
  };
}
