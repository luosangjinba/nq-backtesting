const CONNECTING_PLOT_KINDS = new Set(['area', 'baseline', 'line']);
const PROBE_FRACTIONS = Object.freeze([0.4, 0.6]);

function valuePoint(point) {
  return point?.state === 'value';
}

/** Return value-to-value spans separated by one or more explicit whitespace points. */
export function calculatedSeriesWhitespaceGaps(resource) {
  if (!CONNECTING_PLOT_KINDS.has(resource?.kind) || !Array.isArray(resource.points)) {
    return Object.freeze([]);
  }
  const gaps = [];
  let index = 1;
  while (index < resource.points.length - 1) {
    if (resource.points[index].state !== 'whitespace' || !valuePoint(resource.points[index - 1])) {
      index += 1;
      continue;
    }
    const left = resource.points[index - 1];
    while (index < resource.points.length && resource.points[index].state === 'whitespace') {
      index += 1;
    }
    if (index < resource.points.length && valuePoint(resource.points[index])) {
      gaps.push(Object.freeze({ left, right: resource.points[index] }));
    }
  }
  return Object.freeze(gaps);
}

/** Count every connecting-Plot gap which requires real painted no-bridge evidence. */
export function calculatedSeriesWhitespaceGapCount(plan) {
  return (plan?.plots ?? []).reduce((count, resource) => (
    count + calculatedSeriesWhitespaceGaps(resource).length
  ), 0);
}

function strokeColors(resource) {
  if (resource.kind === 'baseline') {
    return [resource.style.topStroke.color, resource.style.bottomStroke.color];
  }
  return [resource.style.stroke.color];
}

function strokeWidth(resource) {
  if (resource.kind === 'baseline') {
    return Math.max(resource.style.topStroke.width, resource.style.bottomStroke.width);
  }
  return resource.style.stroke.width;
}

function rgb(value) {
  return [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16));
}

function matchesColor(pixels, offset, colors) {
  return colors.some(([red, green, blue]) => (
    Math.abs(pixels[offset] - red) <= 8
      && Math.abs(pixels[offset + 1] - green) <= 8
      && Math.abs(pixels[offset + 2] - blue) <= 8
      && pixels[offset + 3] > 80
  ));
}

function pixelsNear(context, x, y, radius, colors) {
  const left = Math.max(0, Math.floor(x - radius));
  const top = Math.max(0, Math.floor(y - radius));
  const right = Math.min(context.canvas.width, Math.ceil(x + radius + 1));
  const bottom = Math.min(context.canvas.height, Math.ceil(y + radius + 1));
  if (right <= left || bottom <= top) return 0;
  const pixels = context.getImageData(left, top, right - left, bottom - top).data;
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (matchesColor(pixels, offset, colors)) count += 1;
  }
  return count;
}

function nativeSeries(record) {
  if (Array.isArray(record?.series)) return record.series[0] ?? null;
  return record?.series ?? null;
}

function finiteCoordinates(chart, series, gap) {
  const leftX = chart.timeScale().timeToCoordinate(gap.left.displayEpochMs / 1_000);
  const rightX = chart.timeScale().timeToCoordinate(gap.right.displayEpochMs / 1_000);
  const leftY = series.priceToCoordinate(gap.left.value);
  const rightY = series.priceToCoordinate(gap.right.value);
  if (![leftX, rightX, leftY, rightY].every(Number.isFinite) || rightX <= leftX) return null;
  return Object.freeze({ leftX, leftY, rightX, rightY });
}

/** Inspect adapter-owned screenshot pixels where a built-in Series would bridge a gap. */
export function readCalculatedSeriesWhitespaceEvidence(chart, maps, canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const chartElement = chart.chartElement();
  const chartRect = chartElement.getBoundingClientRect();
  const xRatio = canvas.width / chartRect.width;
  const yRatio = canvas.height / chartRect.height;
  let bridgePixelCount = 0;
  let checkedProbeCount = 0;
  let gapCount = 0;
  for (const record of maps.plots.values()) {
    const series = nativeSeries(record);
    const gaps = calculatedSeriesWhitespaceGaps(record.plan);
    gapCount += gaps.length;
    if (gaps.length === 0 || series === null || context === null) continue;
    const paneElement = series.getPane().getHTMLElement();
    if (paneElement === null) continue;
    const paneTop = paneElement.getBoundingClientRect().top - chartRect.top;
    const colors = strokeColors(record.plan).map(rgb);
    const radius = Math.ceil(strokeWidth(record.plan) * Math.max(xRatio, yRatio)) + 1;
    for (const gap of gaps) {
      const coordinates = finiteCoordinates(chart, series, gap);
      if (coordinates === null) continue;
      for (const fraction of PROBE_FRACTIONS) {
        const x = coordinates.leftX
          + ((coordinates.rightX - coordinates.leftX) * fraction);
        const y = paneTop + coordinates.leftY
          + ((coordinates.rightY - coordinates.leftY) * fraction);
        bridgePixelCount += pixelsNear(
          context,
          x * xRatio,
          y * yRatio,
          radius,
          colors,
        );
        checkedProbeCount += 1;
      }
    }
  }
  return Object.freeze({ bridgePixelCount, checkedProbeCount, gapCount });
}
