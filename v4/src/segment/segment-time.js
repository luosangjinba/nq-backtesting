// Shared render-time mapping for segment endpoints across chart timeframes.

import * as store from '../data/bar-store.js';
import { getBucketStart } from '../pda/pda-context.js';

export function mapSegmentTimestampToChartTime(timestamp, timeframe = store.getCurrentTimeframe()) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  const bucketStart = getBucketStart(Number(timestamp), timeframe);
  if (timeframe === 1440) {
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
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
