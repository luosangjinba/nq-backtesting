import {
  TIMEFRAME_MAP,
} from '../../config.js';
import {
  DAILY_TIME_REACTION_TIMES,
} from '../../time-reaction/daily-time-review-store.js';
import { escapeHtml, section } from './render-utils.js';

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

function getRefType(ref = {}) {
  return ref.type || ref.refType || 'ref';
}

function getRefId(ref = {}) {
  return ref.id || ref.refId || '';
}

function formatRefType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'pda') return 'PDA';
  if (normalized === 'smt') return 'SMT';
  if (normalized === 'segment') return 'Segment';
  if (normalized === 'composite') return 'Composite';
  if (normalized === 'order-setup') return 'Order Setup';
  return type ? String(type).toUpperCase() : 'Ref';
}

function formatRefRole(role) {
  const normalized = String(role || 'context').toLowerCase();
  if (normalized === 'context') return 'Context';
  if (normalized === 'confirmation') return 'Confirmation';
  if (normalized === 'trigger') return 'Trigger';
  if (normalized === 'target') return 'Target';
  if (normalized === 'invalidation') return 'Invalidation';
  if (normalized === 'evidence') return 'Evidence';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Context';
}

function getRefSource(ref = {}) {
  if (ref.sourceContext) return ref.sourceContext;
  return [ref.sourceInstrument, ref.sourceTimeframeLabel].filter(Boolean).join(' ');
}

function shortRefId(id) {
  const text = String(id || '');
  return text.length > 24 ? `${text.slice(0, 18)}...${text.slice(-4)}` : text;
}

function summarizeLinkedRef(ref = {}) {
  return [
    formatRefRole(ref.role),
    formatRefType(getRefType(ref)),
    getRefSource(ref),
    shortRefId(getRefId(ref)),
  ].filter(Boolean).join(' · ');
}

function targetAttrs(review, target = {}) {
  return [
    `data-daily-time-date="${escapeHtml(review.date)}"`,
    `data-daily-time-target-section="${escapeHtml(target.section)}"`,
    target.itemId ? `data-daily-time-context-item-id="${escapeHtml(target.itemId)}"` : '',
    target.time ? `data-daily-time-reaction-time="${escapeHtml(target.time)}"` : '',
  ].filter(Boolean).join(' ');
}

function renderRefList(review, target, refs = []) {
  const rows = (Array.isArray(refs) ? refs : []).map((ref, refIndex) => `
    <div class="order-review-ref-row">
      <span title="${escapeHtml(getRefId(ref) || '')}">${escapeHtml(summarizeLinkedRef(ref))}</span>
      <button
        class="order-review-ref-delete"
        data-inspector-action="daily-time-ref-remove"
        ${targetAttrs(review, target)}
        data-ref-index="${refIndex}"
        type="button"
        title="Remove linked object"
      >X</button>
    </div>
  `);
  return `
    <div class="order-review-ref-list">${rows.join('') || '<div class="drawing-set-empty">No linked objects.</div>'}</div>
    <div class="order-review-ref-actions">
      <button
        class="inspector-mini-btn"
        data-inspector-action="daily-time-ref-add-selected-object"
        ${targetAttrs(review, target)}
        type="button"
      >Link Selected Object</button>
    </div>
  `;
}

function renderTimeframeOptions(selectedTimeframe) {
  const selected = String(selectedTimeframe || '1');
  return Object.entries(TIMEFRAME_MAP)
    .map(([value, label]) => `
      <option value="${escapeHtml(value)}" ${String(value) === selected ? 'selected' : ''}>${escapeHtml(label)}</option>
    `)
    .join('');
}

function renderChartOptions(selectedChart) {
  const selected = selectedChart === 'secondary' ? 'secondary' : 'primary';
  return ['primary', 'secondary']
    .map((value) => `
      <option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value === 'primary' ? 'Main' : 'Sub')}</option>
    `)
    .join('');
}

