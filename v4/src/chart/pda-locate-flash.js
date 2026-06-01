import { PdaRangeLocateFlashPrimitive } from './pda-locate-flash-primitive.js';

const DEFAULT_DURATION_MS = 900;
const activeFlashes = new Map();

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(values = []) {
  for (const value of values) {
    const number = asNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function getChartKey(chartContext) {
  return chartContext?.chartId || chartContext?.id || 'primary';
}

function hasChartTarget(chartContext) {
  return Boolean(
    chartContext?.enabled &&
    chartContext?.getChart?.() &&
    chartContext?.getSeries?.() &&
    chartContext?.attachPrimitive &&
    chartContext?.detachPrimitive
  );
}

function getRangeGeometry(annotation = {}) {
  const topPrice = firstNumber([annotation.topPrice, annotation.priceHigh]);
  const bottomPrice = firstNumber([annotation.bottomPrice, annotation.priceLow]);
  const startTimestamp = firstNumber([
    annotation.startTimeTimestamp,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.startTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ]);
  const endTimestamp = firstNumber([
    annotation.endTimeTimestamp,
    annotation.end?.timestamp,
    annotation.end?.time,
    annotation.endTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ]);

  if (
    topPrice === null ||
    bottomPrice === null ||
    startTimestamp === null ||
    endTimestamp === null
  ) {
    return null;
  }

  return {
    kind: 'range',
    startTimestamp: Math.min(startTimestamp, endTimestamp),
    endTimestamp: Math.max(startTimestamp, endTimestamp),
    topPrice: Math.max(topPrice, bottomPrice),
    bottomPrice: Math.min(topPrice, bottomPrice),
  };
}

export function getPdaAnnotationFlashGeometry(annotation = {}, chartContext = null) {
  if (!annotation || !chartContext) return null;
  return getRangeGeometry(annotation);
}

export function clearPdaLocateFlash(chartContext) {
  const key = getChartKey(chartContext);
  const active = activeFlashes.get(key);
  if (!active) return;

  if (active.frame !== null) {
    cancelAnimationFrame(active.frame);
  }
  try {
    chartContext?.detachPrimitive?.(active.primitive);
  } catch {
    // The chart may already have cleared this transient primitive.
  }
  activeFlashes.delete(key);
}

export function flashPdaAnnotation(annotation, chartContext, options = {}) {
  if (!hasChartTarget(chartContext)) return false;

  const geometry = getPdaAnnotationFlashGeometry(annotation, chartContext);
  if (!geometry || geometry.kind !== 'range') return false;

  const primitive = new PdaRangeLocateFlashPrimitive(chartContext, geometry, options);
  clearPdaLocateFlash(chartContext);

  try {
    chartContext.attachPrimitive(primitive);
  } catch {
    return false;
  }

  const key = getChartKey(chartContext);
  const durationMs = Number.isFinite(Number(options.durationMs))
    ? Math.max(0, Number(options.durationMs))
    : DEFAULT_DURATION_MS;
  const startedAt = performance.now();
  const active = { primitive, frame: null };
  activeFlashes.set(key, active);

  const tick = (now) => {
    if (activeFlashes.get(key) !== active) return;
    const progress = durationMs === 0 ? 1 : Math.min(1, (now - startedAt) / durationMs);
    primitive.setProgress(progress);
    if (progress < 1) {
      active.frame = requestAnimationFrame(tick);
      return;
    }
    clearPdaLocateFlash(chartContext);
  };

  active.frame = requestAnimationFrame(tick);
  return true;
}
