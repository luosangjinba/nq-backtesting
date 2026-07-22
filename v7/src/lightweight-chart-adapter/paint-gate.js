import { failLightweightAdapter } from './adapter-error.js';

function nextFrame(requestFrame) {
  return new Promise((resolve) => requestFrame(resolve));
}

async function crossPaintOpportunity(requestFrame) {
  await nextFrame(requestFrame);
  await nextFrame(requestFrame);
}

async function boundedPaintOpportunity(requestFrame, work = () => crossPaintOpportunity(requestFrame)) {
  let timeout;
  const bounded = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(Object.assign(new Error('Chart paint timed out.'), {
      code: 'CHART_PAINT_TIMEOUT',
    })), 2_000);
  });
  try {
    await Promise.race([work(), bounded]);
  } finally {
    clearTimeout(timeout);
  }
}

async function observePaintedCandles(chart, requestFrame) {
  let observed = null;
  await boundedPaintOpportunity(requestFrame, async () => {
    await crossPaintOpportunity(requestFrame);
    observed = chart.takeScreenshot();
  });
  return observed;
}

function containsCandlePixels(canvas) {
  if (!canvas) return false;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || canvas.width < 1 || canvas.height < 1) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const greenCandle = green > 150 && red < 100 && blue > 90 && blue < 210;
    const redCandle = red > 190 && green < 150 && blue < 170;
    if (greenCandle || redCandle) return true;
  }
  return false;
}

function sameBar(left, right) {
  return ['time', 'open', 'high', 'low', 'close']
    .every((field) => left?.[field] === right?.[field]);
}

function seriesProjectionObserved({ chart, changed, latestBar, latestLogicalIndex, series }) {
  if (typeof changed !== 'function' || changed() !== true) return false;
  if (!latestBar || !Number.isSafeInteger(latestLogicalIndex) || latestLogicalIndex < 0) return false;
  const stored = series?.dataByIndex?.(latestLogicalIndex) ?? null;
  if (!sameBar(stored, latestBar)) return false;
  const timeCoordinate = chart?.timeScale?.().timeToCoordinate(latestBar.time);
  const priceCoordinate = series?.priceToCoordinate?.(latestBar.close);
  return Number.isFinite(timeCoordinate) && Number.isFinite(priceCoordinate);
}

/**
 * Cross the browser paint boundary and prove the current series mutation is
 * observable. Raster candle colors are preferred diagnostic evidence, while
 * the public series/coordinate APIs provide the stable hard proof when a
 * transient or custom-colored screenshot contains no recognizable pixels.
 */
export async function requirePaintedCandles(chart, requestFrame, verification = {}) {
  const canvas = await observePaintedCandles(chart, requestFrame);
  if (containsCandlePixels(canvas)) return 'screenshot-candle-pixels';
  if (seriesProjectionObserved({ chart, ...verification })) return 'series-data-coordinates';
  failLightweightAdapter(
    'CHART_CANDLES_NOT_PAINTED',
    'No candle pixels or current series coordinates were observed.',
  );
}

/** Prove a tail mutation reached the series, then cross its render opportunity. */
export async function requireTailUpdatePaint({ changed, requestFrame }) {
  if (typeof changed !== 'function' || changed() !== true) {
    failLightweightAdapter('CHART_TAIL_UPDATE_NOT_OBSERVED', 'Tail update did not reach the chart series.');
  }
  await boundedPaintOpportunity(requestFrame);
}
