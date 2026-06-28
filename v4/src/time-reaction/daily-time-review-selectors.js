import {
  DAILY_TIME_REVIEW_SECTION_KEYS,
} from './daily-time-review-types.js';
import { normalizeString } from './daily-time-review-normalize.js';

export function getDailyTimeReviewIdentity(review = {}) {
  return `${review.instrument || 'NQ'}:${review.date || ''}`;
}

function refsHaveContent(refs = []) {
  return Array.isArray(refs) && refs.length > 0;
}

function sectionHasContent(sectionData = {}) {
  if (normalizeString(sectionData.note)) return true;
  if (refsHaveContent(sectionData.refs)) return true;
  return Array.isArray(sectionData.items)
    && sectionData.items.some((item) => normalizeString(item.note) || refsHaveContent(item.refs));
}

function reactionHasContent(reaction = {}) {
  if (normalizeString(reaction.note)) return true;
  if (refsHaveContent(reaction.refs)) return true;
  return Array.isArray(reaction.items)
    && reaction.items.some((item) => normalizeString(item.note) || refsHaveContent(item.refs));
}

function biasHasContent(bias = {}) {
  return Boolean(
    normalizeString(bias.dailyBiasPrediction)
      || normalizeString(bias.dailyBiasReview)
      || normalizeString(bias.weeklyBiasPrediction)
      || normalizeString(bias.weeklyBiasReview)
      || normalizeString(bias.weeklyBias)
      || normalizeString(bias.dailyBias)
      || normalizeString(bias.biasReview)
  );
}

function openingThesisReviewHasContent(openingThesisReview = {}) {
  return Boolean(
    normalizeString(openingThesisReview.preOpenThesis)
      || normalizeString(openingThesisReview.morningSummary0930To1100)
      || normalizeString(openingThesisReview.fullDaySummary)
      || normalizeString(openingThesisReview.thesisReview)
  );
}

export function hasDailyTimeReviewContent(review = {}) {
  if (!review || typeof review !== 'object') return false;
  return DAILY_TIME_REVIEW_SECTION_KEYS.some((sectionName) => sectionHasContent(review[sectionName]))
    || biasHasContent(review.bias)
    || openingThesisReviewHasContent(review.openingThesisReview)
    || sectionHasContent(review.pre0930Context)
    || sectionHasContent(review.summary0930To1100)
    || (Array.isArray(review.reactions) && review.reactions.some(reactionHasContent));
}
