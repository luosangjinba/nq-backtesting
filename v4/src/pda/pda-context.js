// Realtime context tags for manually selected PDA points.

import { timeframeToString } from '../config.js';
import { getPdaType } from './pda-types.js';

export const CONTEXT_TIMEFRAMES = [1440];

export const SESSION_WINDOWS = [
  { id: 'asia', label: 'Asia Session', start: 18 * 60, end: 1 * 60 + 59, crossesMidnight: true },
  { id: 'london_kz', label: 'London Killzone', start: 2 * 60, end: 4 * 60 + 59 },
  { id: 'london_close', label: 'London Close', start: 5 * 60, end: 6 * 60 + 59 },
  { id: 'ny_premarket', label: 'NY Premarket', start: 7 * 60, end: 9 * 60 + 29 },
  { id: 'ny_open', label: 'NY Open', start: 9 * 60 + 30, end: 9 * 60 + 59 },
  { id: 'am_silver_bullet', label: 'AM Silver Bullet', start: 10 * 60, end: 10 * 60 + 59 },
  { id: 'ny_late_morning', label: 'NY Late Morning', start: 11 * 60, end: 11 * 60 + 59 },
  { id: 'lunch', label: 'Lunch', start: 12 * 60, end: 12 * 60 + 59 },
  { id: 'pm_open', label: 'PM Open', start: 13 * 60, end: 13 * 60 + 59 },
  { id: 'pm_silver_bullet', label: 'PM Silver Bullet', start: 14 * 60, end: 14 * 60 + 59 },
  { id: 'power_hour', label: 'Power Hour', start: 15 * 60, end: 15 * 60 + 59 },
  { id: 'post_close', label: 'Post-Close', start: 16 * 60, end: 16 * 60 + 59 },
  { id: 'cme_break', label: 'CME Break', start: 17 * 60, end: 17 * 60 + 59, skipExtrema: true },
];

const PRICE_EPSILON = 0.0000001;
const BASE_ANCHOR_EPOCH = 946684800; // 2000-01-01 00:00 UTC wall-clock anchor.
const FOUR_HOUR_ANCHOR_OFFSET = 7200; // Match backend 4H bars: 02:00/06:00/.../22:00.
const CONTEXT_LABEL_ORDER = ['D'];

function getUtcParts(timestamp) {
  const date = new Date(timestamp * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function formatUtcDay(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftUtcDay(parts, deltaDays) {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day + deltaDays));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function getTradingDaySessionStart(timestamp) {
  const parts = getUtcParts(timestamp);
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, 18, 0, 0, 0));

  if (parts.hour < 18) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return Math.floor(date.getTime() / 1000);
}

export function getBucketStart(timestamp, timeframe) {
  if (timeframe === 1440) {
    return getTradingDaySessionStart(timestamp);
  }

  const tfSeconds = timeframe * 60;
  const anchor = BASE_ANCHOR_EPOCH + (timeframe === 240 ? FOUR_HOUR_ANCHOR_OFFSET : 0);
  return anchor + Math.floor((timestamp - anchor) / tfSeconds) * tfSeconds;
}

function getCurrentBarInterval(bar, timeframe) {
  const start = getBucketStart(bar.timestamp, timeframe);
  return {
    start,
    end: start + timeframe * 60,
  };
}

