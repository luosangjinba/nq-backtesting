import {
  normalizeInstrument,
  parseBarTimeMs,
  formatApiTime,
} from './bar-window.js';
import {
  findTargetTimeframeRecord,
  normalizeTargetTimeframeId,
  targetTimeframeToFixedMinutes,
} from '../time-domain/target-timeframe-domain.js';
import { TIME_DOMAIN_CONSTANTS } from '../time-domain/time-domain.js';

const DEFAULT_MAX_TARGET_BARS_PER_WINDOW = 1000;

function estimateFixedTargetBars(startMs, endMs, targetTimeframeId) {
  const minutes = targetTimeframeToFixedMinutes(targetTimeframeId);
  if (!minutes) return null;
  return Math.floor((endMs - startMs) / (minutes * TIME_DOMAIN_CONSTANTS.MINUTE_MS)) + 1;
}

export function makeTargetBarWindowKey(window) {
  return [
    'target',
    window.instrument,
    window.timeframe,
    window.start,
    window.end,
  ].join('|');
}

export function normalizeTargetBarWindow(payload = {}, options = {}) {
  const maxBarsPerWindow = Number(options.maxBarsPerWindow || DEFAULT_MAX_TARGET_BARS_PER_WINDOW);
  const instrument = normalizeInstrument(payload.instrument);
  const timeframe = normalizeTargetTimeframeId(payload.timeframe, {
    fieldName: 'Target bar data timeframe',
  });
  const startMs = parseBarTimeMs(payload.start, 'target start');
  const endMs = parseBarTimeMs(payload.end, 'target end');

  if (endMs < startMs) {
    throw new Error('Target bar data window end must be after start.');
  }

  const targetRecord = findTargetTimeframeRecord(timeframe);
  const estimatedBars = estimateFixedTargetBars(startMs, endMs, timeframe);
  if (estimatedBars !== null && estimatedBars > maxBarsPerWindow) {
    throw new Error(`Target bar data window estimates ${estimatedBars} bars, limit ${maxBarsPerWindow}.`);
  }

  return {
    bounded: true,
    bucketType: targetRecord.bucketType,
    dataKind: 'target-display',
    end: formatApiTime(endMs),
    estimatedBars,
    instrument,
    start: formatApiTime(startMs),
    timeframe,
  };
}

export function targetWindowBoundsMs(window) {
  return {
    endMs: parseBarTimeMs(window.end, 'target end'),
    startMs: parseBarTimeMs(window.start, 'target start'),
  };
}

export function targetWindowCovers(record, planned) {
  if (!record || !planned) return false;
  if (record.instrument !== planned.instrument) return false;
  if (record.timeframe !== planned.timeframe) return false;

  const recordBounds = targetWindowBoundsMs(record);
  const plannedBounds = targetWindowBoundsMs(planned);
  return recordBounds.startMs <= plannedBounds.startMs && recordBounds.endMs >= plannedBounds.endMs;
}
