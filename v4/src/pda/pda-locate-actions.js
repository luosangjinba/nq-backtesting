import {
  getComparisonChartContext,
  getPrimaryChartContext,
} from '../chart/chart-context.js';
import { flashPdaAnnotation } from '../chart/pda-locate-flash.js';
import { VIEWPORT_TARGETS, locateChartRange } from '../chart/viewport-router.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';

export function getPdaTimestampRange(annotation = {}) {
  const timestamps = getPdaProjectionTimestamps(annotation);
  if (!timestamps.length) return null;
  return {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
}

const PDA_TARGET_CONTEXTS = {
  [VIEWPORT_TARGETS.PRIMARY]: getPrimaryChartContext,
  [VIEWPORT_TARGETS.COMPARISON]: getComparisonChartContext,
};

function normalizePdaLocateTarget(annotation = {}, options = {}) {
  if (options.chart === VIEWPORT_TARGETS.SECONDARY) return VIEWPORT_TARGETS.COMPARISON;
  if (options.chart) return options.chart;
  if (annotation.sourceChartId === VIEWPORT_TARGETS.COMPARISON) return VIEWPORT_TARGETS.COMPARISON;
  return VIEWPORT_TARGETS.BOTH;
}

function expandPdaTargets(targetChart) {
  if (targetChart === VIEWPORT_TARGETS.SECONDARY) return [VIEWPORT_TARGETS.COMPARISON];
  if (targetChart === VIEWPORT_TARGETS.COMPARISON) return [VIEWPORT_TARGETS.COMPARISON];
  if (targetChart === VIEWPORT_TARGETS.PRIMARY) return [VIEWPORT_TARGETS.PRIMARY];
  return [VIEWPORT_TARGETS.PRIMARY, VIEWPORT_TARGETS.COMPARISON];
}

function createSkippedResult() {
  return { located: false, flashed: false, canPriceFlash: false };
}

function locatePdaOnTarget(annotation, range, target) {
  const context = PDA_TARGET_CONTEXTS[target]?.();
  const canPriceFlash = canRenderPdaPriceProjection(annotation, context);
  const locateResult = locateChartRange(target, range, { flash: !canPriceFlash });
  const located = Boolean(locateResult.targets?.[target]?.located);
  let flashed = false;
  if (located && canPriceFlash) {
    flashed = flashPdaAnnotation(annotation, context);
    if (!flashed) locateChartRange(target, range);
  }
  return { located, flashed, canPriceFlash };
}

export function locatePdaProjection(annotation = {}, options = {}) {
  const range = getPdaTimestampRange(annotation);
  if (!range) {
    return {
      located: false,
      range: null,
      primary: createSkippedResult(),
      secondary: createSkippedResult(),
      comparison: createSkippedResult(),
    };
  }
  const targetChart = normalizePdaLocateTarget(annotation, options);
  const targets = expandPdaTargets(targetChart);
  const primary = targets.includes(VIEWPORT_TARGETS.PRIMARY)
    ? locatePdaOnTarget(annotation, range, VIEWPORT_TARGETS.PRIMARY)
    : createSkippedResult();
  const secondary = createSkippedResult();
  const comparison = targets.includes(VIEWPORT_TARGETS.COMPARISON)
    ? locatePdaOnTarget(annotation, range, VIEWPORT_TARGETS.COMPARISON)
    : createSkippedResult();
  return {
    located: primary.located || secondary.located || comparison.located,
    range,
    primary,
    secondary,
    comparison,
  };
}
