import * as bus from '../event-bus.js';
import { normalizeLinkedObjectRef } from '../order/order-review-store.js';
import {
  DAILY_TIME_REVIEW_SECTION_KEYS,
} from './daily-time-review-types.js';
import {
  getWeekStartDateKey,
  isWeekStartDateKey,
  makeContextItemId,
  normalizeContextItem,
  normalizeDailyTimeReview,
  normalizeDateKey,
  normalizeFixedTimeItem,
  normalizeString,
  normalizeTimeText,
} from './daily-time-review-normalize.js';
import {
  getDailyTimeReviewIdentity,
  hasDailyTimeReviewContent,
} from './daily-time-review-selectors.js';

export {
  DAILY_TIME_REACTION_TIMES,
  DAILY_TIME_REVIEW_SECTIONS,
  DAILY_TIME_REVIEW_SECTION_KEYS,
  DAILY_TIME_REACTION_TYPES,
  DEFAULT_FIXED_TIME_STATE_TIMES,
  getDailyTimeReviewSectionDefinition,
} from './daily-time-review-types.js';

export {
  getWeekStartDateKey,
  isWeekStartDateKey,
  normalizeDailyTimeReview,
} from './daily-time-review-normalize.js';

export {
  getDailyTimeReviewIdentity,
  hasDailyTimeReviewContent,
} from './daily-time-review-selectors.js';

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

function getStoredDailyTimeReview(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  return dailyTimeReviews.find((review) => review.date === dateKey && review.instrument === instrument) || null;
}

export function getDailyTimeReviews() {
  return dailyTimeReviews.map(clone);
}

export function getDailyTimeReviewsWithContent() {
  return dailyTimeReviews.filter(hasDailyTimeReviewContent).map(clone);
}

export function getDailyTimeReviewByDate(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  if (!dateKey) return null;
  const stored = getStoredDailyTimeReview(dateKey, instrument);
  const weekStartDate = getWeekStartDateKey(dateKey);
  const weeklyReview = weekStartDate ? getStoredDailyTimeReview(weekStartDate, instrument) : null;
  const weeklyBias = weeklyReview?.bias || {};
  const hasWeeklyBias = Boolean(
    normalizeString(weeklyBias.weeklyBiasPrediction)
      || normalizeString(weeklyBias.weeklyBiasReview)
      || normalizeString(weeklyBias.weeklyBias)
  );
  if (!stored && !hasWeeklyBias) return null;
  const base = stored || normalizeDailyTimeReview({ date: dateKey, instrument }, { preserveUpdatedAt: true });
  const merged = {
    ...base,
    bias: {
      ...(base.bias || {}),
      ...(hasWeeklyBias
        ? {
          weeklyBiasPrediction: normalizeString(weeklyBias.weeklyBiasPrediction, normalizeString(weeklyBias.weeklyBias)),
          weeklyBiasReview: normalizeString(weeklyBias.weeklyBiasReview),
          weeklyBias: normalizeString(weeklyBias.weeklyBiasPrediction, normalizeString(weeklyBias.weeklyBias)),
        }
        : {}),
    },
  };
  return clone(merged);
}

export function getOrCreateDailyTimeReview(date, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  if (!dateKey) return null;
  const existing = getStoredDailyTimeReview(dateKey, instrument);
  if (existing) return clone(existing);
  const normalized = ensureUniqueReviewId(normalizeDailyTimeReview({ date: dateKey, instrument }));
  dailyTimeReviews = [...dailyTimeReviews, normalized];
  emitChanged('add', normalized);
  return clone(normalized);
}

export function updateDailyTimeBiasField(date, field, value, instrument = 'NQ') {
  const dateKey = normalizeDateKey(date);
  const fieldName = normalizeString(field);
  if (!dateKey || !fieldName) return null;
  const isWeeklyField = ['weeklyBiasPrediction', 'weeklyBiasReview'].includes(fieldName);
  if (isWeeklyField && !isWeekStartDateKey(dateKey)) return null;
  const targetDate = isWeeklyField ? getWeekStartDateKey(dateKey) : dateKey;
  const review = getOrCreateDailyTimeReview(targetDate, instrument);
  if (!review) return null;
  return updateDailyTimeReview(review.id, {
    bias: {
      ...(review.bias || {}),
      [fieldName]: value,
    },
  });
}

export function updateDailyTimeReviewSection(date, sectionName, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review || !['pre0930Context', 'summary0930To1100', ...DAILY_TIME_REVIEW_SECTION_KEYS].includes(sectionName)) return null;
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

export function addFixedTimeStateItem(date, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  if (!review) return null;
  const time = normalizeTimeText(patch.time, '09:30');
  const item = normalizeFixedTimeItem({ id: makeContextItemId(), ...patch, time }, review.date, time);
  return updateDailyTimeReview(review.id, {
    fixedTimeState: {
      ...(review.fixedTimeState || {}),
      items: [...(review.fixedTimeState?.items || []), item],
    },
  });
}

export function updateFixedTimeStateItem(date, itemId, patch = {}, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  return updateDailyTimeReview(review.id, {
    fixedTimeState: {
      ...(review.fixedTimeState || {}),
      items: (review.fixedTimeState?.items || []).map((item) => {
        if (item.id !== id) return item;
        const nextPatch = { ...patch };
        if (patch.time && !patch.locate) {
          nextPatch.locate = { ...(item.locate || {}), timestamp: null };
        }
        return normalizeFixedTimeItem({ ...item, ...nextPatch }, review.date, nextPatch.time || item.time);
      }),
    },
  });
}

export function removeFixedTimeStateItem(date, itemId, instrument = 'NQ') {
  const review = getOrCreateDailyTimeReview(date, instrument);
  const id = normalizeString(itemId);
  if (!review || !id) return null;
  const items = (review.fixedTimeState?.items || []).filter((item) => item.id !== id);
  return updateDailyTimeReview(review.id, {
    fixedTimeState: {
      ...(review.fixedTimeState || {}),
      items: items.length ? items : [normalizeFixedTimeItem({ id: 'fixed_0930', time: '09:30' }, review.date, '09:30')],
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
  if (target.section === 'fixedTimeItem') {
    const item = (review.fixedTimeState?.items || []).find((candidate) => candidate.id === normalizeString(target.itemId));
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) {
    return Array.isArray(review[target.section]?.refs) ? review[target.section].refs : [];
  }
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
  if (target.section === 'fixedTimeItem') {
    const itemId = normalizeString(target.itemId);
    return {
      fixedTimeState: {
        ...(review.fixedTimeState || {}),
        items: (review.fixedTimeState?.items || []).map((item) => (
          item.id === itemId ? { ...item, refs } : item
        )),
      },
    };
  }
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) {
    return {
      [target.section]: {
        ...(review[target.section] || {}),
        refs,
      },
    };
  }
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
