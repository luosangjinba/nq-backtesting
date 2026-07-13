const DEFAULT_DRAG_RELEASE_GRACE_MS = 80;
const DEFAULT_WHEEL_WINDOW_MS = 2000;
const SYNTHETIC_RELEASE_EVENT_TYPES = Object.freeze(['mouseup', 'pointerup']);

function dispatchSyntheticRelease(target, eventName, root) {
  if (!target || typeof target.dispatchEvent !== 'function') return;
  const ownerDocument = target.ownerDocument || root?.ownerDocument || globalThis.document;
  const ownerWindow = ownerDocument?.defaultView || globalThis.window;
  const EventCtor = eventName.startsWith('pointer') ? ownerWindow?.PointerEvent : ownerWindow?.MouseEvent;
  const FallbackCtor = ownerWindow?.Event || globalThis.Event;
  try {
    target.dispatchEvent(EventCtor
      ? new EventCtor(eventName, { bubbles: true, buttons: 0, cancelable: true })
      : new FallbackCtor(eventName, { bubbles: true, cancelable: true }));
  } catch {
    try {
      target.dispatchEvent({ bubbles: true, buttons: 0, type: eventName });
    } catch {
      // Release recovery is best-effort.
    }
  }
}

export function createChartRangeInputController({
  activatePane,
  dragReleaseGraceMs = DEFAULT_DRAG_RELEASE_GRACE_MS,
  hosts = [],
  resolvePaneId,
  root,
  wheelWindowMs = DEFAULT_WHEEL_WINDOW_MS,
} = {}) {
  if (typeof activatePane !== 'function' || typeof resolvePaneId !== 'function') {
    throw new Error('Chart range input controller requires pane activation and id resolution.');
  }
  const focusHandlers = new Map();
  const inputStartHandlers = new Map();
  const wheelHandlers = new Map();
  const recentWheelByPaneId = new Map();
  const releaseTargets = new Set();
  const startEvents = ['pointerdown', 'mousedown', 'touchstart'];
  const releaseEvents = ['pointerup', 'pointercancel', 'mouseup', 'touchend', 'touchcancel'];
  const moveEvents = ['pointermove', 'mousemove'];
  let activeGestures = 0;
  let inputActiveUntil = 0;

  const markDragStart = () => {
    activeGestures += 1;
    inputActiveUntil = Date.now() + dragReleaseGraceMs;
  };
  const markDragEnd = () => {
    activeGestures = 0;
    inputActiveUntil = Date.now() + dragReleaseGraceMs;
  };
  const markWheel = (paneId) => {
    inputActiveUntil = Date.now() + wheelWindowMs;
    recentWheelByPaneId.set(paneId, { until: inputActiveUntil });
  };
  const forceDragRelease = (event = {}) => {
    if (activeGestures <= 0 || Number(event.buttons ?? 0) !== 0) return;
    markDragEnd();
    const ownerDocument = event.target?.ownerDocument || root?.ownerDocument || globalThis.document;
    const ownerWindow = ownerDocument?.defaultView || globalThis.window;
    SYNTHETIC_RELEASE_EVENT_TYPES.forEach((eventName) => {
      hosts.forEach((host) => dispatchSyntheticRelease(host, eventName, root));
      dispatchSyntheticRelease(ownerDocument, eventName, root);
      dispatchSyntheticRelease(ownerWindow, eventName, root);
    });
  };

  hosts.forEach((host) => {
    const paneId = resolvePaneId(host);
    startEvents.forEach((eventName) => {
      const handler = () => {
        activatePane(paneId, eventName);
        markDragStart();
      };
      inputStartHandlers.set(`${paneId}:${eventName}`, handler);
      host.addEventListener?.(eventName, handler, { passive: true });
    });
    const focusHandler = () => activatePane(paneId, 'focusin');
    focusHandlers.set(paneId, focusHandler);
    host.addEventListener?.('focusin', focusHandler, { passive: true });
    const wheelHandler = () => {
      activatePane(paneId, 'wheel');
      markWheel(paneId);
    };
    wheelHandlers.set(paneId, wheelHandler);
    host.addEventListener?.('wheel', wheelHandler, { passive: true });
    const releaseTarget = host.ownerDocument || root?.ownerDocument || globalThis.document;
    if (releaseTarget) releaseTargets.add(releaseTarget);
  });
  releaseTargets.forEach((target) => {
    releaseEvents.forEach((eventName) => target.addEventListener?.(eventName, markDragEnd, { passive: true }));
    moveEvents.forEach((eventName) => target.addEventListener?.(eventName, forceDragRelease, { passive: true }));
  });

  return Object.freeze({
    destroy() {
      hosts.forEach((host) => {
        const paneId = resolvePaneId(host);
        startEvents.forEach((eventName) => host.removeEventListener?.(eventName, inputStartHandlers.get(`${paneId}:${eventName}`)));
        host.removeEventListener?.('focusin', focusHandlers.get(paneId));
        host.removeEventListener?.('wheel', wheelHandlers.get(paneId));
      });
      releaseTargets.forEach((target) => {
        releaseEvents.forEach((eventName) => target.removeEventListener?.(eventName, markDragEnd));
        moveEvents.forEach((eventName) => target.removeEventListener?.(eventName, forceDragRelease));
      });
      recentWheelByPaneId.clear();
    },
    isRecentWheelInput(paneId) {
      const record = recentWheelByPaneId.get(paneId);
      if (!record) return false;
      if (Date.now() <= Number(record.until)) return true;
      recentWheelByPaneId.delete(paneId);
      return false;
    },
    isUserRangeInputActive() {
      return activeGestures > 0 || Date.now() <= inputActiveUntil;
    },
  });
}
