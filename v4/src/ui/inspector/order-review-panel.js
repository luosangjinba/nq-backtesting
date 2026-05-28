import {
  ORDER_ENTRY_MODEL_DEFINITIONS,
  ORDER_EVENT_TYPE_DEFINITIONS,
  ORDER_RESULT_DEFINITIONS,
  ORDER_RESULTS,
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

function formatDirection(direction) {
  if (direction === 'long') return 'Long';
  if (direction === 'short') return 'Short';
  return 'Unknown';
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
  return ORDER_RESULT_DEFINITIONS.map(
    (definition) =>
      `<option value="${escapeHtml(definition.value)}" ${definition.value === selectedResult ? 'selected' : ''}>${escapeHtml(definition.label)}</option>`
  ).join('');
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

function renderOrderRow(order) {
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
    ? `<div class="inspector-evidence-list">${orderReviews.map(renderOrderRow).join('')}</div>`
    : '<div class="drawing-set-empty">No Order Reviews yet.</div>';

  return section('Order Reviews', `${createButton}${content}`);
}
