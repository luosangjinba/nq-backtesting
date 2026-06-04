import {
  getActiveDefinitions,
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_ENTRY_PATTERN_DEFINITIONS,
  ORDER_ENTRY_SESSION_DEFINITIONS,
  ORDER_RESULT_DEFINITIONS,
  ORDER_RESULTS,
} from '../../order/order-review-types.js';
import { createSetupSetFromOrderReview } from '../../order/setup-set.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
} from './render-utils.js';

function labelFromDefinitions(definitions, value) {
  return definitions.find((definition) => definition.value === value)?.label || value || '—';
}

function renderDefinitionOptions(definitions, selectedValue) {
  return getActiveDefinitions(definitions)
    .map(
      (definition) =>
        `<option value="${escapeHtml(definition.value)}" ${definition.value === selectedValue ? 'selected' : ''}>${escapeHtml(definition.label)}</option>`
    )
    .join('');
}

function formatDirection(direction) {
  if (direction === 'long') return 'Long';
  if (direction === 'short') return 'Short';
  return 'Unknown';
}

function formatTimestampInput(timestamp) {
  const formatted = formatTime(timestamp);
  return formatted === '—' ? '' : formatted;
}

function orderFieldAttrs(order, sectionName, fieldName) {
  return [
    'data-inspector-action="order-review-edit-field"',
    `data-order-review-id="${escapeHtml(order.id)}"`,
    `data-order-review-section="${escapeHtml(sectionName)}"`,
    `data-order-review-field="${escapeHtml(fieldName)}"`,
  ].join(' ');
}

function renderSelect(order, sectionName, fieldName, definitions, value) {
  return `
    <select class="inspector-input" ${orderFieldAttrs(order, sectionName, fieldName)}>
      ${renderDefinitionOptions(definitions, value)}
    </select>
  `;
}

