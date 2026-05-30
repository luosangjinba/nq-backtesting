import {
  getActiveDefinitions,
  ORDER_CONFIDENCE_DEFINITIONS,
  ORDER_DIRECTION_DEFINITIONS,
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_EXIT_REASON_DEFINITIONS,
  ORDER_EVENT_TYPE_DEFINITIONS,
  ORDER_RESULT_DEFINITIONS,
  ORDER_RESULTS,
  ORDER_STOP_REASON_DEFINITIONS,
  ORDER_TARGET_REACHED_DEFINITIONS,
  ORDER_TARGET_TYPE_DEFINITIONS,
  ORDER_TIMEFRAME_DEFINITIONS,
} from '../../order/order-review-store.js';
import { createSetupSetFromOrderReview } from '../../order/setup-set.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
  section,
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

function getTimestampInputValue(timestamp) {
  if (timestamp === undefined || timestamp === null || timestamp === '') return '';
  return formatTime(timestamp);
}

function orderFieldAttrs(order, sectionName, fieldName) {
  return [
    'data-inspector-action="order-review-edit-field"',
    `data-order-review-id="${escapeHtml(order.id)}"`,
    `data-order-review-section="${escapeHtml(sectionName)}"`,
    `data-order-review-field="${escapeHtml(fieldName)}"`,
  ].join(' ');
}

function renderTextInput(order, sectionName, fieldName, value, placeholder = '') {
  return `<input class="inspector-input" ${orderFieldAttrs(order, sectionName, fieldName)} type="text" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" />`;
}

function renderNumberInput(order, sectionName, fieldName, value, placeholder = '') {
  return `<input class="inspector-input" ${orderFieldAttrs(order, sectionName, fieldName)} type="number" step="0.25" value="${value === null || value === undefined ? '' : escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;
}

function renderPriceInput(order, sectionName, fieldName, value, placeholder = 'price') {
  return `
    <div class="inspector-inline-control">
      ${renderNumberInput(order, sectionName, fieldName, value, placeholder)}
      <button class="inspector-mini-btn" data-inspector-action="order-review-pick-price" data-order-review-id="${escapeHtml(order.id)}" data-order-review-section="${escapeHtml(sectionName)}" data-order-review-field="${escapeHtml(fieldName)}" type="button">Pick</button>
    </div>
  `;
}

function renderTimestampInput(order, sectionName, fieldName, value) {
  return `
    <div class="inspector-inline-control">
      ${renderTextInput(order, sectionName, fieldName, getTimestampInputValue(value), 'YYYY-MM-DD HH:mm')}
      <button class="inspector-mini-btn" data-inspector-action="order-review-pick-time" data-order-review-id="${escapeHtml(order.id)}" data-order-review-section="${escapeHtml(sectionName)}" data-order-review-field="${escapeHtml(fieldName)}" type="button">Pick</button>
    </div>
  `;
}

function renderTextarea(order, sectionName, fieldName, value, placeholder = '') {
  return `<textarea class="inspector-textarea" ${orderFieldAttrs(order, sectionName, fieldName)} rows="3" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || '')}</textarea>`;
}

function renderSelect(order, sectionName, fieldName, definitions, value) {
  return `
    <select class="inspector-input" ${orderFieldAttrs(order, sectionName, fieldName)}>
      ${renderDefinitionOptions(definitions, value)}
    </select>
  `;
}

function renderCheckbox(order, sectionName, fieldName, checked) {
  return `
    <label class="inspector-toggle">
      <input ${orderFieldAttrs(order, sectionName, fieldName)} type="checkbox" ${checked ? 'checked' : ''} />
      <span>Enabled</span>
    </label>
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

