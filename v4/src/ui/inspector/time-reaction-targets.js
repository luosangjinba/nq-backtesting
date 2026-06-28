import {
  DAILY_TIME_REVIEW_SECTION_KEYS,
  getDailyTimeReviewSectionDefinition,
} from '../../time-reaction/daily-time-review-store.js';
import { getCalendarDateTimestamp } from './calendar-panel.js';

export function getDailyTimeTargetFromElement(actionEl) {
  const section = actionEl.dataset.dailyTimeTargetSection;
  if (section === 'fixedTimeItem') {
    return {
      section: 'fixedTimeItem',
      time: actionEl.dataset.dailyTimeReactionTime || '09:30',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(section)) {
    return { section };
  }
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
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) return target.section;
  return target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
}

export function getDailyTimeDetailSection(target = {}) {
  if (target.section === 'fixedTimeItem') return 'fixedTimeState';
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) return target.section;
  return '';
}

export function getDailyTimeTargetLabel(target = {}) {
  if (target.section === 'fixedTimeItem') return '固定时点状态';
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) return sectionDefinition.label;
  if (target.section === 'reaction') return target.time || 'reaction';
  if (target.section === 'reactionItem') return target.time || 'reaction';
  if (target.section === 'pre0930Item') return 'Pre 09:30 Context';
  if (target.section === 'summaryItem') return '09:30-11:00 Summary';
  if (target.section === 'summary') return '09:30-11:00 Summary';
  return 'Pre 09:30 Context';
}

export function getDailyTimeTargetTime(target = {}) {
  if (target.section === 'fixedTimeItem') return target.time || '09:30';
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) return sectionDefinition.fallbackTime || '09:30';
  if (target.section === 'reaction' || target.section === 'reactionItem') return target.time || '09:30';
  if (target.section === 'summary' || target.section === 'summaryItem') return '11:00';
  return '09:30';
}

export function getDailyTimeLocateRange(date, target = {}) {
  if (target.section === 'fixedTimeItem') {
    const timestamp = getCalendarDateTimestamp(date, getDailyTimeTargetTime(target));
    return { start: timestamp, end: timestamp };
  }
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) {
    return {
      start: getCalendarDateTimestamp(date, sectionDefinition.fallbackTime || '09:30'),
      end: getCalendarDateTimestamp(
        date,
        sectionDefinition.rangeEndTime || sectionDefinition.fallbackTime || '09:30'
      ),
    };
  }
  if (target.section === 'summary' || target.section === 'summaryItem') {
    return {
      start: getCalendarDateTimestamp(date, '09:30'),
      end: getCalendarDateTimestamp(date, '11:00'),
    };
  }
  const timestamp = getCalendarDateTimestamp(date, getDailyTimeTargetTime(target));
  return { start: timestamp, end: timestamp };
}
