export const DAILY_TIME_REACTION_TIMES = Object.freeze(['09:30', '09:50', '10:00', '10:30']);
export const DEFAULT_FIXED_TIME_STATE_TIMES = Object.freeze(['09:30', '09:50', '10:00', '10:30']);

export const DAILY_TIME_REVIEW_SECTIONS = Object.freeze([
  {
    key: 'weeklyBias',
    label: '周 Bias 分析',
    fallbackTime: '00:00',
  },
  {
    key: 'dailyBias',
    label: '日 Bias 分析',
    fallbackTime: '00:00',
  },
  {
    key: 'pre0930Analysis',
    label: '09:30 前状态分析',
    fallbackTime: '00:00',
    rangeEndTime: '09:30',
  },
  {
    key: 'fixedTimeState',
    label: '固定时点状态',
    fallbackTime: '09:30',
    rangeEndTime: '11:00',
  },
  {
    key: 'summary0930To1100',
    label: '09:30-11:00 Summary',
    fallbackTime: '09:30',
    rangeEndTime: '11:00',
  },
  {
    key: 'fullDaySummary',
    label: '全天 Summary',
    fallbackTime: '00:00',
    rangeEndTime: '16:59',
  },
]);

export const DAILY_TIME_REVIEW_SECTION_KEYS = Object.freeze(
  DAILY_TIME_REVIEW_SECTIONS.map((section) => section.key)
);

export const DAILY_TIME_REACTION_TYPES = Object.freeze({
  OTHER: 'other',
  REVERSAL: 'reversal',
  CONTINUATION: 'continuation',
  SWEEP_REVERSE: 'sweep-reverse',
  NO_TRADE: 'no-trade',
  NOISE: 'noise',
});

export function getDailyTimeReviewSectionDefinition(sectionName) {
  return DAILY_TIME_REVIEW_SECTIONS.find((section) => section.key === sectionName) || null;
}
