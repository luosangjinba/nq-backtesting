import { getCalendarDateTimestamp } from './calendar-panel.js';

let pendingDailyTimeRefPick = null;

export function getPendingDailyTimeRefPick() {
  return pendingDailyTimeRefPick;
}

export function setPendingDailyTimeRefPick(nextPick) {
  pendingDailyTimeRefPick = nextPick || null;
  return pendingDailyTimeRefPick;
}

export function clearPendingDailyTimeRefPick() {
  pendingDailyTimeRefPick = null;
}

export function hasPendingDailyTimeRefPick() {
  return Boolean(pendingDailyTimeRefPick);
}

export function getDailyTimeTargetFromElement(actionEl) {
  const section = actionEl.dataset.dailyTimeTargetSection;
  if (section === 'reaction') {
    return {
      section: 'reaction',
      time: actionEl.dataset.dailyTimeReactionTime || '09:30',
    };
  }
  if (section === 'reactionItem') {
    return {
      section: 'reactionItem',
      time: actionEl.dataset.dailyTimeReactionTime || '09:30',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'pre0930Item') {
    return {
      section: 'pre0930Item',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'summaryItem') {
    return {
      section: 'summaryItem',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'summary0930To1100') return { section: 'summary' };
  return { section: 'pre0930Context' };
}

export function getDailyTimeTargetKey(target = {}) {
  return [
    target.section || '',
    target.itemId || '',
    target.time || '',
  ].join(':');
}

export function getDailyTimeSectionName(target = {}) {
  return target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
}

export function getDailyTimeTargetLabel(target = {}) {
  if (target.section === 'reaction') return target.time || 'reaction';
  if (target.section === 'reactionItem') return target.time || 'reaction';
  if (target.section === 'pre0930Item') return 'Pre 09:30 Context';
  if (target.section === 'summaryItem') return '09:30-11:00 Summary';
  if (target.section === 'summary') return '09:30-11:00 Summary';
  return 'Pre 09:30 Context';
}

export function getDailyTimeTargetTime(target = {}) {
  if (target.section === 'reaction' || target.section === 'reactionItem') return target.time || '09:30';
  if (target.section === 'summary' || target.section === 'summaryItem') return '11:00';
  return '09:30';
}

export function getDailyTimeLocateRange(date, target = {}) {
  if (target.section === 'summary' || target.section === 'summaryItem') {
    return {
      start: getCalendarDateTimestamp(date, '09:30'),
      end: getCalendarDateTimestamp(date, '11:00'),
    };
  }
  const timestamp = getCalendarDateTimestamp(date, getDailyTimeTargetTime(target));
  return { start: timestamp, end: timestamp };
}

export function asTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function timestampRangeFromValues(values = []) {
  const timestamps = values.map(asTimestamp).filter((value) => value !== null);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

export function getTimeframeFromLabel(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) return text;
  if (text === '1m') return '1';
  if (text === '5m') return '5';
  if (text === '15m') return '15';
  if (text === '30m') return '30';
  if (text === '1h') return '60';
  if (text === '4h') return '240';
  if (text === 'd' || text === '1d' || text === 'daily') return '1440';
  return null;
}

export function getRefTimeframe(ref = {}, fallback = null) {
  return getTimeframeFromLabel(ref.sourceTimeframe)
    || getTimeframeFromLabel(ref.sourceTimeframeLabel)
    || getTimeframeFromLabel(ref.timeframe)
    || fallback;
}
