import { contractId, exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import {
  definePluginParameterSchema,
  resolvePluginSettings,
} from './plugin-parameter-schema.js';
import { readBuiltInPluginPlan } from './built-in-plugin-plan.js';

const RECORD_SCHEMA = 'v7.core-plugin-profile-record';
const RECORD_VERSION = 1;
const FAILURE_PHASES = new Set(['instantiate', 'plan', 'rollback', 'start']);
const ATTEMPT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FAILURE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;

class CorePluginProfileRecordValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', `${label} must be a plain record.`);
  }
  return value;
}

function requireAttemptId(value, label = 'Core Plugin attempt id') {
  if (typeof value !== 'string' || !ATTEMPT_ID.test(value)) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', `${label} is invalid.`);
  }
  return value;
}

function packageIndex(plan) {
  return new Map(readBuiltInPluginPlan(plan).packages.map((entry) => [
    entry.manifest.packageId,
    entry,
  ]));
}

function normalizeScopedValues(values, scope, packages) {
  const result = {};
  for (const packageId of Object.keys(plainRecord(values, `${scope} values`)).sort()) {
    const entry = packages.get(packageId);
    if (!entry) {
      failPluginContract('CORE_PLUGIN_PROFILE_UNKNOWN_PACKAGE', `Unknown Core package ${packageId}.`);
    }
    const contributions = new Map(entry.manifest.contributions.map((value) => [value.id, value]));
    const packageResult = {};
    const rawPackage = plainRecord(values[packageId], `${scope}.${packageId}`);
    for (const contributionId of Object.keys(rawPackage).sort()) {
      const contribution = contributions.get(contributionId);
      const rawFields = plainRecord(
        rawPackage[contributionId],
        `${scope}.${packageId}.${contributionId}`,
      );
      if (!contribution?.parameters) {
        failPluginContract(
          'CORE_PLUGIN_PROFILE_SETTING_UNAVAILABLE',
          `Contribution ${contributionId} has no host-rendered settings.`,
        );
      }
      const schema = definePluginParameterSchema(contribution.parameters);
      resolvePluginSettings(schema, {
        [`${scope}Values`]: rawFields,
      });
      const fields = Object.freeze(Object.fromEntries(
        Object.keys(rawFields).sort().map((fieldId) => [fieldId, rawFields[fieldId]]),
      ));
      if (Object.keys(fields).length > 0) packageResult[contributionId] = fields;
    }
    if (Object.keys(packageResult).length > 0) result[packageId] = Object.freeze(packageResult);
  }
  return Object.freeze(result);
}

function normalizeEnabledPackageIds(value, packages) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')
    || new Set(value).size !== value.length) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Enabled Core package ids are invalid.');
  }
  const unknown = value.find((id) => !packages.has(id));
  if (unknown !== undefined) {
    failPluginContract('CORE_PLUGIN_PROFILE_UNKNOWN_PACKAGE', `Unknown Core package ${unknown}.`);
  }
  const sorted = [...value].sort();
  if (sorted.some((id, index) => id !== value[index])) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Enabled Core package ids must be sorted.');
  }
  return Object.freeze(sorted);
}

/** Normalize one exact portable Core Plugin profile against a trusted-build plan. */
export function normalizeCorePluginProfile(plan, candidate = {}) {
  exactRecord(
    candidate,
    ['enabledPackageIds', 'packageValues', 'profileValues'],
    'CORE_PLUGIN_PROFILE_INVALID',
    'Core Plugin profile',
  );
  const packages = packageIndex(plan);
  return Object.freeze({
    enabledPackageIds: normalizeEnabledPackageIds(candidate.enabledPackageIds, packages),
    packageValues: normalizeScopedValues(candidate.packageValues, 'package', packages),
    profileValues: normalizeScopedValues(candidate.profileValues, 'profile', packages),
  });
}

/** Derive the build default: every validated manifest enabled with no overrides. */
export function createDefaultCorePluginProfile(plan) {
  const enabledPackageIds = readBuiltInPluginPlan(plan).packages
    .map(({ manifest }) => manifest.packageId).sort();
  return normalizeCorePluginProfile(plan, {
    enabledPackageIds,
    packageValues: {},
    profileValues: {},
  });
}

/** Derive the Kernel-safe profile while retaining all package/profile setting bytes. */
export function createKernelSafeCorePluginProfile(plan, retained = null) {
  const source = retained ?? createDefaultCorePluginProfile(plan);
  const value = normalizeCorePluginProfile(plan, source);
  return normalizeCorePluginProfile(plan, {
    enabledPackageIds: [],
    packageValues: value.packageValues,
    profileValues: value.profileValues,
  });
}

