// Shared render-time mapping for segment endpoints across chart timeframes.

import * as store from '../data/bar-store.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';

export function mapSegmentTimestampToChartTime(timestamp, timeframe = store.getCurrentTimeframe()) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  return mapTimestampToChartTime(Number(timestamp), timeframe, store.getDisplayBars());
}

export function getSegmentPointRenderTime(point, timeframe = store.getCurrentTimeframe()) {
  if (!point) return null;
  const sourceTimeframe = Number(point.sourceTimeframe);
  const occurrenceTimestamp = Number(point.occurrenceTimestamp);
  const shouldUseOccurrence =
    Number.isFinite(sourceTimeframe) &&
    timeframe < sourceTimeframe &&
    Number.isFinite(occurrenceTimestamp);

  return (
    mapSegmentTimestampToChartTime(shouldUseOccurrence ? occurrenceTimestamp : point.timestamp, timeframe) ??
    point.time
  );
}
