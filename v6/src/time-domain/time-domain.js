const MINUTE_SECONDS = 60;
const MINUTE_MS = 60_000;
const UNIX_MILLISECONDS_THRESHOLD = 10_000_000_000;

function fieldLabel(fieldName = 'value') {
  return String(fieldName || 'value');
}

export function normalizeMinuteTimeframe(value, {
  allowSuffix = true,
  fieldName = 'timeframe',
} = {}) {
  const label = fieldLabel(fieldName);
  const normalizedValue = String(value ?? '').trim();
  let minutes;

  if (allowSuffix) {
    const match = normalizedValue.match(/^(\d+)(m)?$/i);
    if (!match) {
      throw new Error(`${label} must be minute-based.`);
    }
    minutes = Number(match[1]);
  } else {
    minutes = Number(value);
  }

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`${label} must be a positive minute value.`);
  }
  return minutes;
}

export function normalizeUnixSeconds(value, { fieldName = 'timestamp' } = {}) {
  const label = fieldLabel(fieldName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value > UNIX_MILLISECONDS_THRESHOLD ? value / 1000 : value);
  }

  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  const normalizedText = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalizedText);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

export function normalizeOptionalUnixSeconds(value, options = {}) {
  if (value === null || value === undefined) return null;
  return normalizeUnixSeconds(value, options);
}

export function normalizeUnixMilliseconds(value, { fieldName = 'time' } = {}) {
  const label = fieldLabel(fieldName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > UNIX_MILLISECONDS_THRESHOLD ? Math.floor(value) : Math.floor(value * 1000);
  }

  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${label} must be a valid date/time.`);
  }
  const normalizedText = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalizedText);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid date/time.`);
  }
  return parsed;
}

export function unixMillisecondsToSeconds(timestampMs, { fieldName = 'timestampMs' } = {}) {
  const label = fieldLabel(fieldName);
  const normalized = Number(timestampMs);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${label} must be a valid millisecond timestamp.`);
  }
  return Math.floor(normalized / 1000);
}

export function toApiMinuteTime(timestampMs) {
  const normalized = normalizeUnixMilliseconds(timestampMs, { fieldName: 'timestampMs' });
  return new Date(normalized).toISOString().slice(0, 16).replace('T', ' ');
}

export function assertDisplayTimeframeMultiple({
  sourceTimeframe,
  targetTimeframe,
  message = 'targetTimeframe must be a multiple of sourceTimeframe.',
} = {}) {
  const source = normalizeMinuteTimeframe(sourceTimeframe, {
    allowSuffix: false,
    fieldName: 'sourceTimeframe',
  });
  const target = normalizeMinuteTimeframe(targetTimeframe, {
    allowSuffix: false,
    fieldName: 'targetTimeframe',
  });
  if (target < source || target % source !== 0) {
    throw new Error(message);
  }
  return Object.freeze({
    expectedSourceBars: target / source,
    source,
    sourceSeconds: source * MINUTE_SECONDS,
    target,
    targetSeconds: target * MINUTE_SECONDS,
  });
}

export function resolveDisplayBucketStart({
  originTimestamp = 0,
  targetTimeframe,
  timestamp,
} = {}) {
  const target = normalizeMinuteTimeframe(targetTimeframe, {
    allowSuffix: false,
    fieldName: 'targetTimeframe',
  });
  const normalizedTimestamp = normalizeUnixSeconds(timestamp, { fieldName: 'timestamp' });
  const origin = normalizeUnixSeconds(originTimestamp, { fieldName: 'originTimestamp' });
  const targetSeconds = target * MINUTE_SECONDS;
  const offset = normalizedTimestamp - origin;
  return origin + (Math.floor(offset / targetSeconds) * targetSeconds);
}

export function summarizeProjectionSource(record) {
  return record ? Object.freeze({
    bucketCount: record.buckets?.length ?? 0,
    owner: 'runtime.chart-data-projection',
    projectionRevision: record.projectionRevision ?? null,
    sourceBarCount: record.sourceBarCount ?? null,
    sourceTimeframe: record.sourceTimeframe ?? null,
    targetTimeframe: record.targetTimeframe ?? null,
  }) : null;
}

export const TIME_DOMAIN_CONSTANTS = Object.freeze({
  MINUTE_MS,
  MINUTE_SECONDS,
});
