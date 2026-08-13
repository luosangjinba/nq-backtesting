function colorTargets(plan) {
  const values = [];
  const visit = (value) => {
    if (typeof value === 'string' && /^#[0-9A-Fa-f]{8}$/u.test(value)) values.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  [...plan.plots, ...plan.bands, ...plan.referenceLines].forEach(({ style }) => visit(style));
  return [...new Set(values)].map((value) => [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]);
}

/** Count pixels matching declared calculated-series colors in adapter-owned screenshot evidence. */
function countCalculatedSeriesPaintedPixels(chart, plan) {
  const targets = colorTargets(plan);
  if (targets.length === 0) return 0;
  const context = chart.takeScreenshot(true, false).getContext('2d', { willReadFrequently: true });
  if (context === null) return 0;
  const data = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
  let count = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (targets.some(([red, green, blue]) => (
      Math.abs(data[offset] - red) <= 18
      && Math.abs(data[offset + 1] - green) <= 18
      && Math.abs(data[offset + 2] - blue) <= 18
    ))) count += 1;
  }
  return count;
}

/** Cross the bounded two-frame paint gate and return adapter-owned pixel evidence. */
export async function readCalculatedSeriesPaintedPixels(chart, plan, requestFrame) {
  await new Promise((resolve) => requestFrame(() => resolve()));
  await new Promise((resolve) => requestFrame(() => resolve()));
  return countCalculatedSeriesPaintedPixels(chart, plan);
}
