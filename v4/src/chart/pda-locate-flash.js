import { PdaLocateFlashPrimitive } from './pda-locate-flash-primitive.js';
import { getVisibleFibLevels } from '../pda/fib-levels.js';

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

function getLineGeometry(annotation = {}, chartContext = {}) {
  const price = firstNumber([annotation.price, annotation.referencePrice]);
  const startTimestamp = firstNumber([
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
    annotation.startTimeTimestamp,
    annotation.startTime,
  ]);
  const endTimestamp = firstNumber([
    annotation.endTimeTimestamp,
    annotation.end?.timestamp,
    annotation.end?.time,
    annotation.endTime,
  ]);

  if (price === null || startTimestamp === null) return null;
  const fallbackEnd = startTimestamp + Math.max(1, Number(chartContext?.timeframe) || 1) * 60 * 8;
  const resolvedEnd = endTimestamp ?? fallbackEnd;
  return {
    kind: 'line',
    startTimestamp: Math.min(startTimestamp, resolvedEnd),
    endTimestamp: Math.max(startTimestamp, resolvedEnd),
    price,
  };
}

function getPointTimestamp(point = {}) {
  return firstNumber([
    point.canonicalTimestamp,
    point.timestamp,
    point.anchorTime,
    point.time,
  ]);
}

function getPointSetGeometry(annotation = {}) {
  const rawPoints = Array.isArray(annotation.points) ? annotation.points : [];
  const points = rawPoints
    .map((point) => ({
      timestamp: getPointTimestamp(point),
      price: firstNumber([point.price]),
    }))
    .filter((point) => point.timestamp !== null && point.price !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!points.length) return null;

  const referencePrice = firstNumber([
    annotation.referencePrice,
    annotation.price,
    points.reduce((sum, point) => sum + point.price, 0) / points.length,
  ]);
  if (referencePrice === null) return null;

  return {
    kind: 'pointSet',
    points,
    referencePrice,
  };
}

function getFibLevelPrice(startPrice, endPrice, levelValue) {
  const value = Number(levelValue);
  if (!Number.isFinite(value)) return null;
  return endPrice - (endPrice - startPrice) * value;
}

function getFibGeometry(annotation = {}) {
  const startTimestamp = getPointTimestamp(annotation.start);
  const endTimestamp = getPointTimestamp(annotation.end);
  const startPrice = firstNumber([annotation.start?.price]);
  const endPrice = firstNumber([annotation.end?.price]);
  if (
    startTimestamp === null ||
    endTimestamp === null ||
    startPrice === null ||
    endPrice === null
  ) {
    return null;
  }

  const levels = getVisibleFibLevels(annotation.levels)
    .map((level) => ({
      value: Number(level.value),
      price: getFibLevelPrice(startPrice, endPrice, level.value),
    }))
    .filter((level) => Number.isFinite(level.value) && level.price !== null);
  if (!levels.length) return null;

  return {
    kind: 'fib',
    start: {
      timestamp: startTimestamp,
      price: startPrice,
    },
    end: {
      timestamp: endTimestamp,
      price: endPrice,
    },
    levels,
  };
}

export function getPdaAnnotationFlashGeometry(annotation = {}, chartContext = null) {
  if (!annotation || !chartContext) return null;
  if (annotation.type === 'fib' || annotation.shape === 'fib-retracement') {
    return getFibGeometry(annotation);
  }
  if (Array.isArray(annotation.points) && annotation.points.length) {
    return getPointSetGeometry(annotation);
  }
  return getRangeGeometry(annotation) || getLineGeometry(annotation, chartContext);
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
  if (!geometry) return false;

  const primitive = new PdaLocateFlashPrimitive(chartContext, geometry, options);
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
