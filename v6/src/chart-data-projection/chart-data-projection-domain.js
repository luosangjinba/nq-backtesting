const MINUTE_SECONDS = 60;

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Chart data projection ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeFiniteNumber(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`Chart data projection bar ${fieldName} must be finite.`);
  }
  return normalized;
}

function normalizeTimestamp(value, fieldName = 'timestamp') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value > 10_000_000_000 ? value / 1000 : value);
  }

  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`Chart data projection ${fieldName} must be a valid timestamp.`);
  }
  const normalizedText = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalizedText);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Chart data projection ${fieldName} must be a valid timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

function normalizeOptionalTimestamp(value, fieldName) {
  if (value === null || value === undefined) return null;
  return normalizeTimestamp(value, fieldName);
}

function normalizeProjectionBar(rawBar) {
  if (!rawBar || typeof rawBar !== 'object') {
    throw new Error('Chart data projection bar must be an object.');
  }
  return {
    close: normalizeFiniteNumber(rawBar.close, 'close'),
    high: normalizeFiniteNumber(rawBar.high, 'high'),
    low: normalizeFiniteNumber(rawBar.low, 'low'),
    open: normalizeFiniteNumber(rawBar.open, 'open'),
    timestamp: normalizeTimestamp(rawBar.timestamp ?? rawBar.time, 'bar timestamp'),
  };
}

function mergeDuplicateTimestamp(existing, bar) {
  return {
    close: bar.close,
    high: Math.max(existing.high, bar.high),
    low: Math.min(existing.low, bar.low),
    open: existing.open,
    timestamp: existing.timestamp,
  };
}

export function normalizeProjectionBars(rawBars = []) {
  if (!Array.isArray(rawBars)) {
    throw new Error('Chart data projection bars must be an array.');
  }

  const byTimestamp = new Map();
  rawBars
    .map(normalizeProjectionBar)
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((bar) => {
      const existing = byTimestamp.get(bar.timestamp);
      byTimestamp.set(
        bar.timestamp,
        existing ? mergeDuplicateTimestamp(existing, bar) : bar,
      );
    });

  return Object.freeze([...byTimestamp.values()]);
}

function resolveBucketStart(timestamp, targetSeconds, originTimestamp) {
  const offset = timestamp - originTimestamp;
  return originTimestamp + (Math.floor(offset / targetSeconds) * targetSeconds);
}

function buildProjectedBar(bucket) {
  return Object.freeze({
    close: bucket.close,
    high: bucket.high,
    low: bucket.low,
    open: bucket.open,
    timestamp: bucket.timestamp,
  });
}

function buildBucketMetadata({
  bucket,
  cursorTimestamp,
  expectedSourceBars,
  sourceSeconds,
  targetSeconds,
}) {
  const bucketEndTimestamp = bucket.timestamp + targetSeconds - sourceSeconds;
  const cursorInBucket = cursorTimestamp !== null
    && cursorTimestamp >= bucket.timestamp
    && cursorTimestamp < bucket.timestamp + targetSeconds;
  const complete = bucket.sourceCount >= expectedSourceBars
    && bucket.lastSourceTimestamp >= bucketEndTimestamp
    && !cursorInBucket;

  return Object.freeze({
    bucketEndTimestamp,
    bucketStartTimestamp: bucket.timestamp,
    complete,
    cursorCapped: cursorInBucket,
    expectedSourceBars,
    firstSourceTimestamp: bucket.firstSourceTimestamp,
    inProgress: !complete,
    lastSourceTimestamp: bucket.lastSourceTimestamp,
    sourceCount: bucket.sourceCount,
  });
}

export function projectSourceBarsToChartData({
  bars = [],
  cursorTimestamp = null,
  sessionStartTimestamp = null,
  sourceTimeframe = 1,
  targetTimeframe = 1,
} = {}) {
  const source = normalizePositiveInteger(sourceTimeframe, 'sourceTimeframe');
  const target = normalizePositiveInteger(targetTimeframe, 'targetTimeframe');
  if (target < source || target % source !== 0) {
    throw new Error('Chart data projection targetTimeframe must be a multiple of sourceTimeframe.');
  }

  const cursor = normalizeOptionalTimestamp(cursorTimestamp, 'cursorTimestamp');
  const sourceSeconds = source * MINUTE_SECONDS;
  const targetSeconds = target * MINUTE_SECONDS;
  const expectedSourceBars = target / source;
  const normalizedBars = normalizeProjectionBars(bars)
    .filter((bar) => cursor === null || bar.timestamp <= cursor);
  const origin = normalizeOptionalTimestamp(sessionStartTimestamp, 'sessionStartTimestamp')
    ?? normalizedBars[0]?.timestamp
    ?? 0;
  const buckets = new Map();

  normalizedBars.forEach((bar) => {
    const timestamp = target === source
      ? bar.timestamp
      : resolveBucketStart(bar.timestamp, targetSeconds, origin);
    const existing = buckets.get(timestamp);
    if (!existing) {
      buckets.set(timestamp, {
        close: bar.close,
        firstSourceTimestamp: bar.timestamp,
        high: bar.high,
        lastSourceTimestamp: bar.timestamp,
        low: bar.low,
        open: bar.open,
        sourceCount: 1,
        timestamp,
      });
      return;
    }
    existing.close = bar.close;
    existing.high = Math.max(existing.high, bar.high);
    existing.lastSourceTimestamp = bar.timestamp;
    existing.low = Math.min(existing.low, bar.low);
    existing.sourceCount += 1;
  });

  const sortedBuckets = [...buckets.values()].sort((left, right) => left.timestamp - right.timestamp);
  return Object.freeze({
    bars: Object.freeze(sortedBuckets.map(buildProjectedBar)),
    buckets: Object.freeze(sortedBuckets.map((bucket) => buildBucketMetadata({
      bucket,
      cursorTimestamp: cursor,
      expectedSourceBars,
      sourceSeconds,
      targetSeconds,
    }))),
    sourceTimeframe: source,
    targetTimeframe: target,
  });
}
