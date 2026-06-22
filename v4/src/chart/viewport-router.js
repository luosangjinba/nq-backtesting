import * as viewport from './viewport-controller.js';
import * as comparisonViewport from './comparison-viewport-controller.js';

export const VIEWPORT_TARGETS = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  COMPARISON: 'comparison-window',
  BOTH: 'both',
});

const DEFAULT_TARGETS = [VIEWPORT_TARGETS.PRIMARY, VIEWPORT_TARGETS.COMPARISON];

function normalizeRange(rangeOrStart, end = null) {
  const input = typeof rangeOrStart === 'object' && rangeOrStart !== null
    ? rangeOrStart
    : { start: rangeOrStart, end };
  const start = Number(input.start);
  const parsedEnd = Number(input.end);
  if (!Number.isFinite(start) || !Number.isFinite(parsedEnd)) return null;
  return { start, end: parsedEnd };
}

function normalizeTarget(chartId) {
  const value = String(chartId || VIEWPORT_TARGETS.PRIMARY).trim();
  if (value === VIEWPORT_TARGETS.SECONDARY) return VIEWPORT_TARGETS.SECONDARY;
  if (value === VIEWPORT_TARGETS.COMPARISON) return VIEWPORT_TARGETS.COMPARISON;
  if (value === VIEWPORT_TARGETS.BOTH) return VIEWPORT_TARGETS.BOTH;
  return VIEWPORT_TARGETS.PRIMARY;
}

function expandTargets(chartId) {
  const target = normalizeTarget(chartId);
  return target === VIEWPORT_TARGETS.BOTH ? [...DEFAULT_TARGETS] : [target];
}

function createTargetResult(located, reason = '') {
  return {
    located: Boolean(located),
    reason: located ? '' : reason,
  };
}

function createEmptyResult(range = null) {
  return {
    located: false,
    range,
    targets: {},
  };
}

function defaultHandlers() {
  return {
    [VIEWPORT_TARGETS.PRIMARY]: (range, options) =>
      viewport.locateTimestampRange(range.start, range.end, options),
    [VIEWPORT_TARGETS.COMPARISON]: (range, options) =>
      comparisonViewport.locateComparisonTimestampRange(range.start, range.end, options),
  };
}

export function createViewportRouter(handlers = defaultHandlers()) {
  function locateChartRange(chartId, rangeOrStart, options = {}) {
    const range = normalizeRange(rangeOrStart, options.end);
    const result = createEmptyResult(range);
    const targets = expandTargets(chartId);
    if (!range) {
      targets.forEach((target) => {
        result.targets[target] = createTargetResult(false, 'invalid-range');
      });
      return result;
    }

    targets.forEach((target) => {
      const handler = handlers[target];
      if (typeof handler !== 'function') {
        result.targets[target] = createTargetResult(false, 'unsupported-target');
        return;
      }
      try {
        const located = Boolean(handler(range, options));
        result.targets[target] = createTargetResult(located, located ? '' : 'not-located');
      } catch (error) {
        result.targets[target] = createTargetResult(false, error?.message || 'locate-failed');
      }
    });
    result.located = Object.values(result.targets).some((targetResult) => targetResult.located);
    return result;
  }

  function locateChartRangeMany(chartIds = [], rangeOrStart, options = {}) {
    const range = normalizeRange(rangeOrStart, options.end);
    const result = createEmptyResult(range);
    const uniqueTargets = Array.from(new Set(
      (Array.isArray(chartIds) ? chartIds : [chartIds]).flatMap(expandTargets)
    ));
    if (!uniqueTargets.length) uniqueTargets.push(VIEWPORT_TARGETS.PRIMARY);

    uniqueTargets.forEach((target) => {
      const partial = locateChartRange(target, range, options);
      result.targets[target] = partial.targets[target] || createTargetResult(false, 'not-located');
    });
    result.located = Object.values(result.targets).some((targetResult) => targetResult.located);
    return result;
  }

  return {
    locateChartRange,
    locateChartRangeMany,
  };
}

const defaultRouter = createViewportRouter();

export function locateChartRange(chartId, rangeOrStart, options = {}) {
  return defaultRouter.locateChartRange(chartId, rangeOrStart, options);
}

export function locateChartRangeMany(chartIds, rangeOrStart, options = {}) {
  return defaultRouter.locateChartRangeMany(chartIds, rangeOrStart, options);
}

export function formatLocateTargets(result = {}) {
  const targets = result.targets || {};
  return Object.entries(targets)
    .map(([target, targetResult]) => (
      targetResult.located ? `${target}:located` : `${target}:${targetResult.reason || 'not-located'}`
    ))
    .join(', ');
}

export function getViewportTargetIds() {
  return { ...VIEWPORT_TARGETS };
}