function aggregateBars(sourceBars, timeframe) {
  const grouped = new Map();

  sourceBars.forEach((bar) => {
    const bucketStart = getBucketStart(bar.timestamp, timeframe);
    const bucket = grouped.get(bucketStart);

    if (!bucket) {
      grouped.set(bucketStart, {
        timestamp: bucketStart,
        endTimestamp: bucketStart + timeframe * 60,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0,
        sourceCount: 1,
      });
      return;
    }

    bucket.high = Math.max(bucket.high, bar.high);
    bucket.low = Math.min(bucket.low, bar.low);
    bucket.close = bar.close;
    bucket.volume += bar.volume || 0;
    bucket.sourceCount += 1;
  });

  return Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function getOverlappingAggregates(sourceBars, selectedBar, currentTimeframe, targetTimeframe) {
  const selectedInterval = getCurrentBarInterval(selectedBar, currentTimeframe);
  return aggregateBars(sourceBars, targetTimeframe).filter((aggregate) =>
    intervalsOverlap(selectedInterval, {
      start: aggregate.timestamp,
      end: aggregate.endTimestamp,
    })
  );
}

function aggregatePriceForType(aggregate, pdaType) {
  return pdaType.priceField === 'high' ? aggregate.high : aggregate.low;
}

function isRepresentativeExtreme(type, selectedBar, currentTimeframe, sourceBars, aggregate, targetTimeframe) {
  const pdaType = getPdaType(type);
  if (!pdaType) return false;

  const selectedPrice = selectedBar[pdaType.priceField];
  const aggregatePrice = aggregatePriceForType(aggregate, pdaType);
  if (Math.abs(selectedPrice - aggregatePrice) >= PRICE_EPSILON) return false;

  if (targetTimeframe < currentTimeframe) {
    return true;
  }

  const selectedBucketStart = getBucketStart(selectedBar.timestamp, currentTimeframe);
  const currentTfAggregates = aggregateBars(sourceBars, currentTimeframe).filter((currentAggregate) => {
    const currentPrice = aggregatePriceForType(currentAggregate, pdaType);
    return (
      currentAggregate.timestamp >= aggregate.timestamp &&
      currentAggregate.timestamp < aggregate.endTimestamp &&
      Math.abs(currentPrice - aggregatePrice) < PRICE_EPSILON
    );
  });
  const representative = currentTfAggregates[currentTfAggregates.length - 1];

  return representative?.timestamp === selectedBucketStart;
}

function findSessionWindow(timestamp) {
  const { hour, minute } = getUtcParts(timestamp);
  const minuteOfDay = hour * 60 + minute;

  return (
    SESSION_WINDOWS.find((window) => {
      if (window.crossesMidnight) {
        return minuteOfDay >= window.start || minuteOfDay <= window.end;
      }
      return minuteOfDay >= window.start && minuteOfDay <= window.end;
    }) || null
  );
}

function getSessionKey(timestamp, session) {
  const parts = getUtcParts(timestamp);
  if (session?.crossesMidnight && parts.hour < 18) {
    const shifted = shiftUtcDay(parts, -1);
    return formatUtcDay(shifted.year, shifted.month, shifted.day);
  }
  return formatUtcDay(parts.year, parts.month, parts.day);
}

function getBarsInSameSession(allBars, selectedBar, session) {
  if (!session || session.skipExtrema) return [];
  const sessionKey = getSessionKey(selectedBar.timestamp, session);
  return allBars.filter((bar) => {
    const barSession = findSessionWindow(bar.timestamp);
    return barSession?.id === session.id && getSessionKey(bar.timestamp, barSession) === sessionKey;
  });
}

function getSessionExtremaContext(type, bar, allBars) {
  const pdaType = getPdaType(type);
  const session = findSessionWindow(bar.timestamp);
  if (!pdaType || !session || session.skipExtrema) return null;

  const sessionBars = getBarsInSameSession(allBars, bar, session);
  if (!sessionBars.length) return null;

  const side = pdaType.priceField === 'high' ? 'high' : 'low';
  const selectedPrice = bar[pdaType.priceField];
  const extremePrice =
    pdaType.priceField === 'high'
      ? Math.max(...sessionBars.map((sessionBar) => sessionBar.high))
      : Math.min(...sessionBars.map((sessionBar) => sessionBar.low));

  if (Math.abs(selectedPrice - extremePrice) < PRICE_EPSILON) {
    return `${session.label} ${side}`;
  }

  return null;
}

function getMidnightContext(type, bar) {
  const pdaType = getPdaType(type);
  const { hour, minute } = getUtcParts(bar.timestamp);
  if (!pdaType || hour !== 0 || minute !== 0) return null;

  const side = pdaType.priceField === 'high' ? 'high' : 'low';
  return `Midnight ${side}`;
}

function getHtfContexts(type, bar, currentTimeframe, sourceBars) {
  const pdaType = getPdaType(type);
  if (!pdaType || !sourceBars.length) return [];

  const side = pdaType.priceField === 'high' ? 'high' : 'low';

  return CONTEXT_TIMEFRAMES.flatMap((timeframe) => {
    const aggregates = getOverlappingAggregates(sourceBars, bar, currentTimeframe, timeframe);
    const isExtreme = aggregates.some((aggregate) =>
      isRepresentativeExtreme(type, bar, currentTimeframe, sourceBars, aggregate, timeframe)
    );

    return isExtreme ? [`${timeframeToString(timeframe)} ${side}`] : [];
  });
}

export function getPointCanonicalTimestamp(type, bar, currentTimeframe, sourceBars = []) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return bar?.timestamp ?? null;

  const selectedPrice = bar[pdaType.priceField];
  const selectedInterval = getCurrentBarInterval(bar, currentTimeframe);
  const matchingBars = sourceBars.filter((sourceBar) => {
    const sourcePrice = sourceBar[pdaType.priceField];
    return (
      sourceBar.timestamp >= selectedInterval.start &&
      sourceBar.timestamp < selectedInterval.end &&
      Math.abs(sourcePrice - selectedPrice) < PRICE_EPSILON
    );
  });

  return matchingBars[matchingBars.length - 1]?.timestamp ?? bar.timestamp;
}

export function sortContextLabels(contexts) {
  const orderMap = new Map(CONTEXT_LABEL_ORDER.map((label, index) => [label, index]));

  return [...contexts].sort((a, b) => {
    const aOrder = orderMap.has(a.split(' ')[0]) ? orderMap.get(a.split(' ')[0]) : 100;
    const bOrder = orderMap.has(b.split(' ')[0]) ? orderMap.get(b.split(' ')[0]) : 100;
    return aOrder - bOrder;
  });
}

function isTimeframeContextLabel(context) {
  return CONTEXT_LABEL_ORDER.includes(context.split(' ')[0]);
}

export function getSessionLabel(timestamp) {
  const session = findSessionWindow(timestamp);
  return session?.label || null;
}

export function buildPointContexts(type, bar, timeframe, allBars = []) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return [];

  const side = pdaType.priceField === 'high' ? 'high' : 'low';
  const tfLabel = timeframeToString(timeframe);
  const contexts = new Set(timeframe === 1440 ? [`${tfLabel} ${side}`] : []);
  const midnightContext = getMidnightContext(type, bar);
  const sessionExtremaContext = getSessionExtremaContext(type, bar, allBars);
  const htfContexts = getHtfContexts(type, bar, timeframe, allBars);

  htfContexts.forEach((context) => contexts.add(context));

  if (midnightContext) {
    contexts.add(midnightContext);
  }

  if (sessionExtremaContext) {
    contexts.add(sessionExtremaContext);
  }

  return sortContextLabels(contexts);
}

export function formatContextLabel(contexts, maxItems = Infinity) {
  if (!contexts?.length) return '';
  return contexts.slice(0, maxItems).join(' / ');
}

export function formatPrimaryContextLabel(contexts) {
  if (!contexts?.length) return '';

  const timeframeContext = contexts.find(isTimeframeContextLabel);
  const supplementalContexts = contexts.filter((context) => !isTimeframeContextLabel(context));
  return [timeframeContext, ...supplementalContexts].filter(Boolean).join(' / ');
}
