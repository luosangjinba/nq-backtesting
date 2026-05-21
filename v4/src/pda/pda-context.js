// Realtime context tags for manually selected PDA points.

import { timeframeToString } from '../config.js';
import { getPdaType } from './pda-types.js';

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

  if (Math.abs(selectedPrice - extremePrice) < 0.0000001) {
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

export function getSessionLabel(timestamp) {
  const session = findSessionWindow(timestamp);
  return session?.label || null;
}

export function buildPointContexts(type, bar, timeframe, allBars = []) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return [];

  const side = pdaType.priceField === 'high' ? 'high' : 'low';
  const tfLabel = timeframeToString(timeframe);
  const contexts = [`${tfLabel} ${side}`];
  const midnightContext = getMidnightContext(type, bar);
  const sessionExtremaContext = getSessionExtremaContext(type, bar, allBars);

  if (midnightContext) {
    contexts.push(midnightContext);
  }

  if (sessionExtremaContext) {
    contexts.push(sessionExtremaContext);
  }

  return contexts;
}

export function formatContextLabel(contexts, maxItems = 2) {
  if (!contexts?.length) return '';
  return contexts.slice(0, maxItems).join(' / ');
}