function renderEntryPatternCheckboxes(order, selectedPatterns = []) {
  const selected = new Set(Array.isArray(selectedPatterns) ? selectedPatterns : []);
  return `
    <div class="order-entry-patterns">
      ${getActiveDefinitions(ORDER_ENTRY_PATTERN_DEFINITIONS)
        .map(
          (definition) => `
            <label class="order-entry-pattern-option">
              <input
                ${orderFieldAttrs(order, 'entryPlan', 'entryPatterns')}
                data-order-entry-pattern="${escapeHtml(definition.value)}"
                type="checkbox"
                ${selected.has(definition.value) ? 'checked' : ''}
              />
              <span>${escapeHtml(definition.label)}</span>
            </label>
          `
        )
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

function summarizeLinkedRef(ref = {}, { includeId = true } = {}) {
  const parts = [
    formatRefRole(ref.role),
    formatRefType(getRefType(ref)),
    getRefSource(ref),
    includeId ? shortRefId(getRefId(ref)) : '',
  ].filter(Boolean);
  return parts.join(' · ');
}


function renderResultOptions(selectedResult) {
  return renderDefinitionOptions(ORDER_RESULT_DEFINITIONS, selectedResult);
}

function renderActiveHeader(order, setupSet) {
  const reversal = setupSet?.orderElements?.reversal || {};
  const direction = formatDirection(setupSet?.direction);
  const state = order.display?.hidden ? 'Hidden' : 'Visible';
  const title = [
    direction,
    formatTime(reversal.timestamp),
    reversal.timeframe || '—',
  ].filter(Boolean).join(' · ');

  return `
    <div class="inspector-evidence-row order-review-row active">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(title)}</span>
        <span>${escapeHtml(order.instrument || setupSet?.instrument || 'NQ')}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml(`Active Setup · ${state} · Updated ${formatDateTimeMs(order.updatedAt)}`)}</div>
    </div>
  `;
}

function renderActiveDisplayPanel(order) {
  const showRiskRewardBox = order.display?.showRiskRewardBox !== false;
  return `
    <div class="order-review-compact order-review-display-panel">
      <div class="order-review-compact-title">Display</div>
      <label class="inspector-toggle">
        <input
          data-inspector-action="order-review-display-field"
          data-order-review-id="${escapeHtml(order.id)}"
          data-order-review-field="showRiskRewardBox"
          type="checkbox"
          ${showRiskRewardBox ? 'checked' : ''}
        />
        <span>Risk / Reward Box</span>
      </label>
    </div>
  `;
}

function renderAnchorPanel(setupSet) {
  const reversal = setupSet?.orderElements?.reversal || {};
  const direction = setupSet?.direction === 'short' ? 'Bearish' : setupSet?.direction === 'long' ? 'Bullish' : 'Unknown';
  return `
    <div class="order-review-compact order-review-anchor-panel">
      <div class="order-review-compact-title">Anchor</div>
      ${field('Reversal', direction)}
      ${field('Time', formatTime(reversal.timestamp))}
      ${field('TF', reversal.timeframe || '—')}
      ${field('Price', formatNumber(reversal.price))}
    </div>
  `;
}

function getElementLabel(role) {
  if (role === 'entry') return 'Entry';
  if (role === 'stopLoss') return 'Stop Loss';
  if (role === 'target1') return 'Target 1';
  if (role === 'target2') return 'Target 2';
  if (role === 'target3') return 'Target 3';
  if (role === 'finalTarget') return 'Final Target';
  return role || 'Element';
}

function formatExecutionTimeRange(element) {
  const start = formatTime(element?.timestamp);
  const end = element?.endTimestamp ? formatTime(element.endTimestamp) : '';
  return end ? `${start} -> ${end}` : start;
}

function renderExecutionElementRow(order, role, element, selectedElement, extra = '') {
  if (!element?.complete) return '';
  const isSelected = selectedElement?.setupId === order.id && selectedElement?.element === role;
  const isVisible = order.display?.elementVisibility?.[role] !== false;
  return `
    <div class="order-setup-execution-row${isSelected ? ' active' : ''}${isVisible ? '' : ' is-hidden'}" data-inspector-action="order-setup-element-select" data-order-review-id="${escapeHtml(order.id)}" data-order-setup-element="${escapeHtml(role)}" role="button" tabindex="0" aria-pressed="${isSelected ? 'true' : 'false'}">
      <button class="order-setup-execution-visibility ${isVisible ? 'is-visible' : 'is-hidden'}" data-inspector-action="order-setup-element-toggle-visibility" data-order-review-id="${escapeHtml(order.id)}" data-order-setup-element="${escapeHtml(role)}" type="button" title="${isVisible ? 'Hide' : 'Show'} ${escapeHtml(getElementLabel(role))}" aria-label="${isVisible ? 'Hide' : 'Show'} ${escapeHtml(getElementLabel(role))}"></button>
      <div class="order-setup-execution-summary">
        <span class="order-setup-execution-type">${escapeHtml(getElementLabel(role))}</span>
        <strong class="order-setup-execution-price">${escapeHtml(formatNumber(element.price))}</strong>
        <span class="order-setup-execution-kind">${escapeHtml(extra || '—')}</span>
      </div>
      <span class="order-setup-execution-time">${escapeHtml(formatExecutionTimeRange(element))}</span>
      <button class="order-setup-execution-delete" data-inspector-action="order-setup-element-delete" data-order-review-id="${escapeHtml(order.id)}" data-order-setup-element="${escapeHtml(role)}" type="button" title="Delete ${escapeHtml(getElementLabel(role))}">X</button>
    </div>
  `;
}

function renderExecutionPanel(order, setupSet, selectedElement) {
  const elements = setupSet?.orderElements || {};
  const entry = elements.entry || {};
  const stopLoss = elements.stopLoss || {};
  const targets = Array.isArray(elements.targets) ? elements.targets : [];
  const rows = [
    renderExecutionElementRow(order, 'entry', entry, selectedElement, labelFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS, entry.model)),
    renderExecutionElementRow(order, 'stopLoss', stopLoss, selectedElement, stopLoss.reason || ''),
    ...targets.map((target) => renderExecutionElementRow(order, target.role, target, selectedElement, target.targetType || '')),
  ].filter(Boolean);

  return `
    <div class="order-review-compact order-setup-execution">
      <div class="order-review-compact-title">Execution</div>
      ${rows.length ? rows.join('') : '<div class="drawing-set-empty">No execution elements.</div>'}
    </div>
  `;
}

function renderEntryContextPanel(order) {
  const entry = order.entryPlan || {};
  return `
    <div class="order-review-compact order-entry-context">
      <div class="order-review-compact-title">Entry Context</div>
      ${controlField('Pattern', renderEntryPatternCheckboxes(order, entry.entryPatterns))}
      ${controlField('Session', renderSelect(order, 'entryPlan', 'entrySession', ORDER_ENTRY_SESSION_DEFINITIONS, entry.entrySession))}
    </div>
  `;
}

function getOrderReviewReasons(order) {
  const reasons = Array.isArray(order.setupThesis?.reasons) ? order.setupThesis.reasons : [];
  if (reasons.length) return reasons;
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
  const note = order.setupThesis?.narrative || '';
  if (!note && !refs.length) return [{ id: 'reason_1', note: '', refs: [] }];
  return [{ id: 'reason_1', note, refs }];
}

function isReasonEmpty(reason = {}) {
  return !reason.note && !(Array.isArray(reason.refs) && reason.refs.length);
}

function renderReasonRows(order, setupSet, options = {}) {
  const reasons = getOrderReviewReasons(order);
  const reasonRows = reasons.map((reason, reasonIndex) => {
    const refs = Array.isArray(reason.refs) ? reason.refs : [];
    const isPicking = options.pendingReasonRefPick?.orderReviewId === order.id
      && Number(options.pendingReasonRefPick?.reasonIndex) === reasonIndex;
    const refRows = refs.map((ref, refIndex) => `
      <div class="order-review-ref-row">
        <span title="${escapeHtml(getRefId(ref) || '—')}">${escapeHtml(summarizeLinkedRef(ref))}</span>
        <button class="order-review-ref-locate" data-inspector-action="order-review-ref-locate" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" data-ref-index="${refIndex}" type="button" title="Locate linked object">L</button>
        <button class="order-review-ref-delete" data-inspector-action="order-review-ref-remove" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" data-ref-index="${refIndex}" type="button" title="Remove linked object">X</button>
      </div>
    `);
    return `
      <div class="order-setup-reason-card">
        <div class="order-setup-reason-title-row">
          <div class="order-setup-reason-title">Reason ${reasonIndex + 1}</div>
          ${reasonIndex > 0 && isReasonEmpty(reason) ? `<button class="inspector-mini-btn order-setup-reason-delete" data-inspector-action="order-review-reason-delete" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" type="button">X</button>` : ''}
        </div>
        <textarea class="inspector-textarea" data-inspector-action="order-review-reason-note" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" rows="2" placeholder="Write setup reason">${escapeHtml(reason.note || '')}</textarea>
        <div class="order-review-ref-list">${refRows.join('') || '<div class="drawing-set-empty">No linked objects.</div>'}</div>
        <div class="order-review-ref-actions">
          <button
            class="inspector-mini-btn"
            data-inspector-action="${isPicking ? 'order-review-ref-pick-cancel' : 'order-review-ref-pick-start'}"
            data-order-review-id="${escapeHtml(order.id)}"
            data-reason-index="${reasonIndex}"
            type="button"
          >${isPicking ? 'Cancel Select' : 'Select Object'}</button>
        </div>
      </div>
    `;
  });

  return `
    <div class="order-review-explanation">
      <div class="order-review-compact-title">Reasons</div>
      ${reasonRows.join('')}
      <button class="inspector-secondary order-setup-add-reason" data-inspector-action="order-review-reason-add" data-order-review-id="${escapeHtml(order.id)}" type="button">Add Reason</button>
    </div>
  `;
}

function renderResultPanel(order, setupSet) {
  const result = setupSet?.orderElements?.result || {};
  const exitTimestamp = order.resultReview?.exitTimestamp ?? result.timestamp;
  return `
    <div class="order-review-quick-edit">
      <div class="order-review-compact-title">Result</div>
      <div class="order-review-quick-edit-body">
        ${controlField(
          'Result',
          `<select class="inspector-input inspector-mini-select" data-inspector-action="order-review-result" data-order-review-id="${escapeHtml(order.id)}">
            ${renderResultOptions(order.resultReview?.result || ORDER_RESULTS.UNKNOWN)}
          </select>`
        )}
        ${controlField(
          'Exit Time',
          `<div class="order-review-inline-control">
            <input class="inspector-input" data-inspector-action="order-review-result-exit-time" data-order-review-id="${escapeHtml(order.id)}" type="text" value="${escapeHtml(formatTimestampInput(exitTimestamp))}" placeholder="YYYY-MM-DD HH:mm" />
            <button class="inspector-mini-btn" data-inspector-action="order-review-result-exit-pick" data-order-review-id="${escapeHtml(order.id)}" type="button">Pick</button>
          </div>`
        )}
        ${field('Exit Price', formatNumber(result.price))}
        ${field('Hold', result.holdingDuration || '—')}
        ${field('Points', formatNumber(result.outcomePoints))}
        ${field('R', formatNumber(result.outcomeR))}
        ${controlField(
          'Note',
          `<textarea class="inspector-textarea" data-inspector-action="order-review-note" data-order-review-id="${escapeHtml(order.id)}" rows="2" placeholder="Result note">${escapeHtml(order.note || '')}</textarea>`
        )}
      </div>
    </div>
  `;
}

function renderActiveOrderSetup(order, options = {}) {
  const setupSet = createSetupSetFromOrderReview(order);
  if (!setupSet) return '<div class="drawing-set-empty">No active Order Setup.</div>';
  return `
    <div class="inspector-evidence-list">
      ${renderActiveHeader(order, setupSet)}
      ${renderActiveDisplayPanel(order)}
      ${renderAnchorPanel(setupSet)}
      ${renderExecutionPanel(order, setupSet, options.selectedOrderSetupElement)}
      ${renderEntryContextPanel(order)}
      ${renderReasonRows(order, setupSet, options)}
      ${renderResultPanel(order, setupSet)}
      <div class="inspector-id">${escapeHtml(order.id)}</div>
    </div>
  `;
}

export function renderOrderReviewDetailPanel(order, options = {}) {
  const content = order
    ? renderActiveOrderSetup(order, options)
    : '<div class="drawing-set-empty">Order Setup not found.</div>';
  return `
    <section class="inspector-section" data-inspector-section="order-setup-detail">
      <div class="inspector-section-title">Order Setup Detail</div>
      ${content}
    </section>
  `;
}
