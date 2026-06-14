import {
  LIVE_RECORD_REASON_CATEGORIES,
  LIVE_RECORD_RESULT_STATUSES,
} from '../../live-record/live-record-types.js';
import { createLiveRecordSet } from '../../live-record/live-record-set.js';
import { getSelectedLiveRecordElement } from '../../live-record/live-record-selection.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
} from './render-utils.js';

function formatDirection(direction) {
  if (direction === 'long') return 'Long';
  if (direction === 'short') return 'Short';
  return 'Unknown';
}

function titleCase(value, fallback = '—') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderActiveHeader(record, liveSet) {
  const anchor = liveSet?.anchor || {};
  const state = record.display?.hidden ? 'Hidden' : 'Visible';
  const title = [
    formatDirection(liveSet?.direction),
    formatTime(anchor.timestamp),
    anchor.timeframe || '—',
  ].filter(Boolean).join(' · ');

  return `
    <div class="inspector-evidence-row order-review-row active">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(title)}</span>
        <span>${escapeHtml(record.instrument || liveSet?.instrument || 'NQ')}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml(`Active Live Record · ${state} · Updated ${formatDateTimeMs(record.updatedAt)}`)}</div>
    </div>
  `;
}

function renderDisplayPanel(record) {
  const showRiskRewardBox = record.display?.showRiskRewardBox !== false;
  return `
    <div class="order-review-compact order-review-display-panel">
      <div class="order-review-compact-title">Display</div>
      <label class="inspector-toggle">
        <input
          data-inspector-action="live-record-display-field"
          data-live-record-id="${escapeHtml(record.id)}"
          data-live-record-field="showRiskRewardBox"
          type="checkbox"
          ${showRiskRewardBox ? 'checked' : ''}
        />
        <span>Risk / Reward Box</span>
      </label>
    </div>
  `;
}

function renderSummaryPanel(record) {
  return `
    <div class="order-review-compact order-review-summary-panel">
      <div class="order-review-compact-title">Summary</div>
      <textarea
        class="inspector-textarea"
        data-inspector-action="live-record-summary"
        data-live-record-id="${escapeHtml(record.id)}"
        rows="4"
        placeholder="Write live record summary"
      >${escapeHtml(record.summary || '')}</textarea>
    </div>
  `;
}

function renderAnchorPanel(liveSet) {
  const anchor = liveSet?.anchor || {};
  const direction = liveSet?.direction === 'short' ? 'Bearish' : liveSet?.direction === 'long' ? 'Bullish' : 'Unknown';
  return `
    <div class="order-review-compact order-review-anchor-panel">
      <div class="order-review-compact-title">Anchor</div>
      ${field('Direction', direction)}
      ${field('Time', formatTime(anchor.timestamp))}
      ${field('TF', anchor.timeframe || '—')}
      ${field('Price', formatNumber(anchor.price))}
    </div>
  `;
}

function renderExecutionElement(label, element = {}, extra = '', state = {}) {
  if (!element?.complete) return '';
  const visible = state.visible !== false && element.visible !== false;
  const selected = Boolean(state.selected);
  const visibilityClass = visible ? 'is-visible' : 'is-hidden';
  const endLabel = element.endTimestamp ? `End ${formatTime(element.endTimestamp)}` : '';
  const stateLabels = [visible ? '' : 'Hidden', selected ? 'Selected' : ''].filter(Boolean).join(' · ');
  const meta = [extra || '', endLabel, stateLabels].filter(Boolean).join(' · ') || '—';
  return `
    <div class="order-setup-execution-row${selected ? ' active' : ''}">
      <span class="order-setup-execution-visibility ${escapeHtml(visibilityClass)}" aria-hidden="true"></span>
      <div class="order-setup-execution-summary">
        <span class="order-setup-execution-type">${escapeHtml(label)}</span>
        <strong class="order-setup-execution-price">${escapeHtml(formatNumber(element.price))}</strong>
        <span class="order-setup-execution-kind">${escapeHtml(meta)}</span>
      </div>
      <span class="order-setup-execution-time">${escapeHtml(formatTime(element.timestamp))}</span>
    </div>
  `;
}

function renderExecutionPanel(liveSet) {
  const execution = liveSet?.execution || {};
  const selected = getSelectedLiveRecordElement();
  const isSelectedElement = (role) => selected?.liveRecordId === liveSet?.id && selected?.element === role;
  const isVisibleElement = (role) => liveSet?.display?.elementVisibility?.[role] !== false;
  const rows = [
    renderExecutionElement('Entry', execution.entry, execution.entry?.timeframe || '', {
      visible: isVisibleElement('entry'),
      selected: isSelectedElement('entry'),
    }),
    renderExecutionElement('MSS', execution.marketStructureShift, execution.marketStructureShift?.timeframe || '', {
      visible: isVisibleElement('marketStructureShift'),
      selected: isSelectedElement('marketStructureShift'),
    }),
    renderExecutionElement('Stop Loss', execution.stopLoss, execution.stopLoss?.timeframe || '', {
      visible: isVisibleElement('stopLoss'),
      selected: isSelectedElement('stopLoss'),
    }),
    ...(Array.isArray(execution.targets) ? execution.targets : []).map((target) => (
      renderExecutionElement(target.label || 'Target', target, [target.targetType, target.timeframe].filter(Boolean).join(' · '), {
        visible: isVisibleElement(target.role || target.id),
        selected: isSelectedElement(target.role || target.id),
      })
    )),
  ].filter(Boolean);
  return `
    <div class="order-review-compact order-setup-execution">
      <div class="order-review-compact-title">Execution</div>
      ${rows.length ? rows.join('') : '<div class="drawing-set-empty">No execution elements.</div>'}
    </div>
  `;
}

