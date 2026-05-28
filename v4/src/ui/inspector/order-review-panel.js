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

function renderTimestampInput(order, sectionName, fieldName, value) {
  return renderTextInput(order, sectionName, fieldName, getTimestampInputValue(value), 'YYYY-MM-DD HH:mm');
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

function renderLinkedRefs(refs = []) {
  if (!Array.isArray(refs) || !refs.length) return field('Refs', '—');
  return field(
    'Refs',
    refs.map((ref) => `${ref.role}:${ref.type}:${ref.id}`).join(', ')
  );
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
      ${controlField('Entry Price', renderNumberInput(order, 'entryPlan', 'entryPrice', entry.entryPrice, 'price'))}
      ${controlField('Model', renderSelect(order, 'entryPlan', 'entryModel', ORDER_ENTRY_MODEL_DEFINITIONS, entry.entryModel))}
      ${controlField('Stop Loss', renderNumberInput(order, 'entryPlan', 'stopLoss', entry.stopLoss, 'price'))}
      ${controlField('Stop Reason', renderSelect(order, 'entryPlan', 'stopReason', ORDER_STOP_REASON_DEFINITIONS, entry.stopReason))}
      ${controlField('Target Internal', renderNumberInput(order, 'entryPlan', 'targetInternal', entry.targetInternal, 'price'))}
      ${controlField('Target Swing', renderNumberInput(order, 'entryPlan', 'targetSwing', entry.targetSwing, 'price'))}
      ${controlField('Target External', renderNumberInput(order, 'entryPlan', 'targetExternal', entry.targetExternal, 'price'))}
      ${controlField('Selected Target', renderSelect(order, 'entryPlan', 'selectedTargetType', ORDER_TARGET_TYPE_DEFINITIONS, entry.selectedTargetType))}
      ${controlField('Final Target', renderNumberInput(order, 'entryPlan', 'finalTarget', entry.finalTarget, 'price'))}
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
      <summary>Edit Order Review</summary>
      <div class="order-review-editor-body">
        ${renderSetupThesisEditor(order)}
        ${renderEntryPlanEditor(order)}
        ${renderResultReviewEditor(order)}
      </div>
    </details>
  `;
}

function renderOrderActions(order) {
  return `
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
    <button class="inspector-secondary" data-inspector-action="order-review-locate" data-order-review-id="${escapeHtml(order.id)}" type="button">Locate</button>
    <button class="inspector-danger" data-inspector-action="order-review-delete" data-order-review-id="${escapeHtml(order.id)}" type="button">Delete</button>
  `;
}

function renderOrderRow(order, options = {}) {
  const setup = order.setupThesis || {};
  const entry = order.entryPlan || {};
  const result = order.resultReview || {};
  const title = [
    formatDirection(entry.direction),
    labelFromDefinitions(ORDER_ENTRY_MODEL_DEFINITIONS, entry.entryModel),
    formatTime(entry.entryTimestamp),
  ].join(' · ');
  const meta = [
    labelFromDefinitions(ORDER_EVENT_TYPE_DEFINITIONS, setup.primaryEventType),
    setup.primaryEventTimeframe || '—',
    labelFromDefinitions(ORDER_RESULT_DEFINITIONS, result.result),
  ].join(' · ');

  return `
    <div class="inspector-evidence-row order-review-row">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(title)}</span>
        <span>${escapeHtml(order.instrument || 'NQ')}</span>
      </div>
      <div class="drawing-set-meta">${escapeHtml(meta)}</div>
      ${renderSetupThesis(order)}
      ${renderEntryPlan(order)}
      ${renderResultReview(order)}
      ${renderOrderEditor(order, options)}
      ${field('Created', formatDateTimeMs(order.createdAt))}
      ${field('Updated', formatDateTimeMs(order.updatedAt))}
      ${renderOrderActions(order)}
      <div class="inspector-id">${escapeHtml(order.id)}</div>
    </div>
  `;
}

export function renderOrderReviewPanel(orderReviews = [], options = {}) {
  const createAction = options.createAction || '';
  const createButton = createAction
    ? `<button class="inspector-secondary" data-inspector-action="${escapeHtml(createAction)}" type="button">${escapeHtml(options.createLabel || 'Create Order Review')}</button>`
    : '';
  const content = orderReviews.length
    ? `<div class="inspector-evidence-list">${orderReviews.map((order) => renderOrderRow(order, options)).join('')}</div>`
    : '<div class="drawing-set-empty">No Order Reviews yet.</div>';

  return section('Order Reviews', `${createButton}${content}`);
}
