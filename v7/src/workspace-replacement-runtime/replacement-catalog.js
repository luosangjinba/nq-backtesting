import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../capability-contract/public.js';
import { failReplacement } from './replacement-error.js';
import { exactRecord, exactString, requirePolicy } from './validation.js';

const ENTRY_FIELDS = Object.freeze([
  'aggregationPolicy', 'calendar', 'displayTimeframe', 'instrument', 'paneId',
  'sessionHoursMode', 'sessionHoursPolicy',
]);

function normalizeEntry(value) {
  exactRecord(value, ENTRY_FIELDS, 'replacement entry');
  const instrument = defineInstrument(value.instrument);
  const calendar = defineTradingCalendar(value.calendar);
  const displayTimeframe = defineTimeframe(value.displayTimeframe);
  const aggregationPolicy = requirePolicy(
    value.aggregationPolicy,
    'project',
    ['deterministic', 'id', 'project', 'revision'],
  );
  const sessionHoursPolicy = requirePolicy(
    value.sessionHoursPolicy,
    'isEligible',
    ['deterministic', 'id', 'isEligible', 'mode', 'revision'],
  );
  const sessionHoursMode = exactString(value.sessionHoursMode, 'sessionHoursMode');
  if (instrument.calendarId !== calendar.id
    || displayTimeframe.aggregationPolicyId !== aggregationPolicy.id
    || !calendar.sessionHoursPolicyIds.includes(sessionHoursPolicy.id)
    || sessionHoursPolicy.mode !== sessionHoursMode) {
    failReplacement('WORKSPACE_REPLACEMENT_ENTRY_INCOMPATIBLE', 'Replacement entry capabilities are incompatible.');
  }
  return Object.freeze({
    aggregationPolicy,
    calendar,
    displayTimeframe,
    instrument,
    paneId: exactString(value.paneId, 'paneId'),
    sessionHoursMode,
    sessionHoursPolicy,
  });
}

function key(value) {
  return `${value.instrumentId}\u0000${value.timeframeId}\u0000${value.sessionHoursMode}`;
}

/** Register exact instrument/timeframe/Session Hours policy combinations without id branches. */
export function createWorkspaceReplacementCatalog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    failReplacement('WORKSPACE_REPLACEMENT_CATALOG_INVALID', 'Replacement catalog must be non-empty.');
  }
  const byKey = new Map();
  for (const candidate of entries) {
    const entry = normalizeEntry(candidate);
    const entryKey = key({
      instrumentId: entry.instrument.id,
      sessionHoursMode: entry.sessionHoursMode,
      timeframeId: entry.displayTimeframe.id,
    });
    if (byKey.has(entryKey)) {
      failReplacement('WORKSPACE_REPLACEMENT_ENTRY_DUPLICATE', 'Replacement entry is duplicated.');
    }
    byKey.set(entryKey, entry);
  }
  return Object.freeze({
    get(target) {
      exactRecord(target, ['instrumentId', 'sessionHoursMode', 'timeframeId'], 'replacement target');
      const entry = byKey.get(key(target));
      if (!entry) failReplacement('WORKSPACE_REPLACEMENT_TARGET_UNDECLARED', 'Replacement target is not registered.');
      return entry;
    },
  });
}
