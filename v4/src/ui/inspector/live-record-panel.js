import {
  canTransitionLiveRecordStatus,
  getLiveRecordAllowedNextStatuses,
  getLiveRecordStatusLabel,
  needsLiveRecordReview,
} from '../../live-record/live-record-lifecycle.js';
import {
  LIVE_RECORD_EXIT_TYPES,
  LIVE_RECORD_REASON_CATEGORIES,
} from '../../live-record/live-record-types.js';
import {
  getActiveDefinitions,
  ORDER_ENTRY_PATTERN_DEFINITIONS,
  ORDER_ENTRY_SESSION_DEFINITIONS,
} from '../../order/order-review-types.js';
import { getSetupSetById } from '../../order/setup-set.js';
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

function renderDefinitionOptions(definitions, selectedValue) {
  return getActiveDefinitions(definitions)
    .map((definition) =>
      `<option value="${escapeHtml(definition.value)}" ${definition.value === selectedValue ? 'selected' : ''}>${escapeHtml(definition.label)}</option>`
    )
    .join('');
}

function liveRecordFieldAttrs(record, fieldName) {
  return [
    'data-inspector-action="live-record-entry-context-field"',
    `data-live-record-id="${escapeHtml(record.id)}"`,
    `data-live-record-field="${escapeHtml(fieldName)}"`,
  ].join(' ');
}

function renderEntryPatternCheckboxes(record, selectedPatterns = []) {
  const selected = new Set(Array.isArray(selectedPatterns) ? selectedPatterns : []);
  return `
    <div class="order-entry-patterns">
      ${getActiveDefinitions(ORDER_ENTRY_PATTERN_DEFINITIONS)
        .map((definition) => `
          <label class="order-entry-pattern-option">
            <input
              ${liveRecordFieldAttrs(record, 'patterns')}
              data-live-record-entry-pattern="${escapeHtml(definition.value)}"
              type="checkbox"
              ${selected.has(definition.value) ? 'checked' : ''}
            />
            <span>${escapeHtml(definition.label)}</span>
          </label>
        `)
        .join('')}
    </div>
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
  if (normalized === 'chart-note') return 'Chart Note';
  if (normalized === 'order-setup') return 'Order Setup';
  if (normalized === 'time-reaction') return 'Time Reaction';
  return type ? titleCase(type, 'Ref') : 'Ref';
}

function formatRefRole(role) {
  const normalized = String(role || 'context').toLowerCase();
  if (normalized === 'context') return 'Context';
  if (normalized === 'setup') return 'Setup';
  if (normalized === 'trigger') return 'Trigger';
  if (normalized === 'execution') return 'Execution';
  if (normalized === 'review') return 'Review';
  return titleCase(normalized, 'Context');
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
        <span>${escapeHtml(record.instrument || liveSet?.instrument || 'NQ')} · ${escapeHtml(getLiveRecordStatusLabel(record.status))}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml([
        needsLiveRecordReview(record) ? 'Needs Review' : 'Live Record',
        state,
        `Updated ${formatDateTimeMs(record.updatedAt)}`,
      ].join(' · '))}</div>
      ${renderLifecycleControls(record)}
    </div>
  `;
}

function getLifecycleActionLabel(status) {
  if (status === 'active') return 'Reopen';
  if (status === 'cancelled') return 'Cancel';
  if (status === 'closed') return 'Close';
  if (status === 'reviewed') return 'Mark Reviewed';
  return getLiveRecordStatusLabel(status);
}

