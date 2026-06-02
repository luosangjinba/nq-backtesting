import * as bus from '../event-bus.js';
import { normalizeLinkedObjectRef } from '../order/order-review-store.js';

export const DAILY_TIME_REACTION_TIMES = Object.freeze(['09:30', '09:50', '10:00', '10:30']);

export const DAILY_TIME_REACTION_TYPES = Object.freeze({
  OTHER: 'other',
  REVERSAL: 'reversal',
  CONTINUATION: 'continuation',
  SWEEP_REVERSE: 'sweep-reverse',
  NO_TRADE: 'no-trade',
  NOISE: 'noise',
});

const VALID_REACTION_TYPES = new Set(Object.values(DAILY_TIME_REACTION_TYPES));
const VALID_CHARTS = new Set(['primary', 'secondary']);
const VALID_TIMEFRAMES = new Set(['1', '5', '15', '30', '60', '240', '1440']);

let dailyTimeReviews = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitChanged(reason, review = null) {
  bus.emit('daily-time-review:changed', {
    reason,
    review: clone(review),
    dailyTimeReviews: getDailyTimeReviews(),
  });
}

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeDateKey(value) {
  const text = normalizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeTimeText(value, fallback = '09:30') {
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

function makeContextItemId() {
  return `context_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeContextItem(input = {}, dateKey = '', fallbackTime = '09:30') {
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

function normalizeLocate(input = {}, dateKey, timeText) {
  const timestamp = normalizeTimestamp(input.timestamp, getTimestampForDateTime(dateKey, timeText));
  return {
    timestamp,
    timeframe: normalizeTimeframe(input.timeframe),
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

export function getDailyTimeReviewIdentity(review = {}) {
  return `${review.instrument || 'NQ'}:${review.date || ''}`;
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
    pre0930Context: normalizePre0930Context(input.pre0930Context, date),
    reactions: normalizeReactions(input.reactions, date),
    summary0930To1100: {
      ...normalizeSection(input.summary0930To1100, date, '11:00'),
      note: '',
      refs: [],
      items: normalizeObservationItems(input.summary0930To1100, date, '11:00', 'summary_1'),
    },
  };
}

function ensureUniqueReviewId(review, reviews = dailyTimeReviews) {
  if (!reviews.some((candidate) => candidate.id === review.id)) return review;
  let index = 2;
  let nextId = `${review.id}-${index}`;
  while (reviews.some((candidate) => candidate.id === nextId)) {
    index += 1;
    nextId = `${review.id}-${index}`;
  }
  return { ...review, id: nextId };
}

function findReviewIndex(date, instrument = 'NQ') {
  return dailyTimeReviews.findIndex((review) => review.date === date && review.instrument === instrument);
}

export function getDailyTimeReviews() {
  return dailyTimeReviews.map(clone);
}

export function getDailyTimeReviewByDate(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  return clone(dailyTimeReviews.find((review) => review.date === dateKey && review.instrument === instrument) || null);
}

export function getOrCreateDailyTimeReview(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  if (!dateKey) return null;
  const existing = getDailyTimeReviewByDate(dateKey, instrument);
  if (existing) return existing;
  const normalized = ensureUniqueReviewId(normalizeDailyTimeReview({ date: dateKey, instrument }));
  dailyTimeReviews = [...dailyTimeReviews, normalized];
  emitChanged('add', normalized);
  return clone(normalized);
}

export function updateDailyTimeReviewSection(date, sectionName, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review || !['pre0930Context', 'summary0930To1100'].includes(sectionName)) return null;
  return updateDailyTimeReview(review.id, {
    [sectionName]: {
      ...(review[sectionName] || {}),
      ...patch,
    },
  });
}

export function addDailyTimeContextItem(date, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  const item = normalizeContextItem({ id: makeContextItemId(), ...patch }, review.date);
  return updateDailyTimeReview(review.id, {
    pre0930Context: {
      ...(review.pre0930Context || {}),
      items: [...(review.pre0930Context?.items || []), item],
    },
  });
}

export function updateDailyTimeContextItem(date, itemId, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  return updateDailyTimeReview(review.id, {
    pre0930Context: {
      ...(review.pre0930Context || {}),
      items: (review.pre0930Context?.items || []).map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    },
  });
}

export function removeDailyTimeContextItem(date, itemId, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  const items = (review.pre0930Context?.items || []).filter((item) => item.id !== id);
  return updateDailyTimeReview(review.id, {
    pre0930Context: {
      ...(review.pre0930Context || {}),
      items: items.length ? items : [normalizeContextItem({ id: 'context_1' }, review.date)],
    },
  });
}

export function addDailyTimeReactionItem(date, time, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  const targetTime = normalizeTimeText(time);
  return updateDailyTimeReview(review.id, {
    reactions: review.reactions.map((reaction) => (
      reaction.time === targetTime
        ? {
            ...reaction,
            items: [
              ...(reaction.items || []),
              normalizeContextItem({ id: makeContextItemId(), ...patch }, review.date, targetTime),
            ],
          }
        : reaction
    )),
  });
}

export function updateDailyTimeReactionItem(date, time, itemId, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const targetTime = normalizeTimeText(time);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  return updateDailyTimeReview(review.id, {
    reactions: review.reactions.map((reaction) => (
      reaction.time === targetTime
        ? {
            ...reaction,
            items: (reaction.items || []).map((item) => (
              item.id === id ? { ...item, ...patch } : item
            )),
          }
        : reaction
    )),
  });
}

export function removeDailyTimeReactionItem(date, time, itemId, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const targetTime = normalizeTimeText(time);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  return updateDailyTimeReview(review.id, {
    reactions: review.reactions.map((reaction) => {
      if (reaction.time !== targetTime) return reaction;
      const items = (reaction.items || []).filter((item) => item.id !== id);
      return {
        ...reaction,
        items: items.length ? items : [normalizeContextItem({ id: 'event_1' }, review.date, targetTime)],
      };
    }),
  });
}

export function addDailyTimeSummaryItem(date, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  return updateDailyTimeReview(review.id, {
    summary0930To1100: {
      ...(review.summary0930To1100 || {}),
      items: [
        ...(review.summary0930To1100?.items || []),
        normalizeContextItem({ id: makeContextItemId(), ...patch }, review.date, '11:00'),
      ],
    },
  });
}

export function updateDailyTimeSummaryItem(date, itemId, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  return updateDailyTimeReview(review.id, {
    summary0930To1100: {
      ...(review.summary0930To1100 || {}),
      items: (review.summary0930To1100?.items || []).map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    },
  });
}

export function removeDailyTimeSummaryItem(date, itemId, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  const items = (review.summary0930To1100?.items || []).filter((item) => item.id !== id);
  return updateDailyTimeReview(review.id, {
    summary0930To1100: {
      ...(review.summary0930To1100 || {}),
      items: items.length ? items : [normalizeContextItem({ id: 'summary_1' }, review.date, '11:00')],
    },
  });
}

export function updateDailyTimeReaction(date, time, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  const targetTime = normalizeTimeText(time);
  return updateDailyTimeReview(review.id, {
    reactions: review.reactions.map((reaction) => (
      reaction.time === targetTime ? { ...reaction, ...patch } : reaction
    )),
  });
}

export function updateDailyTimeReview(id, patch = {}, options = {}) {
  const normalizedId = normalizeString(id);
  if (!normalizedId) return null;
  let updated = null;
  dailyTimeReviews = dailyTimeReviews.map((review) => {
    if (review.id !== normalizedId) return review;
    updated = normalizeDailyTimeReview(
      {
        ...review,
        ...patch,
        id: review.id,
        createdAt: review.createdAt,
        updatedAt: Date.now(),
      },
      { preserveId: true, preserveUpdatedAt: options.preserveUpdatedAt }
    );
    return updated;
  });
  if (updated) emitChanged('update', updated);
  return clone(updated);
}

function getSectionRefs(review, target = {}) {
  if (target.section === 'reaction') {
    const reaction = review.reactions.find((item) => item.time === normalizeTimeText(target.time));
    return Array.isArray(reaction?.refs) ? reaction.refs : [];
  }
  if (target.section === 'reactionItem') {
    const reaction = review.reactions.find((item) => item.time === normalizeTimeText(target.time));
    const item = (reaction?.items || []).find((candidate) => candidate.id === normalizeString(target.itemId));
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  if (target.section === 'pre0930Item') {
    const item = (review.pre0930Context?.items || []).find((candidate) => candidate.id === normalizeString(target.itemId));
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  if (target.section === 'summaryItem') {
    const item = (review.summary0930To1100?.items || []).find((candidate) => candidate.id === normalizeString(target.itemId));
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  const sectionName = target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
  return Array.isArray(review[sectionName]?.refs) ? review[sectionName].refs : [];
}

function updateSectionRefs(review, target = {}, refs = []) {
  if (target.section === 'reaction') {
    const time = normalizeTimeText(target.time);
    return {
      reactions: review.reactions.map((reaction) => (
        reaction.time === time ? { ...reaction, refs } : reaction
      )),
    };
  }
  if (target.section === 'reactionItem') {
    const time = normalizeTimeText(target.time);
    const itemId = normalizeString(target.itemId);
    return {
      reactions: review.reactions.map((reaction) => (
        reaction.time === time
          ? {
              ...reaction,
              items: (reaction.items || []).map((item) => (
                item.id === itemId ? { ...item, refs } : item
              )),
            }
          : reaction
      )),
    };
  }
  if (target.section === 'pre0930Item') {
    const itemId = normalizeString(target.itemId);
    return {
      pre0930Context: {
        ...(review.pre0930Context || {}),
        items: (review.pre0930Context?.items || []).map((item) => (
          item.id === itemId ? { ...item, refs } : item
        )),
      },
    };
  }
  if (target.section === 'summaryItem') {
    const itemId = normalizeString(target.itemId);
    return {
      summary0930To1100: {
        ...(review.summary0930To1100 || {}),
        items: (review.summary0930To1100?.items || []).map((item) => (
          item.id === itemId ? { ...item, refs } : item
        )),
      },
    };
  }
  const sectionName = target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
  return {
    [sectionName]: {
      ...(review[sectionName] || {}),
      refs,
    },
  };
}

export function addDailyTimeReviewRef(date, target = {}, ref = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const normalizedRef = normalizeLinkedObjectRef(ref);
  if (!review || !normalizedRef) return null;
  const refs = [...getSectionRefs(review, target), normalizedRef];
  return updateDailyTimeReview(review.id, updateSectionRefs(review, target, refs));
}

export function removeDailyTimeReviewRef(date, target = {}, refIndex, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  const index = Number(refIndex);
  if (!Number.isInteger(index) || index < 0) return null;
  const refs = getSectionRefs(review, target).filter((_, itemIndex) => itemIndex !== index);
  return updateDailyTimeReview(review.id, updateSectionRefs(review, target, refs));
}

export function deleteDailyTimeReview(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  const index = findReviewIndex(dateKey, instrument);
  if (index < 0) return false;
  dailyTimeReviews = dailyTimeReviews.filter((_, itemIndex) => itemIndex !== index);
  emitChanged('delete');
  return true;
}

export function loadDailyTimeReviews(nextReviews = [], options = {}) {
  const normalizedReviews = [];
  if (Array.isArray(nextReviews)) {
    nextReviews.forEach((review) => {
      const normalized = normalizeDailyTimeReview(review, {
        preserveId: true,
        preserveUpdatedAt: options.preserveUpdatedAt,
      });
      if (!normalized.date) return;
      const duplicateIndex = normalizedReviews.findIndex(
        (item) => item.date === normalized.date && item.instrument === normalized.instrument
      );
      if (duplicateIndex >= 0) {
        normalizedReviews[duplicateIndex] = normalized;
      } else {
        normalizedReviews.push(ensureUniqueReviewId(normalized, normalizedReviews));
      }
    });
  }
  dailyTimeReviews = normalizedReviews;
  emitChanged('load');
  return getDailyTimeReviews();
}

export function clearDailyTimeReviews() {
  const hadReviews = dailyTimeReviews.length > 0;
  dailyTimeReviews = [];
  if (hadReviews) emitChanged('clear');
  return hadReviews;
}
