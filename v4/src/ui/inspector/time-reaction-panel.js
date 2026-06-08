import {
  TIMEFRAME_MAP,
} from '../../config.js';
import { getChartNotes } from '../../chart-notes/chart-note-store.js';
import { compactUtcTime, dateKeyFromTimestamp } from '../../utils.js';
import {
  DAILY_TIME_REACTION_TIMES,
  getDailyTimeReviewSectionDefinition,
} from '../../time-reaction/daily-time-review-store.js';
import { escapeHtml, section } from './render-utils.js';

export const CHART_NOTES_SECTION_KEY = 'chartNotes';

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

function getTargetKey(target = {}) {
  return [
    target.section || '',
    target.itemId || '',
    target.time || '',
  ].join(':');
}

function renderRefList(review, target, refs = [], options = {}) {
  const isPicking = options.pendingRefPick?.date === review.date
    && options.pendingRefPick?.targetKey === getTargetKey(target);
  const rows = (Array.isArray(refs) ? refs : []).map((ref, refIndex) => `
    <div class="order-review-ref-row">
      <span title="${escapeHtml(getRefId(ref) || '')}">${escapeHtml(summarizeLinkedRef(ref))}</span>
      <details class="order-review-ref-menu">
        <summary class="order-review-ref-menu-trigger" aria-label="Linked object actions">...</summary>
        <div class="order-review-ref-menu-panel">
          <button
            class="order-review-ref-menu-item"
            data-inspector-action="daily-time-ref-locate"
            ${targetAttrs(review, target)}
            data-ref-index="${refIndex}"
            data-locate-chart="primary"
            type="button"
          >Main</button>
          <button
            class="order-review-ref-menu-item"
            data-inspector-action="daily-time-ref-locate"
            ${targetAttrs(review, target)}
            data-ref-index="${refIndex}"
            data-locate-chart="secondary"
            type="button"
          >Sub</button>
          <button
            class="order-review-ref-menu-item danger"
            data-inspector-action="daily-time-ref-remove"
            ${targetAttrs(review, target)}
            data-ref-index="${refIndex}"
            type="button"
          >Delete</button>
        </div>
      </details>
    </div>
  `);
  return `
    <div class="order-review-ref-list">${rows.join('') || '<div class="drawing-set-empty">No linked objects.</div>'}</div>
    <div class="order-review-ref-actions">
      <button
        class="inspector-mini-btn"
        data-inspector-action="${isPicking ? 'daily-time-ref-pick-cancel' : 'daily-time-ref-pick-start'}"
        ${targetAttrs(review, target)}
        type="button"
      >${isPicking ? 'Cancel Select' : 'Select Object'}</button>
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

function timeTextFromTimestamp(timestamp) {
  return compactUtcTime(timestamp, '—');
}

function getChartNotesForDate(dateKey, instrument = 'NQ') {
  return getChartNotes()
    .filter((note) => note.instrument === instrument)
    .filter((note) => dateKeyFromTimestamp(note.timestamp) === dateKey)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

function renderChartNotesSection(review) {
  const notes = getChartNotesForDate(review.date, review.instrument || 'NQ');
  const canSelectObject = Boolean(review.pendingReasonRefPick);
  const rows = notes.map((note) => {
    const timeframe = TIMEFRAME_MAP[Number(note.timeframe)] || `${note.timeframe || '—'}M`;
    return `
      <div class="time-reaction-chart-note-row">
        <div class="time-reaction-chart-note-header">
          <div class="time-reaction-chart-note-meta">
            <span>${escapeHtml(timeTextFromTimestamp(note.timestamp))}</span>
            <span>${escapeHtml(timeframe)}</span>
          </div>
          <details class="order-review-ref-menu chart-note-action-menu">
            <summary class="order-review-ref-menu-trigger" aria-label="Chart note actions">...</summary>
            <div class="order-review-ref-menu-panel">
              <button
                class="order-review-ref-menu-item"
                data-inspector-action="chart-note-locate"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Locate</button>
              <button
                class="order-review-ref-menu-item"
                data-inspector-action="chart-note-edit-focus"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Edit</button>
              ${
                canSelectObject
                  ? `<button
                      class="order-review-ref-menu-item"
                      data-inspector-action="chart-note-select-object"
                      data-chart-note-id="${escapeHtml(note.id)}"
                      type="button"
                    >Select Object</button>`
                  : ''
              }
              <button
                class="order-review-ref-menu-item danger"
                data-inspector-action="chart-note-delete"
                data-chart-note-id="${escapeHtml(note.id)}"
                type="button"
              >Delete</button>
            </div>
          </details>
        </div>
        <textarea
          class="inspector-textarea time-reaction-chart-note-edit"
          data-inspector-action="chart-note-edit"
          data-chart-note-id="${escapeHtml(note.id)}"
          rows="2"
        >${escapeHtml(note.text)}</textarea>
      </div>
    `;
  });
  return `
    <div class="time-reaction-subsection time-reaction-chart-notes">
      <div class="time-reaction-subsection-title">
        <span>Chart Notes</span>
        <span class="time-reaction-chart-note-count">${notes.length}</span>
      </div>
      <div class="time-reaction-chart-note-list">
        ${rows.join('') || '<div class="drawing-set-empty">No chart notes for this day.</div>'}
      </div>
    </div>
  `;
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

function renderObservationItem(review, item, itemIndex, target, options = {}) {
  const isFirst = itemIndex === 0;
  const noteAction = target.section === 'reactionItem'
    ? 'daily-time-reaction-item-note'
    : target.section === 'summaryItem'
      ? 'daily-time-summary-item-note'
      : 'daily-time-context-item-note';
  const removeAction = target.section === 'reactionItem'
    ? 'daily-time-reaction-item-remove'
    : target.section === 'summaryItem'
      ? 'daily-time-summary-item-remove'
      : 'daily-time-context-item-remove';
  const label = target.section === 'pre0930Item' ? `Context ${itemIndex + 1}` : `Event ${itemIndex + 1}`;
  return `
    <div class="time-reaction-card time-reaction-event-card">
      <div class="time-reaction-card-header">
        <span class="time-reaction-time">${escapeHtml(label)}</span>
        ${
          !isFirst
            ? `<button
                class="inspector-mini-btn"
                data-inspector-action="${escapeHtml(removeAction)}"
                ${targetAttrs(review, target)}
                type="button"
              >Remove</button>`
            : ''
        }
      </div>
      ${renderTextarea(
        item.note,
        [
          `data-inspector-action="${escapeHtml(noteAction)}"`,
          targetAttrs(review, target),
        ].join(' '),
        target.section === 'pre0930Item'
          ? 'Record one pre-09:30 context observation.'
          : 'Record one event observation.'
      )}
      ${renderLocateControls(review, target, item.locate)}
      ${renderRefList(review, target, item.refs, options)}
    </div>
  `;
}

function renderFixedTimeStateItem(review, item, itemIndex, itemCount, options = {}) {
  const target = { section: 'fixedTimeItem', itemId: item.id, time: item.time };
  return `
    <div class="time-reaction-card time-reaction-fixed-time-card">
      <div class="time-reaction-card-header">
        <input
          class="inspector-input time-reaction-time-input"
          data-inspector-action="daily-time-fixed-item-time"
          ${targetAttrs(review, target)}
          type="time"
          value="${escapeHtml(item.time || '09:30')}"
        />
        <button
          class="inspector-mini-btn"
          data-inspector-action="daily-time-fixed-item-remove"
          ${targetAttrs(review, target)}
          type="button"
          ${itemCount <= 1 ? 'disabled' : ''}
        >Remove</button>
      </div>
      <textarea
        class="inspector-textarea time-reaction-fixed-note"
        data-inspector-action="daily-time-fixed-item-note"
        ${targetAttrs(review, target)}
        rows="2"
        placeholder="${escapeHtml(`Record ${item.time || 'fixed time'} state.`)}"
      >${escapeHtml(item.note || '')}</textarea>
      ${renderLocateControls(review, target, item.locate)}
      ${renderRefList(review, target, item.refs, options)}
    </div>
  `;
}

function renderFixedTimeStatePanel(review, sectionDefinition, options = {}) {
  const sectionData = review.fixedTimeState || {};
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  return `
    <section class="inspector-section time-reaction-panel" data-inspector-section="daily-time-review-section-detail">
      <div class="inspector-section-title">${escapeHtml(sectionDefinition.label)}</div>
      <div class="inspector-evidence-row">
        <div class="inspector-evidence-header">
          <span>${escapeHtml(review.date)}</span>
          <span>${escapeHtml(review.instrument || 'NQ')}</span>
        </div>
        <div class="drawing-set-meta">Daily fixed-time state notes with linked chart evidence.</div>
      </div>
      <button
        class="inspector-mini-btn time-reaction-add-btn"
        data-inspector-action="daily-time-fixed-item-add"
        data-daily-time-date="${escapeHtml(review.date)}"
        type="button"
      >Add Time</button>
      <div class="time-reaction-list">
        ${items.map((item, itemIndex) => renderFixedTimeStateItem(
          review,
          item,
          itemIndex,
          items.length,
          options
        )).join('')}
      </div>
    </section>
  `;
}

function renderReactionCard(review, reaction, options = {}) {
  const time = reaction.time;
  const items = Array.isArray(reaction.items) ? reaction.items : [];
  return `
    <div class="time-reaction-subsection">
      <div class="time-reaction-subsection-title">
        <span>${escapeHtml(time)}</span>
      </div>
      <button
        class="inspector-mini-btn time-reaction-add-btn"
        data-inspector-action="daily-time-reaction-item-add"
        data-daily-time-date="${escapeHtml(review.date)}"
        data-daily-time-reaction-time="${escapeHtml(time)}"
        type="button"
      >Add Event</button>
      <div class="time-reaction-list">
        ${items.map((item, itemIndex) => renderObservationItem(
          review,
          item,
          itemIndex,
          { section: 'reactionItem', time, itemId: item.id },
          options
        )).join('')}
      </div>
    </div>
  `;
}

function getReactionByTime(review, time) {
  return (review.reactions || []).find((reaction) => reaction.time === time) || { time };
}

export function renderDailyTimeReviewPanel(review, options = {}) {
  if (!review) {
    return section('Time Reaction Observation', '<div class="inspector-empty">Select a valid calendar day.</div>');
  }

  const reactions = DAILY_TIME_REACTION_TIMES
    .map((time) => renderReactionCard(review, getReactionByTime(review, time), options))
    .join('');
  const contextItems = (review.pre0930Context?.items || [])
    .map((item, itemIndex) => renderObservationItem(
      review,
      item,
      itemIndex,
      { section: 'pre0930Item', itemId: item.id },
      options
    ))
    .join('');
  const summaryItems = (review.summary0930To1100?.items || [])
    .map((item, itemIndex) => renderObservationItem(
      review,
      item,
      itemIndex,
      { section: 'summaryItem', itemId: item.id },
      options
    ))
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
        </div>
        <button
          class="inspector-mini-btn time-reaction-add-btn"
          data-inspector-action="daily-time-context-item-add"
          data-daily-time-date="${escapeHtml(review.date)}"
          type="button"
        >Add Context</button>
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
        <button
          class="inspector-mini-btn time-reaction-add-btn"
          data-inspector-action="daily-time-summary-item-add"
          data-daily-time-date="${escapeHtml(review.date)}"
          type="button"
        >Add Event</button>
        <div class="time-reaction-list">
          ${summaryItems}
        </div>
      </div>
    </section>
  `;
}