function renderLifecycleControls(record) {
  const nextStatuses = getLiveRecordAllowedNextStatuses(record.status);
  if (!nextStatuses.length) return '';
  return `
    <div class="order-review-actions order-review-compact-actions">
      ${nextStatuses.map((status) => (
        `<button
          class="inspector-secondary"
          data-inspector-action="live-record-status"
          data-live-record-id="${escapeHtml(record.id)}"
          data-live-record-status="${escapeHtml(status)}"
          type="button"
        >${escapeHtml(getLifecycleActionLabel(status))}</button>`
      )).join('')}
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
  return `
    <div class="order-review-compact order-review-anchor-panel">
      <div class="order-review-compact-title">Anchor</div>
      ${field('Direction', formatDirection(liveSet?.direction))}
      ${field('Time', formatTime(anchor.timestamp))}
      ${field('TF', anchor.timeframe || '—')}
      ${field('Price', formatNumber(anchor.price))}
    </div>
  `;
}

function renderLinkedSetupPanel(record) {
  const setupId = record.orderSetupId || '';
  const setup = setupId ? getSetupSetById(setupId) : null;
  const setupLabel = setup
    ? `Order Setup · ${shortRefId(setup.id)}`
    : setupId
      ? `Missing Order Setup · ${shortRefId(setupId)}`
      : 'No linked Order Setup';
  return `
    <div class="order-review-compact order-review-linked-setup-panel">
      <div class="order-review-compact-title">Linked Order Setup</div>
      <div class="drawing-set-meta">${escapeHtml(setupLabel)}</div>
      <div class="order-review-actions order-review-compact-actions">
        ${setup ? `<button
          class="inspector-secondary"
          data-inspector-action="calendar-object-open"
          data-object-type="order-setup"
          data-object-id="${escapeHtml(setup.id)}"
          type="button"
        >Open Setup</button>` : ''}
        <button class="inspector-secondary" data-inspector-action="live-record-link-active-setup" data-live-record-id="${escapeHtml(record.id)}" type="button">Link Active Setup</button>
        ${setupId ? `<button class="inspector-secondary" data-inspector-action="live-record-unlink-setup" data-live-record-id="${escapeHtml(record.id)}" type="button">Unlink Setup</button>` : ''}
      </div>
    </div>
  `;
}

function formatExecutionMetaPart(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d+[A-Z]$/.test(text) || text === 'D') return text;
  return titleCase(text, text);
}

function formatExecutionMeta(value) {
  return String(value || '')
    .split('·')
    .map(formatExecutionMetaPart)
    .filter(Boolean)
    .join(' · ');
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatHoldingDuration(seconds) {
  const parsed = toNumberOrNull(seconds);
  if (parsed === null || parsed < 0) return '—';
  let remaining = Math.floor(parsed);
  const days = Math.floor(remaining / 86400);
  remaining %= 86400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function deriveLiveResultMetrics(liveSet) {
  const entry = liveSet?.execution?.entry || {};
  const stopLoss = liveSet?.execution?.stopLoss || {};
  const result = liveSet?.result || {};
  const entryPrice = toNumberOrNull(entry.price);
  const stopPrice = toNumberOrNull(stopLoss.price);
  const exitPrice = toNumberOrNull(result.exitPrice);
  const entryTimestamp = toNumberOrNull(entry.timestamp);
  const exitTimestamp = toNumberOrNull(result.exitTimestamp);
  const isShort = liveSet?.direction === 'short';
  const risk = entryPrice !== null && stopPrice !== null ? Math.abs(entryPrice - stopPrice) : null;
  const points = entryPrice !== null && exitPrice !== null
    ? (isShort ? entryPrice - exitPrice : exitPrice - entryPrice)
    : null;
  const holdingSeconds = entryTimestamp !== null && exitTimestamp !== null && exitTimestamp >= entryTimestamp
    ? exitTimestamp - entryTimestamp
    : null;
  return {
    hold: formatHoldingDuration(holdingSeconds),
    risk,
    points,
    r: risk !== null && risk > 0 && points !== null ? points / risk : null,
  };
}

function getLiveRecordExitType(record = {}) {
  const explicit = record.result?.exitType || '';
  if (explicit) return explicit;
  if (record.result?.status === 'win') return LIVE_RECORD_EXIT_TYPES.PROFIT;
  if (record.result?.status === 'loss') return LIVE_RECORD_EXIT_TYPES.STOP_LOSS;
  return LIVE_RECORD_EXIT_TYPES.UNKNOWN;
}

function renderExitTypeOptions(selectedExitType) {
  const labels = {
    [LIVE_RECORD_EXIT_TYPES.UNKNOWN]: 'Unknown',
    [LIVE_RECORD_EXIT_TYPES.PROFIT]: 'Profit',
    [LIVE_RECORD_EXIT_TYPES.STOP_LOSS]: 'Stop Loss',
  };
  return Object.values(LIVE_RECORD_EXIT_TYPES)
    .map((type) => `<option value="${escapeHtml(type)}" ${type === selectedExitType ? 'selected' : ''}>${escapeHtml(labels[type] || titleCase(type))}</option>`)
    .join('');
}

function renderExecutionElement(label, element = {}, extra = '', state = {}) {
  if (!element?.complete) return '';
  const visible = state.visible !== false && element.visible !== false;
  const selected = Boolean(state.selected);
  const visibilityClass = visible ? 'is-visible' : 'is-hidden';
  const endLabel = element.endTimestamp ? `End: ${formatTime(element.endTimestamp)}` : '';
  const stateLabels = [visible ? '' : 'Hidden', selected ? 'Selected' : ''].filter(Boolean).join(' · ');
  const meta = [formatExecutionMeta(extra), endLabel, stateLabels].filter(Boolean).join(' · ') || '—';
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

function renderEntryContextPanel(record) {
  const entryContext = record.entryContext || {};
  return `
    <div class="order-review-compact order-entry-context">
      <div class="order-review-compact-title">Entry Context</div>
      ${controlField('Pattern', renderEntryPatternCheckboxes(record, entryContext.patterns))}
      ${controlField(
        'Session',
        `<select class="inspector-input" ${liveRecordFieldAttrs(record, 'session')}>
          ${renderDefinitionOptions(ORDER_ENTRY_SESSION_DEFINITIONS, entryContext.session || 'unknown')}
        </select>`
      )}
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
          `<div class="order-review-ref-row"><span>${escapeHtml(summarizeLinkedRef(ref))}</span></div>`
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
  const metrics = deriveLiveResultMetrics(liveSet);
  const canMarkReviewed = canTransitionLiveRecordStatus(record.status, 'reviewed');
  const canReopenReviewed = record.status === 'reviewed' && canTransitionLiveRecordStatus(record.status, 'active');
  const reviewedToggleDisabled = record.status === 'reviewed' ? !canReopenReviewed : !canMarkReviewed;
  return `
    <div class="order-review-quick-edit">
      <div class="order-review-compact-title">Result</div>
      <div class="order-review-quick-edit-body">
        ${controlField(
          'Result',
          `<select class="inspector-input inspector-mini-select" data-inspector-action="live-record-result-exit-type" data-live-record-id="${escapeHtml(record.id)}">
            ${renderExitTypeOptions(getLiveRecordExitType(record))}
          </select>`
        )}
        ${field('Exit Time', [formatTime(result.exitTimestamp), result.exitTimeframe || ''].filter(Boolean).join(' · '))}
        ${field('Exit Price', formatNumber(result.exitPrice))}
        ${field('Hold', metrics.hold)}
        ${field('Risk', formatNumber(metrics.risk))}
        ${field('Points', formatNumber(metrics.points))}
        ${field('R', formatNumber(metrics.r))}
        ${controlField(
          'Note',
          `<textarea class="inspector-textarea" data-inspector-action="live-record-result-note" data-live-record-id="${escapeHtml(record.id)}" rows="2" placeholder="Result note">${escapeHtml(record.result?.note || '')}</textarea>`
        )}
        <label class="inspector-toggle">
          <input
            data-inspector-action="live-record-reviewed-toggle"
            data-live-record-id="${escapeHtml(record.id)}"
            type="checkbox"
            ${record.status === 'reviewed' ? 'checked' : ''}
            ${reviewedToggleDisabled ? 'disabled' : ''}
          />
          <span>Reviewed</span>
        </label>
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
      ${renderLinkedSetupPanel(record)}
      ${renderExecutionPanel(liveSet)}
      ${renderEntryContextPanel(record)}
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