function renderLocateControls(review, target, locate = {}) {
  const timeframe = locate.timeframe || '1';
  const chart = locate.chart || 'primary';
  return `
    <div class="time-reaction-locate-row">
      <select
        class="inspector-input inspector-mini-select"
        data-inspector-action="daily-time-locate-timeframe"
        ${targetAttrs(review, target)}
      >
        ${renderTimeframeOptions(timeframe)}
      </select>
      <select
        class="inspector-input inspector-mini-select"
        data-inspector-action="daily-time-locate-chart"
        ${targetAttrs(review, target)}
      >
        ${renderChartOptions(chart)}
      </select>
      <button
        class="inspector-mini-btn"
        data-inspector-action="daily-time-locate"
        ${targetAttrs(review, target)}
        type="button"
      >Locate</button>
    </div>
  `;
}

function renderContextItem(review, item, itemIndex) {
  const target = { section: 'pre0930Item', itemId: item.id };
  return `
    <div class="time-reaction-card time-reaction-context-card">
      <div class="time-reaction-card-header">
        <span class="time-reaction-time">Context ${itemIndex + 1}</span>
        ${
          itemIndex > 0
            ? `<button
                class="inspector-mini-btn"
                data-inspector-action="daily-time-context-item-remove"
                data-daily-time-date="${escapeHtml(review.date)}"
                data-daily-time-context-item-id="${escapeHtml(item.id)}"
                type="button"
              >Remove</button>`
            : ''
        }
      </div>
      ${renderTextarea(
        item.note,
        [
          'data-inspector-action="daily-time-context-item-note"',
          `data-daily-time-date="${escapeHtml(review.date)}"`,
          `data-daily-time-context-item-id="${escapeHtml(item.id)}"`,
        ].join(' '),
        'Record one pre-09:30 context observation.'
      )}
      ${renderLocateControls(review, target, item.locate)}
      ${renderRefList(review, target, item.refs)}
    </div>
  `;
}

function renderReactionCard(review, reaction) {
  const time = reaction.time;
  const noteAttrs = [
    'data-inspector-action="daily-time-reaction-note"',
    reactionAttrs(review, time, 'note'),
  ].join(' ');
  return `
    <div class="time-reaction-card">
      <div class="time-reaction-card-header">
        <span class="time-reaction-time">${escapeHtml(time)}</span>
      </div>
      ${renderTextarea(
        reaction.note,
        noteAttrs,
        'Record what happened at this algorithmic time.'
      )}
      ${renderLocateControls(review, { section: 'reaction', time }, reaction.locate)}
      ${renderRefList(review, { section: 'reaction', time }, reaction.refs)}
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
  const contextItems = (review.pre0930Context?.items || [])
    .map((item, itemIndex) => renderContextItem(review, item, itemIndex))
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
      <div class="time-reaction-subsection">
        <div class="time-reaction-subsection-title">
          <span>Pre 09:30 Context</span>
          <button
            class="inspector-mini-btn"
            data-inspector-action="daily-time-context-item-add"
            data-daily-time-date="${escapeHtml(review.date)}"
            type="button"
          >Add Context</button>
        </div>
        <div class="time-reaction-list">
          ${contextItems}
        </div>
      </div>
      <div class="time-reaction-list">
        ${reactions}
      </div>
      <div class="time-reaction-subsection">
        <div class="time-reaction-subsection-title">
          <span>09:30-11:00 Summary</span>
        </div>
        ${renderTextarea(
          review.summary0930To1100?.note,
          sectionNoteAttrs(review, 'summary0930To1100'),
          'Summarize the 09:30-11:00 move and whether the reactions became actionable.'
        )}
        ${renderLocateControls(review, { section: 'summary0930To1100' }, review.summary0930To1100?.locate)}
        ${renderRefList(review, { section: 'summary0930To1100' }, review.summary0930To1100?.refs)}
      </div>
    </section>
  `;
}
