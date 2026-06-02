import {
  DAILY_TIME_REACTION_TIMES,
  DAILY_TIME_REACTION_TYPES,
} from '../../time-reaction/daily-time-review-store.js';
import { controlField, escapeHtml, section } from './render-utils.js';

const REACTION_TYPE_LABELS = Object.freeze({
  [DAILY_TIME_REACTION_TYPES.OTHER]: 'Observation',
  [DAILY_TIME_REACTION_TYPES.REVERSAL]: 'Reversal',
  [DAILY_TIME_REACTION_TYPES.CONTINUATION]: 'Continuation',
  [DAILY_TIME_REACTION_TYPES.SWEEP_REVERSE]: 'Sweep Reverse',
  [DAILY_TIME_REACTION_TYPES.NO_TRADE]: 'No Trade',
  [DAILY_TIME_REACTION_TYPES.NOISE]: 'Noise',
});

function sectionNoteAttrs(review, sectionName) {
  return [
    'data-inspector-action="daily-time-section-note"',
    `data-daily-time-date="${escapeHtml(review.date)}"`,
    `data-daily-time-section="${escapeHtml(sectionName)}"`,
  ].join(' ');
}

function reactionAttrs(review, time, fieldName) {
  return [
    `data-daily-time-date="${escapeHtml(review.date)}"`,
    `data-daily-time-reaction-time="${escapeHtml(time)}"`,
    fieldName ? `data-daily-time-reaction-field="${escapeHtml(fieldName)}"` : '',
  ].filter(Boolean).join(' ');
}

function renderTextarea(value, attrs, placeholder = '') {
  return `
    <textarea
      class="inspector-textarea"
      ${attrs}
      rows="4"
      placeholder="${escapeHtml(placeholder)}"
    >${escapeHtml(value || '')}</textarea>
  `;
}

function renderReactionTypeOptions(selectedValue) {
  return Object.values(DAILY_TIME_REACTION_TYPES)
    .map((value) => `
      <option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>
        ${escapeHtml(REACTION_TYPE_LABELS[value] || value)}
      </option>
    `)
    .join('');
}

function renderReactionCard(review, reaction) {
  const time = reaction.time;
  const selectAttrs = [
    'data-inspector-action="daily-time-reaction-type"',
    reactionAttrs(review, time, 'reactionType'),
  ].join(' ');
  const noteAttrs = [
    'data-inspector-action="daily-time-reaction-note"',
    reactionAttrs(review, time, 'note'),
  ].join(' ');
  return `
    <div class="time-reaction-card">
      <div class="time-reaction-card-header">
        <span class="time-reaction-time">${escapeHtml(time)}</span>
        <select class="inspector-input inspector-mini-select" ${selectAttrs}>
          ${renderReactionTypeOptions(reaction.reactionType)}
        </select>
      </div>
      ${renderTextarea(
        reaction.note,
        noteAttrs,
        'Record what happened at this algorithmic time.'
      )}
    </div>
  `;
}

function getReactionByTime(review, time) {
  return (review.reactions || []).find((reaction) => reaction.time === time) || { time };
}

export function renderDailyTimeReviewPanel(review) {
  if (!review) {
    return section('Time Reaction Observation', '<div class="inspector-empty">Select a valid calendar day.</div>');
  }

  const reactions = DAILY_TIME_REACTION_TIMES
    .map((time) => renderReactionCard(review, getReactionByTime(review, time)))
    .join('');

  return `
    <section class="inspector-section time-reaction-panel" data-inspector-section="daily-time-review-detail">
      <div class="inspector-section-title">Time Reaction Observation</div>
      <div class="inspector-evidence-row">
        <div class="inspector-evidence-header">
          <span>${escapeHtml(review.date)}</span>
          <span>${escapeHtml(review.instrument || 'NQ')}</span>
        </div>
        <div class="drawing-set-meta">Daily observation notes for fixed algorithmic time reactions.</div>
      </div>
      ${controlField(
        'Pre 09:30 Context',
        renderTextarea(
          review.pre0930Context?.note,
          sectionNoteAttrs(review, 'pre0930Context'),
          'Record the higher-timeframe context before 09:30.'
        )
      )}
      <div class="time-reaction-list">
        ${reactions}
      </div>
      ${controlField(
        '09:30-11:00 Summary',
        renderTextarea(
          review.summary0930To1100?.note,
          sectionNoteAttrs(review, 'summary0930To1100'),
          'Summarize the 09:30-11:00 move and whether the reactions became actionable.'
        )
      )}
    </section>
  `;
}
