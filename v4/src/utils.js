// 通用工具函数

/**
 * 时间输入自动格式化
 * 支持 8 位（YYYYMMDD → YYYY-MM-DD 00:00）或 12 位（YYYYMMDDHHmm → YYYY-MM-DD HH:mm）
 * 无效值保持原样
 */
export function formatTimeInput(value) {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 8) {
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    return `${year}-${month}-${day} 00:00`;
  }

  if (digits.length === 12) {
    const year = digits.substring(0, 4);
    const month = digits.substring(4, 6);
    const day = digits.substring(6, 8);
    const hour = digits.substring(8, 10);
    const minute = digits.substring(10, 12);
    if (parseInt(month) < 1 || parseInt(month) > 12) return value;
    if (parseInt(day) < 1 || parseInt(day) > 31) return value;
    if (parseInt(hour) > 23) return value;
    if (parseInt(minute) > 59) return value;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return value;
}

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function dateKeyFromUtcParts(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return dateKeyFromUtcParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function dateKeyFromTradingDay(value) {
  const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function dateKeyFromInput(value) {
  return dateKeyFromTradingDay(value);
}

export function dateKeyFromBar(bar = {}) {
  return dateKeyFromTradingDay(bar.tradingDay || bar.trading_day) || dateKeyFromTimestamp(bar.timestamp);
}

export function compactUtcTime(timestamp, fallback = '—') {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}
