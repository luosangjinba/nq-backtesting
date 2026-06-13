import { getSetupSetById } from '../order/setup-set.js';
import { dateKeyFromTimestamp } from '../utils.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function cloneArray(value) {
  return Array.isArray(value) ? clone(value) : [];
}

function summarizeSetupSet(setupSet = {}) {
  const elements = setupSet.orderElements || {};
  return {
    source: 'order-setup',
    orderReviewId: setupSet.id || '',
    instrument: setupSet.instrument || 'NQ',
    direction: setupSet.direction || elements.entry?.direction || 'unknown',
    summary: setupSet.sourceOrderReview?.summary || setupSet.orderReview?.summary || '',
    note: setupSet.sourceOrderReview?.note || setupSet.orderReview?.note || '',
    date: dateKeyFromTimestamp(setupSet.primaryTimestamp),
    primaryTimestamp: setupSet.primaryTimestamp ?? null,
    range: setupSet.range ? { ...setupSet.range } : null,
    entry: elements.entry ? { ...elements.entry } : null,
    stopLoss: elements.stopLoss ? { ...elements.stopLoss } : null,
    targets: cloneArray(elements.targets),
    result: elements.result ? { ...elements.result } : null,
    explanationElements: setupSet.explanationElements ? clone(setupSet.explanationElements) : {
      refs: [],
      manualEvents: [],
      notes: [],
    },
  };
}

function summarizeUnlinkedSnapshot(snapshot = {}) {
  return {
    source: 'unlinked-snapshot',
    orderReviewId: '',
    instrument: snapshot.instrument || 'NQ',
    direction: snapshot.direction || 'unknown',
    summary: '',
    note: snapshot.entryReason || '',
    date: '',
    primaryTimestamp: null,
    range: null,
    entry: null,
    stopLoss: snapshot.stopLoss === undefined ? null : { price: snapshot.stopLoss },
    targets: snapshot.target === undefined ? [] : [{ role: 'target', price: snapshot.target }],
    result: snapshot.result ? { status: snapshot.result } : null,
    explanationElements: {
      refs: [],
      manualEvents: [],
      notes: snapshot.entryReason ? [{ scope: 'entry', text: snapshot.entryReason }] : [],
    },
  };
}

export function getJournalExecutionSetupSummary(execution = {}, options = {}) {
  const orderReviewId = normalizeText(execution.orderReviewId);
  if (!orderReviewId) {
    return {
      linkStatus: 'unlinked',
      orderReviewId: '',
      setup: summarizeUnlinkedSnapshot(execution.unlinkedSnapshot),
    };
  }

  const getSetup = typeof options.getSetupSetById === 'function'
    ? options.getSetupSetById
    : getSetupSetById;
  const setupSet = getSetup(orderReviewId);

  if (!setupSet) {
    return {
      linkStatus: 'missing-linked-setup',
      orderReviewId,
      setup: summarizeUnlinkedSnapshot(execution.unlinkedSnapshot),
    };
  }

  return {
    linkStatus: 'linked',
    orderReviewId,
    setup: summarizeSetupSet(setupSet),
  };
}

export function getJournalExecutionDisplayModel(execution = {}, options = {}) {
  const setupSummary = getJournalExecutionSetupSummary(execution, options);
  return {
    ...execution,
    linkStatus: setupSummary.linkStatus,
    setupSummary: setupSummary.setup,
  };
}

export function getJournalExecutionDisplayModels(executions = [], options = {}) {
  return Array.isArray(executions)
    ? executions.map((execution) => getJournalExecutionDisplayModel(execution, options))
    : [];
}
