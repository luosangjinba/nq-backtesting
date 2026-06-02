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

function normalizeSection(input = {}) {
  return {
    note: normalizeString(input.note),
    refs: normalizeRefs(input.refs),
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
    pre0930Context: normalizeSection(input.pre0930Context),
    reactions: normalizeReactions(input.reactions, date),
    summary0930To1100: normalizeSection(input.summary0930To1100),
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
