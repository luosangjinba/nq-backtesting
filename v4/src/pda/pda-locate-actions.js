import { getPrimaryChartContext, getSecondaryChartContext } from '../chart/chart-context.js';
import { flashPdaAnnotation } from '../chart/pda-locate-flash.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';

export function getPdaTimestampRange(annotation = {}) {
  const timestamps = getPdaProjectionTimestamps(annotation);
  if (!timestamps.length) return null;
  return {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
}

function locatePrimaryPda(annotation, range) {
  const context = getPrimaryChartContext();
  const canPriceFlash = canRenderPdaPriceProjection(annotation, context);
  const located = viewport.locateTimestampRange(range.start, range.end, { flash: !canPriceFlash });
  let flashed = false;
  if (located && canPriceFlash) {
    flashed = flashPdaAnnotation(annotation, context);
    if (!flashed) viewport.locateTimestampRange(range.start, range.end);
  }
  return { located, flashed, canPriceFlash };
}

function locateSecondaryPda(annotation, range) {
  const context = getSecondaryChartContext();
  const canPriceFlash = canRenderPdaPriceProjection(annotation, context);
  const located = secondaryViewport.locateSecondaryTimestampRange(range.start, range.end, { flash: !canPriceFlash });
  let flashed = false;
  if (located && canPriceFlash) {
    flashed = flashPdaAnnotation(annotation, context);
    if (!flashed) secondaryViewport.locateSecondaryTimestampRange(range.start, range.end);
  }
  return { located, flashed, canPriceFlash };
}

export function locatePdaProjection(annotation = {}) {
  const range = getPdaTimestampRange(annotation);
  if (!range) {
    return { located: false, range: null, primary: { located: false }, secondary: { located: false } };
  }
  const primary = locatePrimaryPda(annotation, range);
  const secondary = locateSecondaryPda(annotation, range);
  return {
    located: primary.located || secondary.located,
    range,
    primary,
    secondary,
  };
}
