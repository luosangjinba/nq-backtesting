import {
  clampReplayTransportPosition,
  createReplayTransportPositionSnapshot,
} from './replay-transport-position.js';

const EMPTY_POSITION_PREFERENCE = Object.freeze({
  load() {
    return null;
  },
  save() {},
});

function normalizeFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function mountReplayTransportPositionController(root, {
  positionPreference = EMPTY_POSITION_PREFERENCE,
  signal,
} = {}) {
  if (!root) throw new Error('Replay transport position root is required.');
  const preference = positionPreference || EMPTY_POSITION_PREFERENCE;
  let activeMove = null;
  let activeStop = null;

  function viewportSize() {
    const view = root.ownerDocument?.defaultView;
    return {
      height: normalizeFiniteNumber(view?.innerHeight),
      width: normalizeFiniteNumber(view?.innerWidth),
    };
  }

  function transportSize(fallback = {}) {
    const rect = root.getBoundingClientRect?.() || {};
    return {
      height: normalizeFiniteNumber(rect.height, normalizeFiniteNumber(fallback.height)),
      width: normalizeFiniteNumber(rect.width, normalizeFiniteNumber(fallback.width)),
    };
  }

  function apply(position) {
    if (!position) return null;
    const viewport = viewportSize();
    const size = transportSize(position);
    const nextPosition = clampReplayTransportPosition({
      height: size.height,
      left: position.left,
      top: position.top,
      viewportHeight: viewport.height,
      viewportWidth: viewport.width,
      width: size.width,
    });
    root.style.left = `${nextPosition.left}px`;
    root.style.top = `${nextPosition.top}px`;
    root.style.bottom = 'auto';
    root.style.transform = 'none';
    root.dataset.dragged = 'true';
    root.dataset.positionRestored = 'true';
    return createReplayTransportPositionSnapshot({ ...nextPosition, ...size });
  }

  function save(position) {
    if (typeof preference.save !== 'function') return;
    try {
      preference.save(position);
    } catch (error) {
      root.dataset.lastError = error?.message || String(error);
    }
  }

  function restore() {
    if (typeof preference.load !== 'function') return null;
    try {
      const restoredPosition = apply(preference.load());
      if (restoredPosition) save(restoredPosition);
      return restoredPosition;
    } catch (error) {
      root.dataset.lastError = error?.message || String(error);
      return null;
    }
  }

  function clearDocumentListeners() {
    if (activeMove) root.ownerDocument?.removeEventListener?.('pointermove', activeMove);
    if (activeStop) root.ownerDocument?.removeEventListener?.('pointerup', activeStop);
    activeMove = null;
    activeStop = null;
  }

  function startDrag(event = {}) {
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
    event.preventDefault?.();
    const rect = root.getBoundingClientRect?.();
    if (!rect) return;
    clearDocumentListeners();
    const origin = {
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    };
    activeMove = (moveEvent) => {
      const viewport = viewportSize();
      const next = clampReplayTransportPosition({
        ...origin,
        left: moveEvent.clientX - origin.offsetX,
        top: moveEvent.clientY - origin.offsetY,
        viewportHeight: viewport.height,
        viewportWidth: viewport.width,
      });
      root.style.left = `${next.left}px`;
      root.style.top = `${next.top}px`;
      root.style.bottom = 'auto';
      root.style.transform = 'none';
      root.dataset.dragged = 'true';
    };
    activeStop = () => {
      clearDocumentListeners();
      const nextRect = root.getBoundingClientRect?.();
      if (nextRect) save(createReplayTransportPositionSnapshot(nextRect));
    };
    root.ownerDocument?.addEventListener?.('pointermove', activeMove);
    root.ownerDocument?.addEventListener?.('pointerup', activeStop, { once: true });
  }

  const dragHandle = root.querySelector('[data-v6-transport-drag-handle]');
  dragHandle?.addEventListener?.('pointerdown', startDrag, { signal });
  signal?.addEventListener?.('abort', clearDocumentListeners, { once: true });
  restore();

  return Object.freeze({ destroy: clearDocumentListeners, restore });
}
