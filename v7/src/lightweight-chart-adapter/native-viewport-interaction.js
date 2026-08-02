import { readViewportIntent } from '../viewport-runtime/public.js';
import { applyPriceScaleWheel } from './price-scale-wheel.js';

const HISTORY_INTENT_STABILITY_MS = 500;

export function createNativeViewportInteraction({
  chart,
  host,
  isDisposed,
  onHistoryBoundary,
  onNativeViewportGesture = () => {},
  onViewportIntent,
  priceScale,
  readBarCount,
  requestFrame,
  viewport,
}) {
  let captureToken = 0;
  let historyCaptureTimer = null;
  let nativeGestureRevision = 0;
  let capturedGestureRevision = -1;
  let nativePointerActive = false;
  let pointerDownPoint = null;
  let nativePointerDragged = false;

  async function captureNativeViewport() {
    const token = ++captureToken;
    await new Promise((resolve) => requestFrame(resolve));
    const barCount = readBarCount();
    if (isDisposed() || token !== captureToken || barCount < 1) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    host.dataset.logicalFrom = String(range.from);
    host.dataset.logicalTo = String(range.to);
    viewport.captureManual({ latestLogicalIndex: barCount - 1, range });
    const value = readViewportIntent(viewport.snapshot());
    host.dataset.latestOffsetBars = String(value.latestOffsetBars);
    host.dataset.spanBars = String(value.spanBars);
    host.dataset.viewportOrigin = value.origin;
    host.dataset.viewportRevision = String(value.revision);
    onViewportIntent(value);
    onHistoryBoundary(Object.freeze({ from: range.from, to: range.to }));
  }

  function scheduleCapture(delayMs = HISTORY_INTENT_STABILITY_MS) {
    const gestureRevision = nativeGestureRevision;
    if (capturedGestureRevision === gestureRevision) return;
    if (historyCaptureTimer !== null) clearTimeout(historyCaptureTimer);
    historyCaptureTimer = setTimeout(() => {
      historyCaptureTimer = null;
      if (isDisposed() || capturedGestureRevision === gestureRevision) return;
      capturedGestureRevision = gestureRevision;
      host.dataset.historyBoundaryCaptureCount = String(
        Number(host.dataset.historyBoundaryCaptureCount || 0) + 1,
      );
      void captureNativeViewport();
    }, delayMs);
  }

  const onPointerDown = (event) => {
    if (!host.contains(event.target)) return;
    if (!nativePointerActive) nativeGestureRevision += 1;
    nativePointerActive = true;
    pointerDownPoint = Object.freeze({ x: event.clientX, y: event.clientY });
    nativePointerDragged = false;
  };
  const onPointerMove = (event) => {
    if (!nativePointerActive || !pointerDownPoint) return;
    if (!nativePointerDragged) {
      const x = event.clientX - pointerDownPoint.x;
      const y = event.clientY - pointerDownPoint.y;
      nativePointerDragged = ((x * x) + (y * y)) >= 4;
    }
    if (nativePointerDragged) {
      onNativeViewportGesture();
      scheduleCapture();
    }
  };
  const onPointerUp = () => {
    if (!nativePointerActive) return;
    nativePointerActive = false;
    pointerDownPoint = null;
    if (nativePointerDragged) scheduleCapture(0);
    nativePointerDragged = false;
  };
  const onWheel = (event) => {
    host.dataset.wheelEventCount = String(Number(host.dataset.wheelEventCount || 0) + 1);
    if (applyPriceScaleWheel({ event, host, priceScale })) return;
    nativeGestureRevision += 1;
    onNativeViewportGesture();
    scheduleCapture();
  };

  host.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('mousemove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('mouseup', onPointerUp, true);

  return Object.freeze({
    dispose() {
      if (historyCaptureTimer !== null) clearTimeout(historyCaptureTimer);
      historyCaptureTimer = null;
      captureToken += 1;
      host.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('mousemove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('mouseup', onPointerUp, true);
    },
  });
}