function getReasonRows(record) {
  const reasons = Array.isArray(record.reasons) && record.reasons.length
    ? record.reasons
    : [{ id: 'reason_1', category: LIVE_RECORD_REASON_CATEGORIES.OTHER, note: '', refs: [] }];
  return reasons;
}

function renderReasonRows(record) {
  const rows = getReasonRows(record).map((reason, reasonIndex) => {
    const refs = Array.isArray(reason.refs) ? reason.refs : [];
    return `
      <div class="order-setup-reason-card">
        <div class="order-setup-reason-title-row">
          <div class="order-setup-reason-title">Reason ${reasonIndex + 1}</div>
          <select
            class="inspector-input inspector-mini-select order-setup-reason-category"
            data-inspector-action="live-record-reason-category"
            data-live-record-id="${escapeHtml(record.id)}"
            data-reason-index="${reasonIndex}"
          >
            ${Object.values(LIVE_RECORD_REASON_CATEGORIES).map((category) => (
              `<option value="${escapeHtml(category)}" ${category === reason.category ? 'selected' : ''}>${escapeHtml(titleCase(category))}</option>`
            )).join('')}
          </select>
        </div>
        <textarea class="inspector-textarea" data-inspector-action="live-record-reason-note" data-live-record-id="${escapeHtml(record.id)}" data-reason-index="${reasonIndex}" rows="2" placeholder="Write live record reason">${escapeHtml(reason.note || '')}</textarea>
        <div class="order-review-ref-list">${refs.length ? refs.map((ref) => (
          `<div class="order-review-ref-row"><span>${escapeHtml(`${titleCase(ref.role, 'Context')} · ${titleCase(ref.type, 'Ref')} · ${ref.id || '—'}`)}</span></div>`
        )).join('') : '<div class="drawing-set-empty">No linked objects.</div>'}</div>
      </div>
    `;
  });

  return `
    <div class="order-review-explanation">
      <div class="order-review-compact-title">Reasons</div>
      ${rows.join('')}
      <button class="inspector-secondary order-setup-add-reason" data-inspector-action="live-record-reason-add" data-live-record-id="${escapeHtml(record.id)}" type="button">Add Reason</button>
    </div>
  `;
}

function renderResultPanel(record, liveSet) {
  const result = liveSet?.result || {};
  return `
    <div class="order-review-quick-edit">
      <div class="order-review-compact-title">Result</div>
      <div class="order-review-quick-edit-body">
        ${controlField(
          'Result',
          `<select class="inspector-input inspector-mini-select" data-inspector-action="live-record-result-status" data-live-record-id="${escapeHtml(record.id)}">
            ${Object.values(LIVE_RECORD_RESULT_STATUSES).map((status) => (
              `<option value="${escapeHtml(status)}" ${status === record.result?.status ? 'selected' : ''}>${escapeHtml(titleCase(status))}</option>`
            )).join('')}
          </select>`
        )}
        ${field('Exit Time', [formatTime(result.exitTimestamp), result.exitTimeframe || ''].filter(Boolean).join(' · '))}
        ${field('Exit Price', formatNumber(result.exitPrice))}
        ${controlField(
          'Note',
          `<textarea class="inspector-textarea" data-inspector-action="live-record-result-note" data-live-record-id="${escapeHtml(record.id)}" rows="2" placeholder="Result note">${escapeHtml(record.result?.note || '')}</textarea>`
        )}
      </div>
    </div>
  `;
}

function renderLiveRecord(record) {
  const liveSet = createLiveRecordSet(record);
  if (!liveSet) return '<div class="drawing-set-empty">No active Live Record.</div>';
  return `
    <div class="inspector-evidence-list">
      ${renderActiveHeader(record, liveSet)}
      ${renderDisplayPanel(record)}
      ${renderSummaryPanel(record)}
      ${renderAnchorPanel(liveSet)}
      ${renderExecutionPanel(liveSet)}
      ${renderReasonRows(record)}
      ${renderResultPanel(record, liveSet)}
      <div class="inspector-id">${escapeHtml(record.id)}</div>
    </div>
  `;
}

export function renderLiveRecordDetailPanel(record) {
  const content = record
    ? renderLiveRecord(record)
    : '<div class="drawing-set-empty">Live Record not found.</div>';
  return `
    <section class="inspector-section" data-inspector-section="live-record-detail">
      <div class="inspector-section-title">Live Record Detail</div>
      ${content}
    </section>
  `;
}