function normalizePending(plan, value) {
  if (value === null) return null;
  exactRecord(
    value,
    ['attemptId', 'baseRevision', 'profile'],
    'CORE_PLUGIN_PROFILE_INVALID',
    'Pending Core Plugin profile',
  );
  if (!Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Pending base revision is invalid.');
  }
  return Object.freeze({
    attemptId: requireAttemptId(value.attemptId),
    baseRevision: value.baseRevision,
    profile: normalizeCorePluginProfile(plan, value.profile),
  });
}

function normalizeFailure(value) {
  if (value === null) return null;
  exactRecord(
    value,
    ['attemptId', 'code', 'moduleId', 'packageId', 'phase'],
    'CORE_PLUGIN_PROFILE_INVALID',
    'Core Plugin failure',
  );
  if (typeof value.code !== 'string' || !FAILURE_CODE.test(value.code)
    || !FAILURE_PHASES.has(value.phase)) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Core Plugin failure diagnostic is invalid.');
  }
  return Object.freeze({
    attemptId: requireAttemptId(value.attemptId),
    code: value.code,
    moduleId: value.moduleId === null ? null : contractId(value.moduleId, 'Failure module id'),
    packageId: value.packageId === null ? null : contractId(value.packageId, 'Failure package id'),
    phase: value.phase,
  });
}

/** Create one branded, exact, monotonically revisioned Core Plugin profile record. */
export function createCorePluginProfileRecord(plan, candidate = {}) {
  exactRecord(
    candidate,
    ['active', 'lastFailure', 'pending', 'revision', 'schema', 'version'],
    'CORE_PLUGIN_PROFILE_INVALID',
    'Core Plugin profile record',
  );
  if (candidate.schema !== RECORD_SCHEMA || candidate.version !== RECORD_VERSION
    || !Number.isSafeInteger(candidate.revision) || candidate.revision < 0) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Core Plugin profile record header is invalid.');
  }
  const pending = normalizePending(plan, candidate.pending);
  if (pending !== null && pending.baseRevision >= candidate.revision) {
    failPluginContract('CORE_PLUGIN_PROFILE_INVALID', 'Pending profile must follow its base revision.');
  }
  return new CorePluginProfileRecordValue(Object.freeze({
    active: normalizeCorePluginProfile(plan, candidate.active),
    lastFailure: normalizeFailure(candidate.lastFailure),
    pending,
    revision: candidate.revision,
    schema: RECORD_SCHEMA,
    version: RECORD_VERSION,
  }));
}

/** Read one branded Core Plugin record without exposing mutable owner state. */
export function readCorePluginProfileRecord(candidate) {
  if (!(candidate instanceof CorePluginProfileRecordValue)) {
    failPluginContract('CORE_PLUGIN_PROFILE_RECORD_REQUIRED', 'A branded Core Plugin record is required.');
  }
  return candidate.read();
}

/** Serialize a branded Core Plugin record into its exact portable wire value. */
export function serializeCorePluginProfileRecord(candidate) {
  return readCorePluginProfileRecord(candidate);
}

/** Deserialize and validate one exact Core Plugin record wire. */
export function deserializeCorePluginProfileRecord(plan, wire) {
  return createCorePluginProfileRecord(plan, wire);
}

/** Inspect stored JSON read-only, deriving defaults without repairing invalid bytes. */
export function inspectStoredCorePluginProfile(plan, raw) {
  if (raw === null) {
    return Object.freeze({
      kind: 'missing',
      record: createCorePluginProfileRecord(plan, {
        active: createDefaultCorePluginProfile(plan),
        lastFailure: null,
        pending: null,
        revision: 0,
        schema: RECORD_SCHEMA,
        version: RECORD_VERSION,
      }),
      recoveryCode: null,
    });
  }
  try {
    return Object.freeze({
      kind: 'ready',
      record: deserializeCorePluginProfileRecord(plan, JSON.parse(raw)),
      recoveryCode: null,
    });
  } catch {
    return Object.freeze({
      kind: 'invalid',
      record: createCorePluginProfileRecord(plan, {
        active: createDefaultCorePluginProfile(plan),
        lastFailure: null,
        pending: null,
        revision: 0,
        schema: RECORD_SCHEMA,
        version: RECORD_VERSION,
      }),
      recoveryCode: 'stored-record-invalid',
    });
  }
}

/** Compare two canonical Core Plugin profiles by exact portable value. */
export function corePluginProfilesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export const CORE_PLUGIN_PROFILE_RECORD_SCHEMA = RECORD_SCHEMA;
export const CORE_PLUGIN_PROFILE_RECORD_VERSION = RECORD_VERSION;
