const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const LOAD_RANGE_LIMITS_DAYS = Object.freeze({
  1: 45,
  5: 90,
  15: 180,
  60: 730,
  240: 1460,
  1440: 3650,
});

function parseDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const timestamp = Date.UTC(year, monthIndex, day, hour, minute);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function getLoadRangeLimitDays(timeframe) {
  const tf = Number(timeframe);
  return LOAD_RANGE_LIMITS_DAYS[tf] || 365;
}

export function resolveChartLoadRange(start, end, timeframe) {
  const validation = validateSingleWindowRange(start, end, timeframe);
  if (validation.ok) {
    return {
      ok: true,
      windowed: false,
      start,
      end,
      outerRange: null,
      message: '',
    };
  }

  const tf = Number(timeframe);
  if (tf !== 1 || validation.days === null) {
    return {
      ok: false,
      windowed: false,
      start,
      end,
      outerRange: null,
      message: validation.message,
    };
  }

  const startMs = parseDateTime(start);
  const endMs = parseDateTime(end);
  if (startMs === null || endMs === null || endMs < startMs) {
    return {
      ok: false,
      windowed: false,
      start,
      end,
      outerRange: null,
      message: validation.message,
    };
  }

  const limitMs = validation.limitDays * DAY_MS;
  const windowEndMs = Math.min(endMs, startMs + limitMs);
  const windowStart = formatDateTime(startMs);
  const windowEnd = formatDateTime(windowEndMs);
  return {
    ok: true,
    windowed: true,
    start: windowStart,
    end: windowEnd,
    outerRange: { start, end, timeframe: tf },
    message: `1m 长区间已进入窗口模式：当前加载 ${windowStart} - ${windowEnd}，外层范围 ${start} - ${end}`,
  };
}

export function getRangeDays(start, end) {
  const startMs = parseDateTime(start);
  const endMs = parseDateTime(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return (endMs - startMs) / DAY_MS;
}

export function validateSingleWindowRange(start, end, timeframe) {
  const days = getRangeDays(start, end);
  if (days === null) {
    return {
      ok: false,
      days: null,
      limitDays: getLoadRangeLimitDays(timeframe),
      message: '加载区间无效，请检查开始和结束时间',
    };
  }

  const limitDays = getLoadRangeLimitDays(timeframe);
  if (days <= limitDays) {
    return { ok: true, days, limitDays, message: '' };
  }

  const tfLabel = Number(timeframe) === 1 ? '1m' : `${timeframe}m`;
  return {
    ok: false,
    days,
    limitDays,
    message: `${tfLabel} 单次图表窗口最多加载 ${limitDays} 天；请缩小窗口或等待窗口模式接管长期区间`,
  };
}
