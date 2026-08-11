import {
  CORE_PLUGIN_PROFILE_RECORD_SCHEMA,
  CORE_PLUGIN_PROFILE_RECORD_VERSION,
  corePluginProfilesEqual,
  createCorePluginCatalogSnapshot,
  createCorePluginProfileRecord,
  prepareCorePluginProfileChange,
  readCorePluginChangePreparation,
  readCorePluginProfileRecord,
  serializeCorePluginProfileRecord,
} from '../plugin-contract/public.js';
import { failCorePluginProfile } from './profile-error.js';

export const CORE_PLUGIN_PROFILE_STORAGE_KEY = 'v7.core-plugin-profile:device';

const ATTEMPT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function storagePort(value) {
  if (value === null) return null;
  for (const method of ['read', 'remove', 'write']) {
    if (typeof value?.[method] !== 'function') {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_STORAGE_INVALID',
        `Core Plugin profile storage requires ${method}().`,
      );
    }
  }
  return value;
}

function requireRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failCorePluginProfile('CORE_PLUGIN_PROFILE_REVISION_INVALID', 'Profile revision is invalid.');
  }
  return value;
}

function requireAttemptId(value) {
  if (typeof value !== 'string' || !ATTEMPT_ID.test(value)) {
    failCorePluginProfile('CORE_PLUGIN_PROFILE_ATTEMPT_INVALID', 'Profile attempt id is invalid.');
  }
  return value;
}

