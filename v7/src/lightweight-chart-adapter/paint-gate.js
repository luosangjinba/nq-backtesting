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
    // A chart mutation can cross the JS rAF boundary before its raster surface
    // is sampled. Keep this bounded to four two-frame observations so one
    // transient empty snapshot cannot reject an otherwise current all-Pane
    // Replay commit.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await crossPaintOpportunity(requestFrame);
      const canvas = chart.takeScreenshot();
      if (containsCandlePixels(canvas)) {
        observed = canvas;
        return;
      }
    }
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

/** Wait across two rendering opportunities and prove candle pixels exist. */
export async function requirePaintedCandles(chart, requestFrame) {
  const canvas = await observePaintedCandles(chart, requestFrame);
  if (!containsCandlePixels(canvas)) {
    failLightweightAdapter('CHART_CANDLES_NOT_PAINTED', 'No painted candle pixels were observed.');
  }
  return canvas;
}

/** Prove a tail mutation reached the series, then cross its render opportunity. */
export async function requireTailUpdatePaint({ changed, requestFrame }) {
  if (typeof changed !== 'function' || changed() !== true) {
    failLightweightAdapter('CHART_TAIL_UPDATE_NOT_OBSERVED', 'Tail update did not reach the chart series.');
  }
  await boundedPaintOpportunity(requestFrame);
}
