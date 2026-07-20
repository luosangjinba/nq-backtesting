import { serializeSessionId } from '../session-identity/public.js';

export const SESSION_BROWSER_STATES = Object.freeze([
  'loading',
  'empty',
  'unavailable',
  'stale',
  'error',
  'ready',
]);

function requireState(state) {
  if (!SESSION_BROWSER_STATES.includes(state)) {
    throw new TypeError(`Unsupported Session Browser state: ${state}`);
  }
  return state;
}

function toCard(record, instrumentLabels) {
  return Object.freeze({
    id: serializeSessionId(record.sessionId).value,
    name: record.metadata.name,
    createdAtEpochMs: record.metadata.createdAtEpochMs,
    updatedAtEpochMs: record.metadata.updatedAtEpochMs,
    startEpochMs: record.configuration.historicalRange.startEpochMs,
    endEpochMs: record.configuration.historicalRange.endEpochMs,
    instruments: Object.freeze(record.configuration.instrumentIds.map((id) => Object.freeze({
      id,
      label: instrumentLabels[id] ?? id,
    }))),
  });
}

/**
 * Owner: session-store UI adapter.
 * Purpose: derive immutable customer-facing list state from Session records.
 * Inputs: view state, Session records, labels, and optional visible message.
 * Outputs: frozen list view model sorted by most recently updated.
 * Side effects: none.
 * Errors: TypeError for unsupported visible state.
 */
export function createSessionListViewModel({
  state,
  records = [],
  instrumentLabels = {},
  message = null,
}) {
  const cards = records.map((record) => toCard(record, instrumentLabels))
    .sort((left, right) => right.updatedAtEpochMs - left.updatedAtEpochMs);
  const normalizedState = state === 'ready' && cards.length === 0 ? 'empty' : requireState(state);
  return Object.freeze({
    screen: 'list',
    state: normalizedState,
    message,
    cards: Object.freeze(cards),
  });
}

/**
 * Owner: session-store UI adapter.
 * Purpose: derive the selected Session summary without exposing revision or
 * generation diagnostics in the customer UI.
 * Inputs: visible state, one Session record, labels, and optional message.
 * Outputs: frozen selected-Session view model.
 * Side effects: none.
 * Errors: TypeError for unsupported state or absent record in ready state.
 */
export function createOpenedSessionViewModel({
  state,
  record,
  instrumentLabels = {},
  message = null,
  workspace = false,
}) {
  const normalizedState = requireState(state);
  if ((normalizedState === 'ready' || normalizedState === 'stale') && !record) {
    throw new TypeError('Opened Session ready/stale state requires a record.');
  }
  return Object.freeze({
    screen: 'opened',
    state: normalizedState,
    message,
    session: record ? toCard(record, instrumentLabels) : null,
    workspace: Boolean(workspace),
  });
}
