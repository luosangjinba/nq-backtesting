const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const MAX_WHEEL_DELTA = 120;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedDelta(event, plotHeight) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * plotHeight;
  return event.deltaY;
}

/** Handle only wheel input whose pointer is inside the visible right price axis. */
export function applyPriceScaleWheel({ event, host, priceScale }) {
  const bounds = host.getBoundingClientRect();
  const axisWidth = priceScale.width();
  if (axisWidth <= 0 || event.clientX < bounds.right - axisWidth) return false;
  event.preventDefault();
  event.stopImmediatePropagation();

  const range = priceScale.getVisibleRange();
  if (!range || range.to <= range.from) return true;
  const plotHeight = Math.max(1, bounds.height);
  const pointerRatio = clamp((bounds.bottom - event.clientY) / plotHeight, 0, 1);
  const previousSpan = range.to - range.from;
  const delta = clamp(normalizedDelta(event, plotHeight), -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA);
  const nextSpan = previousSpan * Math.exp(delta * WHEEL_ZOOM_SENSITIVITY);
  const anchorPrice = range.from + (previousSpan * pointerRatio);
  const nextFrom = anchorPrice - (nextSpan * pointerRatio);

  priceScale.setAutoScale(false);
  priceScale.setVisibleRange({ from: nextFrom, to: nextFrom + nextSpan });
  host.dataset.priceScaleWheelRevision = String(
    Number(host.dataset.priceScaleWheelRevision || 0) + 1,
  );
  host.dataset.priceScalePreviousSpan = String(previousSpan);
  host.dataset.priceScaleSpan = String(nextSpan);
  return true;
}