export function renderDailyTimeReviewSectionPanel(review, sectionKey, options = {}) {
  if (sectionKey === CHART_NOTES_SECTION_KEY) {
    if (!review) {
      return section('Chart Notes', '<div class="inspector-empty">Select a valid calendar day.</div>');
    }
    const reviewContext = {
      ...review,
      pendingReasonRefPick: options.pendingReasonRefPick || null,
    };
    return `
      <section class="inspector-section time-reaction-panel" data-inspector-section="daily-time-review-chart-notes">
        <div class="inspector-section-title">Chart Notes</div>
        <div class="inspector-evidence-row">
          <div class="inspector-evidence-header">
            <span>${escapeHtml(reviewContext.date)}</span>
            <span>${escapeHtml(reviewContext.instrument || 'NQ')}</span>
          </div>
          <div class="drawing-set-meta">Chart notes for this loaded day.</div>
        </div>
        ${renderChartNotesSection(reviewContext)}
      </section>
    `;
  }

  const sectionDefinition = getDailyTimeReviewSectionDefinition(sectionKey);
  if (!review || !sectionDefinition) {
    return section('Time Reaction Observation', '<div class="inspector-empty">Select a valid review section.</div>');
  }

  const reviewContext = {
    ...review,
    pendingReasonRefPick: options.pendingReasonRefPick || null,
  };

  if (sectionKey === 'fixedTimeState') {
    return renderFixedTimeStatePanel(reviewContext, sectionDefinition, options);
  }

  const sectionData = reviewContext[sectionKey] || {};
  const target = { section: sectionKey };
  return `
    <section class="inspector-section time-reaction-panel" data-inspector-section="daily-time-review-section-detail">
      <div class="inspector-section-title">${escapeHtml(sectionDefinition.label)}</div>
      <div class="inspector-evidence-row">
        <div class="inspector-evidence-header">
          <span>${escapeHtml(reviewContext.date)}</span>
          <span>${escapeHtml(reviewContext.instrument || 'NQ')}</span>
        </div>
        <div class="drawing-set-meta">Daily review note with linked chart evidence.</div>
      </div>
      ${renderTextarea(
        sectionData.note,
        [
          'data-inspector-action="daily-time-section-note"',
          `data-daily-time-section="${escapeHtml(sectionKey)}"`,
          targetAttrs(reviewContext, target),
        ].join(' '),
        `Record ${sectionDefinition.label}.`
      )}
      ${renderLocateControls(reviewContext, target, sectionData.locate)}
      ${renderRefList(reviewContext, target, sectionData.refs, options)}
    </section>
  `;
}
