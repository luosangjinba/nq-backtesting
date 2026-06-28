import { normalizeLinkedObjectRef } from '../order/order-review-store.js';
import {
  DAILY_TIME_REACTION_TIMES,
  DAILY_TIME_REACTION_TYPES,
  DEFAULT_FIXED_TIME_STATE_TIMES,
  getDailyTimeReviewSectionDefinition,
} from './daily-time-review-types.js';

const VALID_REACTION_TYPES = new Set(Object.values(DAILY_TIME_REACTION_TYPES));
const VALID_CHARTS = new Set(['primary', 'comparison-window']);
const VALID_TIMEFRAMES = new Set(['1', '5', '15', '30', '60', '240', '1440']);

export function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function normalizeDateKey(value) {
  const text = normalizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

export function getWeekStartDateKey(value) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = date.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function isWeekStartDateKey(value) {
  const dateKey = normalizeDateKey(value);
  return Boolean(dateKey && getWeekStartDateKey(dateKey) === dateKey);
}

export function normalizeTimeText(value, fallback = '09:30') {
  const text = normalizeString(value);
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeTimestamp(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeTimeframe(value, fallback = '1') {
  const text = normalizeString(value, fallback).toLowerCase().replace(/m$/, '').replace('1h', '60').replace('4h', '240').replace('d', '1440');
  return VALID_TIMEFRAMES.has(text) ? text : fallback;
}

function normalizeChart(value) {
  const text = normalizeString(value, 'primary');
  if (text === 'secondary') return 'comparison-window';
  return VALID_CHARTS.has(text) ? text : 'primary';
}

function normalizeRefs(refs = []) {
  return Array.isArray(refs) ? refs.map(normalizeLinkedObjectRef).filter(Boolean) : [];
}

function normalizeSection(input = {}, dateKey = '', fallbackTime = '09:30') {
  return {
    note: normalizeString(input.note),
    refs: normalizeRefs(input.refs),
    locate: normalizeLocate(input.locate, dateKey, fallbackTime),
  };
}

function normalizeBias(input = {}, legacySections = {}) {
  const dailyBiasPrediction = normalizeString(
    input.dailyBiasPrediction,
    normalizeString(input.dailyBias, normalizeString(legacySections.dailyBias?.note))
  );
  const weeklyBiasPrediction = normalizeString(
    input.weeklyBiasPrediction,
    normalizeString(input.weeklyBias, normalizeString(legacySections.weeklyBias?.note))
  );
  return {
    dailyBiasPrediction,
    dailyBiasReview: normalizeString(input.dailyBiasReview, normalizeString(input.biasReview)),
    weeklyBiasPrediction,
    weeklyBiasReview: normalizeString(input.weeklyBiasReview),
    weeklyBias: weeklyBiasPrediction,
    dailyBias: dailyBiasPrediction,
    biasReview: normalizeString(input.biasReview),
  };
}

function normalizeOpeningThesisReview(input = {}, legacySections = {}) {
  return {
    preOpenThesis: normalizeString(input.preOpenThesis, normalizeString(legacySections.pre0930Analysis?.note)),
    morningSummary0930To1100: normalizeString(
      input.morningSummary0930To1100,
      normalizeString(legacySections.summary0930To1100?.note)
    ),
    fullDaySummary: normalizeString(input.fullDaySummary, normalizeString(legacySections.fullDaySummary?.note)),
    thesisReview: normalizeString(input.thesisReview),
  };
}

function normalizeReviewSection(sectionName, input = {}, dateKey = '') {
  const definition = getDailyTimeReviewSectionDefinition(sectionName);
  return normalizeSection(input, dateKey, definition?.fallbackTime || '09:30');
}

export function makeContextItemId() {
  return `context_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeContextItem(input = {}, dateKey = '', fallbackTime = '09:30') {
  return {
    id: normalizeString(input.id, makeContextItemId()),
    note: normalizeString(input.note),
    refs: normalizeRefs(input.refs),
    locate: normalizeLocate(input.locate, dateKey, fallbackTime),
  };
}

function normalizeContextItems(input = {}, dateKey = '') {
  const explicitItems = Array.isArray(input.items)
    ? input.items.map((item) => normalizeContextItem(item, dateKey)).filter((item) => item.id)
    : [];
  if (explicitItems.length) return explicitItems;
  if (input.note || (Array.isArray(input.refs) && input.refs.length)) {
    return [normalizeContextItem({
      id: 'context_1',
      note: input.note,
      refs: input.refs,
      locate: input.locate,
    }, dateKey)];
  }
  return [normalizeContextItem({ id: 'context_1' }, dateKey)];
}

function normalizeObservationItems(input = {}, dateKey = '', fallbackTime = '09:30', fallbackId = 'event_1') {
  const explicitItems = Array.isArray(input.items)
    ? input.items.map((item) => normalizeContextItem(item, dateKey, fallbackTime)).filter((item) => item.id)
    : [];
  if (explicitItems.length) return explicitItems;
  if (input.note || (Array.isArray(input.refs) && input.refs.length)) {
    return [normalizeContextItem({
      id: fallbackId,
      note: input.note,
      refs: input.refs,
      locate: input.locate,
    }, dateKey, fallbackTime)];
  }
  return [normalizeContextItem({ id: fallbackId }, dateKey, fallbackTime)];
}

function normalizePre0930Context(input = {}, dateKey = '') {
  return {
    note: '',
    refs: [],
    locate: normalizeLocate(input.locate, dateKey, '09:30'),
    items: normalizeContextItems(input, dateKey),
  };
}

function getTimestampForDateTime(dateKey, timeText) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [hour, minute] = String(timeText || '').split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute, 0) / 1000);
}

function normalizeLocate(input = {}, dateKey, timeText, fallbackTimeframe = '1') {
  const timestamp = normalizeTimestamp(input.timestamp, getTimestampForDateTime(dateKey, timeText));
  return {
    timestamp,
    timeframe: normalizeTimeframe(input.timeframe, fallbackTimeframe),
    chart: normalizeChart(input.chart),
  };
}

function normalizeReaction(input = {}, dateKey, fallbackTime = '09:30') {
  const time = normalizeTimeText(input.time, fallbackTime);
  const reactionType = VALID_REACTION_TYPES.has(input.reactionType)
    ? input.reactionType
    : DAILY_TIME_REACTION_TYPES.OTHER;
  return {
    time,
    reactionType,
    note: normalizeString(input.note),
    refs: normalizeRefs(input.refs),
    locate: normalizeLocate(input.locate, dateKey, time),
    items: normalizeObservationItems(input, dateKey, time),
  };
}

function normalizeReactions(input = [], dateKey) {
  const byTime = new Map();
  (Array.isArray(input) ? input : []).forEach((reaction) => {
    const normalized = normalizeReaction(reaction, dateKey);
    byTime.set(normalized.time, normalized);
  });
  return DAILY_TIME_REACTION_TIMES.map((time) => byTime.get(time) || normalizeReaction({ time }, dateKey, time));
}

function refsHaveContent(refs = []) {
  return Array.isArray(refs) && refs.length > 0;
}

function reactionHasContent(reaction = {}) {
  if (normalizeString(reaction.note)) return true;
  if (refsHaveContent(reaction.refs)) return true;
  return Array.isArray(reaction.items)
    && reaction.items.some((item) => normalizeString(item.note) || refsHaveContent(item.refs));
}

function normalizeFixedTimeState(input = {}, reactions = [], dateKey = '') {
  const normalized = normalizeReviewSection('fixedTimeState', input, dateKey);
  return {
    ...normalized,
    note: '',
    refs: [],
    items: normalizeFixedTimeItems(input, reactions, dateKey),
  };
}

export function normalizeFixedTimeItem(input = {}, dateKey = '', fallbackTime = '09:30') {
  const time = normalizeTimeText(input.time, fallbackTime);
  return {
    id: normalizeString(input.id, makeContextItemId()),
    time,
    note: normalizeString(input.note),
    refs: normalizeRefs(input.refs),
    locate: normalizeLocate(input.locate, dateKey, time, '1'),
  };
}

function normalizeFixedTimeItems(input = {}, reactions = [], dateKey = '') {
  const legacyNote = normalizeString(input.note);
  const legacyRefs = normalizeRefs(input.refs);
  const explicitItems = Array.isArray(input.items)
    ? input.items
        .map((item, index) => normalizeFixedTimeItem(item, dateKey, DEFAULT_FIXED_TIME_STATE_TIMES[index] || '09:30'))
        .filter((item) => item.id)
    : [];
  if (explicitItems.length) {
    if (!legacyNote && !legacyRefs.length) return explicitItems;
    return explicitItems.map((item, index) => (
      index === 0
        ? {
            ...item,
            note: item.note || legacyNote,
            refs: [...legacyRefs, ...(item.refs || [])],
          }
        : item
    ));
  }

  const reactionItems = (Array.isArray(reactions) ? reactions.filter(reactionHasContent) : [])
    .map((reaction) => normalizeFixedTimeItem({
      id: `fixed_${normalizeTimeText(reaction.time).replace(':', '')}`,
      time: reaction.time,
      note: [
        normalizeString(reaction.note),
        ...(Array.isArray(reaction.items) ? reaction.items.map((item) => normalizeString(item.note)).filter(Boolean) : []),
      ].filter(Boolean).join(' / '),
      refs: [
        ...(Array.isArray(reaction.refs) ? reaction.refs : []),
        ...(Array.isArray(reaction.items) ? reaction.items.flatMap((item) => item.refs || []) : []),
      ],
      locate: reaction.locate,
    }, dateKey, reaction.time))
    .filter((item) => item.id);
  if (reactionItems.length) return reactionItems;

  return DEFAULT_FIXED_TIME_STATE_TIMES.map((time, index) => normalizeFixedTimeItem({
    id: `fixed_${time.replace(':', '')}`,
    time,
    note: index === 0 ? legacyNote : '',
    refs: index === 0 ? legacyRefs : [],
  }, dateKey, time));
}

export function normalizeDailyTimeReview(input = {}, options = {}) {
  const now = Date.now();
  const date = normalizeDateKey(input.date);
  const instrument = normalizeString(input.instrument, 'NQ');
  const id = options.preserveId && input.id
    ? normalizeString(input.id)
    : `daily_time_review_${instrument}_${date || now}`;
  return {
    id,
    date,
    instrument,
    source: normalizeString(input.source, 'manual'),
    createdAt: normalizeTimestamp(input.createdAt, now),
    updatedAt: options.preserveUpdatedAt ? normalizeTimestamp(input.updatedAt, now) : now,
    weeklyBias: normalizeReviewSection('weeklyBias', input.weeklyBias, date),
    dailyBias: normalizeReviewSection('dailyBias', input.dailyBias, date),
    bias: normalizeBias(input.bias, {
      weeklyBias: input.weeklyBias,
      dailyBias: input.dailyBias,
    }),
    fixedTimeState: normalizeFixedTimeState(input.fixedTimeState, input.reactions, date),
    pre0930Analysis: normalizeReviewSection('pre0930Analysis', input.pre0930Analysis || input.pre0930Context, date),
    openingThesisReview: normalizeOpeningThesisReview(input.openingThesisReview, {
      pre0930Analysis: input.pre0930Analysis || input.pre0930Context,
      summary0930To1100: input.summary0930To1100,
      fullDaySummary: input.fullDaySummary,
    }),
    pre0930Context: normalizePre0930Context(input.pre0930Context, date),
    reactions: normalizeReactions(input.reactions, date),
    summary0930To1100: {
      ...normalizeReviewSection('summary0930To1100', input.summary0930To1100, date),
      items: normalizeObservationItems(input.summary0930To1100, date, '11:00', 'summary_1'),
    },
    fullDaySummary: normalizeReviewSection('fullDaySummary', input.fullDaySummary, date),
  };
}