/** Own one device-local active/pending Core profile and its exact CAS transactions. */
export function createCorePluginProfileRuntime({
  idFactory,
  moduleDescriptors,
  plan,
  readModuleHostSnapshot,
  storage,
  storageKey = CORE_PLUGIN_PROFILE_STORAGE_KEY,
} = {}) {
  const port = storagePort(storage ?? null);
  if (typeof idFactory !== 'function' || !Array.isArray(moduleDescriptors)
    || typeof readModuleHostSnapshot !== 'function'
    || typeof storageKey !== 'string' || storageKey.length === 0) {
    failCorePluginProfile('CORE_PLUGIN_PROFILE_RUNTIME_INVALID', 'Core Plugin profile runtime ports are invalid.');
  }
  const listeners = new Set();
  let boot = null;
  let disposed = false;
  let effectiveProfile = null;
  let generationSource = null;
  let knownRaw = null;
  let record = null;
  let recoveryCode = null;
  let selectionKind = null;

  function requireLive() {
    if (disposed) failCorePluginProfile('CORE_PLUGIN_PROFILE_DISPOSED', 'Core Plugin profile is disposed.');
    if (record === null) {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_UNINITIALIZED', 'Core Plugin profile is not initialized.');
    }
  }

  function publicSnapshot() {
    requireLive();
    return createCorePluginCatalogSnapshot({
      effectiveProfile,
      generationSource,
      moduleHostSnapshot: readModuleHostSnapshot(),
      plan,
      record,
      recoveryCode: port === null ? 'persistence-unavailable' : recoveryCode,
    });
  }

  function publish() {
    const value = publicSnapshot();
    for (const listener of listeners) listener(value);
    return value;
  }

  function nextRecord({
    active,
    lastFailure,
    pending,
    revision = readCorePluginProfileRecord(record).revision + 1,
  }) {
    return createCorePluginProfileRecord(plan, {
      active,
      lastFailure,
      pending,
      revision,
      schema: CORE_PLUGIN_PROFILE_RECORD_SCHEMA,
      version: CORE_PLUGIN_PROFILE_RECORD_VERSION,
    });
  }

  function persist(candidate) {
    if (port === null) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_PERSISTENCE_UNAVAILABLE',
        'Core Plugin profile storage is unavailable on this device.',
      );
    }
    let currentRaw;
    try { currentRaw = port.read(storageKey); } catch (cause) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_PERSISTENCE_FAILED',
        'Core Plugin profile could not read durable state.',
        { cause },
      );
    }
    if (currentRaw !== knownRaw) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_CAS_STALE',
        'Core Plugin profile changed on this device; reopen Settings and retry.',
      );
    }
    const raw = JSON.stringify(serializeCorePluginProfileRecord(candidate));
    try { port.write(storageKey, raw); } catch (cause) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_PERSISTENCE_FAILED',
        'Core Plugin profile could not persist the complete candidate.',
        { cause },
      );
    }
    knownRaw = raw;
    record = candidate;
    return record;
  }

  function initializeBoot({ candidate, failures = [], selection } = {}) {
    if (record !== null) return publicSnapshot();
    if (!selection?.record || !candidate?.profile || typeof candidate.source !== 'string'
      || !Array.isArray(failures)) {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_BOOT_INVALID', 'Core Plugin boot selection is invalid.');
    }
    record = selection.record;
    readCorePluginProfileRecord(record);
    effectiveProfile = candidate.profile;
    generationSource = candidate.source;
    recoveryCode = selection.recoveryCode ?? null;
    selectionKind = selection.kind;
    knownRaw = selection.rawRecord;
    boot = Object.freeze({ candidate, failures: Object.freeze([...failures]) });
    return publicSnapshot();
  }

  function acceptApplicationReady() {
    requireLive();
    if (boot === null) return publicSnapshot();
    const current = readCorePluginProfileRecord(record);
    if (boot.candidate.source === 'pending') {
      if (current.pending?.attemptId !== boot.candidate.attemptId
        || !corePluginProfilesEqual(current.pending.profile, boot.candidate.profile)) {
        failCorePluginProfile(
          'CORE_PLUGIN_PROFILE_BOOT_STALE',
          'The successful generation no longer matches the pending profile.',
        );
      }
      persist(nextRecord({
        active: current.pending.profile,
        lastFailure: null,
        pending: null,
      }));
      recoveryCode = null;
    } else if (boot.failures.length > 0) {
      const failureRecord = nextRecord({
        active: current.active,
        lastFailure: boot.failures[0],
        pending: current.pending,
      });
      if (port === null || selectionKind === 'invalid') record = failureRecord;
      else persist(failureRecord);
    }
    boot = null;
    return publish();
  }

  function prepare(intent) {
    requireLive();
    const preparation = prepareCorePluginProfileChange({ intent, moduleDescriptors, plan, record });
    const value = readCorePluginChangePreparation(preparation);
    return Object.freeze({
      impact: Object.freeze({
        applicationModuleIds: value.applicationModuleIds,
        changedPackageIds: value.changedPackageIds,
        confirmationId: value.confirmationId,
        dependencyCascadePackageIds: value.dependencyCascadePackageIds,
        restartRequired: value.restartRequired,
        retainedData: value.retainedData,
      }),
      preparation,
    });
  }

  function stage(preparation, { confirmationId = null } = {}) {
    requireLive();
    const value = readCorePluginChangePreparation(preparation?.preparation ?? preparation);
    const current = readCorePluginProfileRecord(record);
    if (value.baseRevision !== current.revision) {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_CAS_STALE', 'Core Plugin preparation is stale.');
    }
    if (value.confirmationId !== confirmationId) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_CONFIRMATION_REQUIRED',
        'Confirm the exact dependency cascade before staging this change.',
      );
    }
    if (value.noop) {
      if (current.pending !== null || current.lastFailure !== null) {
        persist(nextRecord({ active: current.active, lastFailure: null, pending: null }));
        publish();
        return Object.freeze({ kind: 'cleared', revision: current.revision + 1 });
      }
      return Object.freeze({ kind: 'noop', revision: current.revision });
    }
    const attemptId = requireAttemptId(idFactory());
    const candidate = nextRecord({
      active: current.active,
      lastFailure: null,
      pending: Object.freeze({
        attemptId,
        baseRevision: current.revision,
        profile: value.candidate,
      }),
    });
    persist(candidate);
    publish();
    return Object.freeze({
      attemptId,
      baseRevision: current.revision,
      kind: 'pending',
      revision: readCorePluginProfileRecord(candidate).revision,
    });
  }

  function discardPending({ expectedRevision } = {}) {
    requireLive();
    const current = readCorePluginProfileRecord(record);
    if (requireRevision(expectedRevision) !== current.revision) {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_CAS_STALE', 'Core Plugin discard revision is stale.');
    }
    if (current.pending === null && current.lastFailure === null) return publicSnapshot();
    persist(nextRecord({ active: current.active, lastFailure: null, pending: null }));
    return publish();
  }

  function restartReceipt({ expectedRevision } = {}) {
    requireLive();
    const current = readCorePluginProfileRecord(record);
    if (requireRevision(expectedRevision) !== current.revision || current.pending === null) {
      failCorePluginProfile(
        'CORE_PLUGIN_PROFILE_RECEIPT_STALE',
        'Restart requires the current pending Core Plugin receipt.',
      );
    }
    return Object.freeze({
      attemptId: current.pending.attemptId,
      revision: current.revision,
    });
  }

  function validateRestartReceipt(receipt) {
    if (!receipt || typeof receipt !== 'object') {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_RECEIPT_STALE', 'Restart receipt is invalid.');
    }
    const current = readCorePluginProfileRecord(record);
    if (receipt.attemptId !== current.pending?.attemptId || receipt.revision !== current.revision) {
      failCorePluginProfile('CORE_PLUGIN_PROFILE_RECEIPT_STALE', 'Restart receipt is stale.');
    }
    return Object.freeze({ ...receipt });
  }

  return Object.freeze({
    acceptApplicationReady,
    discardPending,
    dispose() { disposed = true; listeners.clear(); },
    initializeBoot,
    prepare,
    restartReceipt,
    snapshot: publicSnapshot,
    stage,
    subscribe(listener) {
      requireLive();
      if (typeof listener !== 'function') throw new TypeError('Core Plugin profile listener is invalid.');
      listeners.add(listener);
      listener(publicSnapshot());
      return Object.freeze({ unsubscribe: () => listeners.delete(listener) });
    },
    validateRestartReceipt,
  });
}