function renderLinkedRefs(refs = []) {
  if (!Array.isArray(refs) || !refs.length) return field('Refs', '—');
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">Refs</div>
      <div class="inspector-field-value">
        ${refs.map((ref) => `<div>${escapeHtml(summarizeLinkedRef(ref))}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderLinkedRefsEditor(order) {
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
  const rows = refs.length
    ? refs
        .map(
          (ref, index) => `
            <div class="order-review-ref-row">
              <span title="${escapeHtml(getRefId(ref) || '—')}">${escapeHtml(summarizeLinkedRef(ref))}</span>
              <button class="inspector-mini-btn" data-inspector-action="order-review-ref-remove" data-order-review-id="${escapeHtml(order.id)}" data-ref-index="${index}" type="button">Remove</button>
            </div>
          `
        )
        .join('')
    : '<div class="drawing-set-empty">No linked refs.</div>';

  return `
    <div class="order-review-ref-editor">
      <div class="order-review-compact-title">Linked Refs</div>
      <div class="order-review-ref-list">${rows}</div>
      <div class="order-review-ref-actions">
        <button class="inspector-mini-btn" data-inspector-action="order-review-ref-add-selected-pda" data-order-review-id="${escapeHtml(order.id)}" type="button">Add PDA</button>
        <button class="inspector-mini-btn" data-inspector-action="order-review-ref-add-selected-segment" data-order-review-id="${escapeHtml(order.id)}" type="button">Add Segment</button>
        <button class="inspector-mini-btn" data-inspector-action="order-review-ref-add-selected-composite" data-order-review-id="${escapeHtml(order.id)}" type="button">Add Composite</button>
        <button class="inspector-mini-btn" data-inspector-action="order-review-ref-add-selected-smt" data-order-review-id="${escapeHtml(order.id)}" type="button">Add SMT</button>
      </div>
    </div>
  `;
}

function renderSetupThesis(order) {
  const setup = order.setupThesis || {};
  return `
    <div class="order-review-compact">
      <div class="order-review-compact-title">Setup Thesis</div>
      ${field('Event', labelFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS, setup.primaryEventType))}
      ${field('TF', setup.primaryEventTimeframe || '—')}
      ${field('Time', formatTime(setup.primaryEventTimestamp))}
      ${field('Price', formatNumber(setup.primaryEventPrice))}
      ${field('Confidence', setup.confidence || '—')}
      ${field('Low TF Warn', setup.lowTimeframeWarning ? 'yes' : 'no')}
      ${renderLinkedRefs(setup.linkedObjectRefs)}
      ${setup.higherTimeframeJustification ? field('HTF', setup.higherTimeframeJustification) : ''}
      ${setup.narrative ? field('Narrative', setup.narrative) : ''}
    </div>
  `;
}

function renderEntryPlan(order) {
  const entry = order.entryPlan || {};
  return `
    <div class="order-review-compact">
      <div class="order-review-compact-title">Entry Plan</div>
      ${field('Direction', formatDirection(entry.direction))}
      ${field('Entry', formatTime(entry.entryTimestamp))}
      ${field('Price', formatNumber(entry.entryPrice))}
      ${field('Model', labelFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS, entry.entryModel))}
      ${field('TF', entry.entryTimeframe || '—')}
      ${field('Stop', formatNumber(entry.stopLoss))}
      ${field('Risk', formatNumber(entry.riskPoints))}
      ${field('Target', `${entry.selectedTargetType || '—'} / ${formatNumber(entry.finalTarget)}`)}
      ${entry.note ? field('Note', entry.note) : ''}
    </div>
  `;
}

function renderResultReview(order) {
  const result = order.resultReview || {};
  return `
    <div class="order-review-compact">
      <div class="order-review-compact-title">Result Review</div>
      ${field('Result', labelFromDefinitions(ORDER_RESULT_DEFINITIONS, result.result))}
      ${field('Exit', formatTime(result.exitTimestamp))}
      ${field('Price', formatNumber(result.exitPrice))}
      ${field('Expected', result.expectedTargetReached || '—')}
      ${field('Final', result.finalTargetReached || '—')}
      ${field('Points', formatNumber(result.outcomePoints))}
      ${field('R', formatNumber(result.outcomeR))}
      ${result.note ? field('Note', result.note) : ''}
    </div>
  `;
}

function renderResultOptions(selectedResult) {
  return renderDefinitionOptions(ORDER_RESULT_DEFINITIONS, selectedResult);
}

function formatTargetSummary(setupSet) {
  const targets = Array.isArray(setupSet?.orderElements?.targets) ? setupSet.orderElements.targets : [];
  if (!targets.length) return '—';
  return targets
    .map((target) => `${target.role}: ${formatNumber(target.price)}`)
    .join(' · ');
}

function renderSetupSetSummary(setupSet, isActive) {
  const elements = setupSet?.orderElements || {};
  const reversal = elements.reversal || {};
  const entry = elements.entry || {};
  const stopLoss = elements.stopLoss || {};
  const result = elements.result || {};
  const explanation = setupSet?.explanationElements || {};
  const explanationCount =
    (Array.isArray(explanation.refs) ? explanation.refs.length : 0) +
    (Array.isArray(explanation.manualEvents) ? explanation.manualEvents.length : 0) +
    (Array.isArray(explanation.notes) ? explanation.notes.length : 0);
  return `
    <div class="order-review-summary">
      ${field('State', isActive ? 'Active Setup Set' : 'Saved Setup Set')}
      ${field('Reversal', `${labelFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS, reversal.eventType)} · ${reversal.timeframe || '—'} · ${formatTime(reversal.timestamp)}`)}
      ${field('Entry', `${formatTime(entry.timestamp)} · ${formatNumber(entry.price)} · ${labelFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS, entry.model)}`)}
      ${field('Stop', formatNumber(stopLoss.price))}
      ${field('Targets', formatTargetSummary(setupSet))}
      ${field('Result', labelFromDefinitions(ORDER_RESULT_DEFINITIONS, result.status))}
      ${field('Explain', explanationCount ? String(explanationCount) : '—')}
    </div>
  `;
}

function summarizeRef(ref) {
  return summarizeLinkedRef(ref);
}

function summarizeManualEvent(event) {
  return [
    labelFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS, event.eventType),
    event.timeframe || '—',
    formatTime(event.timestamp),
    formatNumber(event.price),
    event.note || '',
  ].filter((part) => part && part !== '—').join(' · ');
}

function summarizeNote(note) {
  return `${note.scope || 'note'}: ${note.text || ''}`;
}

function renderExplanationElements(setupSet) {
  const explanation = setupSet?.explanationElements || {};
  const refs = Array.isArray(explanation.refs) ? explanation.refs : [];
  const manualEvents = Array.isArray(explanation.manualEvents) ? explanation.manualEvents : [];
  const notes = Array.isArray(explanation.notes) ? explanation.notes : [];
  if (!refs.length && !manualEvents.length && !notes.length) {
    return `
      <div class="order-review-explanation">
        <div class="order-review-compact-title">Explanation Elements</div>
        <div class="drawing-set-empty">No explanation elements.</div>
      </div>
    `;
  }
  const rows = [
    ...refs.map((ref) => ({ type: 'Ref', text: summarizeRef(ref) })),
    ...manualEvents.map((event) => ({ type: 'Manual', text: summarizeManualEvent(event) })),
    ...notes.map((note) => ({ type: 'Note', text: summarizeNote(note) })),
  ];
  return `
    <div class="order-review-explanation">
      <div class="order-review-compact-title">Explanation Elements</div>
      ${rows.map((row) => `
        <div class="order-review-explanation-row">
          <span>${escapeHtml(row.type)}</span>
          <strong>${escapeHtml(row.text || '—')}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSetupThesisEditor(order) {
  const setup = order.setupThesis || {};
  return `
    <details class="order-review-edit-section" open>
      <summary>Setup Thesis</summary>
      ${controlField('Event Time', renderTimestampInput(order, 'setupThesis', 'primaryEventTimestamp', setup.primaryEventTimestamp))}
      ${controlField('Event TF', renderSelect(order, 'setupThesis', 'primaryEventTimeframe', ORDER_TIMEFRAME_DEFINITIONS, setup.primaryEventTimeframe))}
      ${controlField('Event Type', renderSelect(order, 'setupThesis', 'primaryEventType', ORDER_EVENT_TYPE_DEFINITIONS, setup.primaryEventType))}
      ${controlField('Event Price', renderNumberInput(order, 'setupThesis', 'primaryEventPrice', setup.primaryEventPrice, 'price'))}
      ${controlField('Confidence', renderSelect(order, 'setupThesis', 'confidence', ORDER_CONFIDENCE_DEFINITIONS, setup.confidence))}
      ${controlField('Low TF Warn', renderCheckbox(order, 'setupThesis', 'lowTimeframeWarning', setup.lowTimeframeWarning))}
      ${renderLinkedRefsEditor(order)}
      ${controlField('HTF Reason', renderTextarea(order, 'setupThesis', 'higherTimeframeJustification', setup.higherTimeframeJustification, 'Higher timeframe reason'))}
      ${controlField('Narrative', renderTextarea(order, 'setupThesis', 'narrative', setup.narrative, 'Setup thesis narrative'))}
    </details>
  `;
}

function renderEntryPlanEditor(order) {
  const entry = order.entryPlan || {};
  return `
    <details class="order-review-edit-section">
      <summary>Entry Plan</summary>
      ${controlField('Direction', renderSelect(order, 'entryPlan', 'direction', ORDER_DIRECTION_DEFINITIONS, entry.direction))}
      ${controlField('Entry Time', renderTimestampInput(order, 'entryPlan', 'entryTimestamp', entry.entryTimestamp))}
      ${controlField('Entry TF', renderSelect(order, 'entryPlan', 'entryTimeframe', ORDER_TIMEFRAME_DEFINITIONS, entry.entryTimeframe))}
      ${controlField('Entry Price', renderPriceInput(order, 'entryPlan', 'entryPrice', entry.entryPrice))}
      ${controlField('Model', renderSelect(order, 'entryPlan', 'entryModel', ORDER_ENTRY_MODEL_DEFINITIONS, entry.entryModel))}
      ${controlField('Stop Loss', renderPriceInput(order, 'entryPlan', 'stopLoss', entry.stopLoss))}
      ${controlField('Stop Reason', renderSelect(order, 'entryPlan', 'stopReason', ORDER_STOP_REASON_DEFINITIONS, entry.stopReason))}
      ${controlField('Target Internal', renderNumberInput(order, 'entryPlan', 'targetInternal', entry.targetInternal, 'price'))}
      ${controlField('Target Swing', renderNumberInput(order, 'entryPlan', 'targetSwing', entry.targetSwing, 'price'))}
      ${controlField('Target External', renderNumberInput(order, 'entryPlan', 'targetExternal', entry.targetExternal, 'price'))}
      ${controlField('Selected Target', renderSelect(order, 'entryPlan', 'selectedTargetType', ORDER_TARGET_TYPE_DEFINITIONS, entry.selectedTargetType))}
      ${controlField('Final Target', renderPriceInput(order, 'entryPlan', 'finalTarget', entry.finalTarget))}
      ${field('Risk Points', formatNumber(entry.riskPoints))}
      ${controlField('Entry Note', renderTextarea(order, 'entryPlan', 'note', entry.note, 'Entry plan note'))}
    </details>
  `;
}

function renderResultReviewEditor(order) {
  const result = order.resultReview || {};
  return `
    <details class="order-review-edit-section">
      <summary>Result Review</summary>
      ${controlField('Expected Target', renderSelect(order, 'resultReview', 'expectedTargetReached', ORDER_TARGET_REACHED_DEFINITIONS, result.expectedTargetReached))}
      ${controlField('Final Target', renderSelect(order, 'resultReview', 'finalTargetReached', ORDER_TARGET_REACHED_DEFINITIONS, result.finalTargetReached))}
      ${controlField('Exit Time', renderTimestampInput(order, 'resultReview', 'exitTimestamp', result.exitTimestamp))}
      ${controlField('Exit Price', renderNumberInput(order, 'resultReview', 'exitPrice', result.exitPrice, 'price'))}
      ${controlField('Result', renderSelect(order, 'resultReview', 'result', ORDER_RESULT_DEFINITIONS, result.result))}
      ${controlField('Exit Reason', renderSelect(order, 'resultReview', 'exitReason', ORDER_EXIT_REASON_DEFINITIONS, result.exitReason))}
      ${field('Outcome Points', formatNumber(result.outcomePoints))}
      ${field('Outcome R', formatNumber(result.outcomeR))}
      ${controlField('Result Note', renderTextarea(order, 'resultReview', 'note', result.note, 'Result review note'))}
    </details>
  `;
}

function renderOrderEditor(order, options = {}) {
  const isExpanded = options.expandedOrderReviewId === order.id;
  return `
    <details class="order-review-editor" ${isExpanded ? 'open' : ''}>
      <summary>Advanced Edit</summary>
      <div class="order-review-editor-body">
        ${renderSetupThesisEditor(order)}
        ${renderEntryPlanEditor(order)}
        ${renderResultReviewEditor(order)}
      </div>
    </details>
  `;
}

function renderOrderActions(order, options = {}) {
  const isActive = options.activeOrderReviewId === order.id;
  const isHidden = Boolean(order.display?.hidden);
  return `
    <div class="order-review-action-row">
      <button class="inspector-secondary" data-inspector-action="${isActive ? 'order-review-clear-active' : 'order-review-set-active'}" data-order-review-id="${escapeHtml(order.id)}" type="button">
        ${isActive ? 'Clear Active' : 'Set Active'}
      </button>
      <button class="inspector-secondary" data-inspector-action="order-review-locate" data-order-review-id="${escapeHtml(order.id)}" type="button">Locate</button>
      <button class="inspector-secondary" data-inspector-action="order-review-toggle-hidden" data-order-review-id="${escapeHtml(order.id)}" type="button">${isHidden ? 'Show' : 'Hide'}</button>
      <button class="inspector-danger" data-inspector-action="order-review-delete" data-order-review-id="${escapeHtml(order.id)}" type="button">Delete</button>
    </div>
    <details class="order-review-quick-edit">
      <summary>Quick Review</summary>
      <div class="order-review-quick-edit-body">
        ${controlField(
          'Result',
          `<select class="inspector-input inspector-mini-select" data-inspector-action="order-review-result" data-order-review-id="${escapeHtml(order.id)}">
            ${renderResultOptions(order.resultReview?.result || ORDER_RESULTS.UNKNOWN)}
          </select>`
        )}
        ${controlField(
          'Note',
          `<textarea class="inspector-textarea" data-inspector-action="order-review-note" data-order-review-id="${escapeHtml(order.id)}" rows="2" placeholder="Order review note">${escapeHtml(order.note || '')}</textarea>`
        )}
      </div>
    </details>
  `;
}

function renderOrderRow(order, options = {}) {
  const setupSet = createSetupSetFromOrderReview(order);
  const reversal = setupSet?.orderElements?.reversal || {};
  const entry = setupSet?.orderElements?.entry || {};
  const title = [
    formatDirection(setupSet?.direction),
    labelFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS, reversal.eventType),
    formatTime(setupSet?.primaryTimestamp),
  ].join(' · ');
  const meta = [
    'Setup Set',
    entry.timeframe || reversal.timeframe || '—',
    order.display?.hidden ? 'Hidden' : 'Visible',
    `Updated ${formatDateTimeMs(order.updatedAt)}`,
  ].join(' · ');
  const isActive = options.activeOrderReviewId === order.id;

  return `
    <div class="inspector-evidence-row order-review-row${isActive ? ' active' : ''}">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(isActive ? `● ${title}` : title)}</span>
        <span>${escapeHtml(order.instrument || 'NQ')}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml(meta)}</div>
      ${renderSetupSetSummary(setupSet, isActive)}
      ${renderExplanationElements(setupSet)}
      ${renderOrderActions(order, options)}
      ${renderOrderEditor(order, options)}
      <div class="inspector-id">${escapeHtml(order.id)}</div>
    </div>
  `;
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

function renderActiveActions(order) {
  const isHidden = Boolean(order.display?.hidden);
  return `
    <div class="order-review-action-row">
      <button class="inspector-secondary" data-inspector-action="order-review-clear-active" data-order-review-id="${escapeHtml(order.id)}" type="button">Clear Active</button>
      <button class="inspector-secondary" data-inspector-action="order-review-locate" data-order-review-id="${escapeHtml(order.id)}" type="button">Locate</button>
      <button class="inspector-secondary" data-inspector-action="order-review-toggle-hidden" data-order-review-id="${escapeHtml(order.id)}" type="button">${isHidden ? 'Show' : 'Hide'}</button>
      <button class="inspector-danger" data-inspector-action="order-review-delete" data-order-review-id="${escapeHtml(order.id)}" type="button">Delete</button>
    </div>
  `;
}

function renderAnchorPanel(setupSet) {
  const reversal = setupSet?.orderElements?.reversal || {};
  const direction = setupSet?.direction === 'short' ? 'Bearish' : setupSet?.direction === 'long' ? 'Bullish' : 'Unknown';
  return `
    <div class="order-review-compact">
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
  if (!element || !Number.isFinite(Number(element.price))) return '';
  const isSelected = selectedElement?.setupId === order.id && selectedElement?.element === role;
  return `
    <div class="order-setup-execution-row${isSelected ? ' active' : ''}" data-inspector-action="order-setup-element-select" data-order-review-id="${escapeHtml(order.id)}" data-order-setup-element="${escapeHtml(role)}" role="button" tabindex="0" aria-pressed="${isSelected ? 'true' : 'false'}">
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

function renderReasonRows(order, setupSet) {
  const reasons = getOrderReviewReasons(order);
  const reasonRows = reasons.map((reason, reasonIndex) => {
    const refs = Array.isArray(reason.refs) ? reason.refs : [];
    const refRows = refs.map((ref, refIndex) => `
      <div class="order-review-ref-row">
        <span title="${escapeHtml(getRefId(ref) || '—')}">${escapeHtml(summarizeLinkedRef(ref))}</span>
        <button class="inspector-mini-btn" data-inspector-action="order-review-ref-remove" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" data-ref-index="${refIndex}" type="button">X</button>
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
          <button class="inspector-mini-btn" data-inspector-action="order-review-ref-add-selected-object" data-order-review-id="${escapeHtml(order.id)}" data-reason-index="${reasonIndex}" type="button">Link Selected Object</button>
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
        ${field('Exit', `${formatTime(result.timestamp)} · ${formatNumber(result.price)}`)}
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
      ${renderActiveActions(order)}
      ${renderAnchorPanel(setupSet)}
      ${renderExecutionPanel(order, setupSet, options.selectedOrderSetupElement)}
      ${renderReasonRows(order, setupSet)}
      ${renderResultPanel(order, setupSet)}
      <div class="inspector-id">${escapeHtml(order.id)}</div>
    </div>
  `;
}

export function renderOrderReviewPanel(orderReviews = [], options = {}) {
  const activeOrder = orderReviews.find((order) => order.id === options.activeOrderReviewId) || null;
  const content = activeOrder
    ? renderActiveOrderSetup(activeOrder, options)
    : '<div class="drawing-set-empty">No active Order Setup.</div>';
  return section('Active Order Setup', content);
}
