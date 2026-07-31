const EXTENSION_FIELDS = Object.freeze([
  'alignmentPolicyIds', 'apiVersion', 'id', 'register', 'schemaVersion',
]);
const CONTRIBUTION_FIELDS = Object.freeze(['entries', 'menuGroups', 'registrations']);
const REGISTRATION_FIELDS = Object.freeze([
  'definition', 'historyPlanning', 'menuItem', 'replayStepOption',
]);

function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('\u0000') !== [...fields].sort().join('\u0000')) {
    throw new TypeError(`${label} has an invalid shape.`);
  }
  return value;
}

function normalizeExtension(value) {
  exactRecord(value, EXTENSION_FIELDS, 'Timeframe capability extension');
  if (value.apiVersion !== 1 || value.schemaVersion !== 1
    || typeof value.id !== 'string' || value.id.length === 0
    || typeof value.register !== 'function'
    || !Array.isArray(value.alignmentPolicyIds)
    || value.alignmentPolicyIds.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new TypeError('Timeframe capability extension is invalid.');
  }
  return value;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`);
  return Object.freeze([...values]);
}

/** Read registered alignment identities before the Trading Calendar is constructed. */
export function collectTimeframeAlignmentPolicyIds(extensions) {
  if (!Array.isArray(extensions) || extensions.length === 0) {
    throw new TypeError('At least one timeframe capability extension is required.');
  }
  const normalized = extensions.map(normalizeExtension);
  unique(normalized.map(({ id }) => id), 'Timeframe capability extension ids');
  return unique(
    normalized.flatMap(({ alignmentPolicyIds }) => alignmentPolicyIds),
    'Timeframe alignment policy ids',
  );
}

function normalizeContribution(extension, context) {
  const contribution = exactRecord(
    extension.register(context), CONTRIBUTION_FIELDS, `${extension.id} contribution`,
  );
  if (!Array.isArray(contribution.entries) || !Array.isArray(contribution.menuGroups)
    || !Array.isArray(contribution.registrations) || contribution.registrations.length === 0) {
    throw new TypeError(`${extension.id} contribution is invalid.`);
  }
  const registrations = contribution.registrations.map((registration) => {
    exactRecord(registration, REGISTRATION_FIELDS, `${extension.id} registration`);
    const definition = defineTimeframe(registration.definition);
    if (typeof registration.historyPlanning !== 'function'
      || registration.menuItem?.id !== definition.id
      || (registration.replayStepOption !== null
        && typeof registration.replayStepOption?.id !== 'string')) {
      throw new TypeError(`${extension.id} registration is invalid.`);
    }
    return Object.freeze({ ...registration, definition });
  });
  return Object.freeze({ ...contribution, registrations: Object.freeze(registrations) });
}

/** Merge opaque timeframe contributions without branching on any concrete capability id. */
export function createTimeframeCapabilityRegistry({ context, extensions }) {
  const alignmentPolicyIds = collectTimeframeAlignmentPolicyIds(extensions);
  const contributions = extensions.map(normalizeExtension)
    .map((extension) => normalizeContribution(extension, context));
  const registrations = contributions.flatMap(({ registrations: values }) => values);
  unique(registrations.map(({ definition }) => definition.id), 'Registered timeframe ids');
  const byId = new Map(registrations.map((registration) => [registration.definition.id, registration]));
  return Object.freeze({
    alignmentPolicyIds,
    definitions: Object.freeze(registrations.map(({ definition }) => definition)),
    entries: Object.freeze(contributions.flatMap(({ entries }) => entries)),
    historyPlanning(selection) {
      const registration = byId.get(selection?.displayTimeframe?.id);
      if (!registration) throw new TypeError('History planning requires a registered timeframe.');
      return registration.historyPlanning(selection);
    },
    replayStepOptions: Object.freeze(registrations.flatMap(({ replayStepOption }) => (
      replayStepOption === null ? [] : [replayStepOption]
    ))),
    timeframeMenuGroups: Object.freeze(contributions.flatMap(({ menuGroups }) => menuGroups)),
    timeframes: Object.freeze(registrations.map(({ definition, replayStepOption }) => Object.freeze({
      id: definition.id,
      label: definition.display.shortLabel,
      replayStepId: replayStepOption?.id ?? null,
    }))),
  });
}
import { defineTimeframe } from '../capability-contract/public.js';
