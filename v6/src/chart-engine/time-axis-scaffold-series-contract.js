export const TIME_AXIS_SCAFFOLD_SERIES_OPTIONS = Object.freeze({
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  lineVisible: false,
  priceLineVisible: false,
});

export function normalizeTimeAxisScaffoldSeriesData(points = []) {
  return points.map((point) => {
    const time = Number(point?.time ?? point?.timestamp);
    if (!Number.isFinite(time)) {
      throw new Error('Time-axis scaffold point requires a finite time.');
    }
    return Object.freeze({ time });
  });
}

export function assertTimeAxisScaffoldSeriesData(points = []) {
  for (const point of points) {
    const keys = Object.keys(point || {});
    if (keys.length !== 1 || keys[0] !== 'time' || !Number.isFinite(Number(point.time))) {
      throw new Error('Time-axis scaffold Series accepts time-only whitespace points.');
    }
  }
  return true;
}
