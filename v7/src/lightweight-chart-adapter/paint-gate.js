import { failLightweightAdapter } from './adapter-error.js';

function nextFrame(requestFrame) {
  return new Promise((resolve) => requestFrame(resolve));
}

function containsCandlePixels(canvas) {
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
  let timeout;
  const paintedFrames = (async () => {
    await nextFrame(requestFrame);
    await nextFrame(requestFrame);
  })();
  const bounded = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(Object.assign(new Error('Chart paint timed out.'), {
      code: 'CHART_PAINT_TIMEOUT',
    })), 2_000);
  });
  try {
    await Promise.race([paintedFrames, bounded]);
  } finally {
    clearTimeout(timeout);
  }
  const canvas = chart.takeScreenshot();
  if (!containsCandlePixels(canvas)) {
    failLightweightAdapter('CHART_CANDLES_NOT_PAINTED', 'No painted candle pixels were observed.');
  }
  return canvas;
}
