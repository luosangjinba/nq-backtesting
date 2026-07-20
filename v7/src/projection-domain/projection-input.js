import { createRawBarBatch } from '../bar-data-contract/public.js';
import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../capability-contract/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import { failProjection } from './projection-error.js';
import { requireAggregationPolicy, requireSessionHoursPolicy } from './policy-contract.js';

const INPUT_FIELDS = Object.freeze([
  'schemaVersion',
  'paneId',
  'instrument',
  'calendar',
  'displayTimeframe',
  'sourceBatches',
  'cursorProposal',
  'sessionHoursPolicy',
  'aggregationPolicy',
]);
const PANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function requireExactInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failProjection('PROJECTION_INPUT_INVALID', 'Projection input must be an object.');
  }
  for (const field of INPUT_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      failProjection('PROJECTION_INPUT_MISSING_FIELD', `Projection input is missing ${field}.`);
    }
  }
  if (Object.keys(value).some((field) => !INPUT_FIELDS.includes(field))) {
    failProjection('PROJECTION_INPUT_UNKNOWN_FIELD', 'Projection input contains an unknown field.');
  }
  if (value.schemaVersion !== 1) {
    failProjection('PROJECTION_INPUT_VERSION', 'Projection input requires schemaVersion 1.');
  }
}

function requirePaneId(value) {
  if (typeof value !== 'string' || !PANE_ID_PATTERN.test(value)) {
    failProjection('PROJECTION_PANE_ID_INVALID', 'paneId must be an exact opaque token.');
  }
  return value;
}

function requireBatches(value) {
  if (!Array.isArray(value) || value.length === 0) {
    failProjection('PROJECTION_SOURCE_BATCHES_EMPTY', 'At least one raw source batch is required.');
  }
  return Object.freeze(value.map(createRawBarBatch));
}

/** Normalize the complete provider-neutral input before pure projection begins. */
export function createProjectionInput(value) {
  requireExactInput(value);
  const instrument = defineInstrument(value.instrument);
  const calendar = defineTradingCalendar(value.calendar);
  const displayTimeframe = defineTimeframe(value.displayTimeframe);
  if (instrument.calendarId !== calendar.id) {
    failProjection(
      'PROJECTION_CALENDAR_MISMATCH',
      'Instrument and TradingCalendar identities must match.',
    );
  }
  const sourceBatches = requireBatches(value.sourceBatches);
  return Object.freeze({
    aggregationPolicy: requireAggregationPolicy(
      value.aggregationPolicy,
      displayTimeframe.aggregationPolicyId,
    ),
    calendar,
    cursorProposal: value.cursorProposal,
    cursor: readReplayCursorProposal(value.cursorProposal),
    displayTimeframe,
    instrument,
    paneId: requirePaneId(value.paneId),
    schemaVersion: 1,
    sessionHoursPolicy: requireSessionHoursPolicy(value.sessionHoursPolicy, calendar),
    sourceBatches,
  });
}
