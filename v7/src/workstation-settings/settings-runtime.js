import {
  createWorkstationSettings,
  deserializeWorkstationSettings,
  failWorkstationSettings,
  readWorkstationSettings,
  serializeWorkstationSettings,
  workstationSettingsEqual,
} from './settings-value.js';

const DEFAULT_STORAGE_KEY = 'v7.workstation-settings:global';
const RECORD_SCHEMA = 'v7.workstation-settings-record';
const RECORD_VERSION = 1;

function requireStorage(storage) {
  for (const method of ['read', 'remove', 'write']) {
    if (typeof storage?.[method] !== 'function') {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_STORAGE_INVALID',
        `Workstation Settings storage requires ${method}().`,
      );
    }
  }
  return storage;
}

function requireConsumer(consumer) {
  if (!consumer || typeof consumer !== 'object' || typeof consumer.id !== 'string'
    || consumer.id.length === 0) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_CONSUMER_INVALID',
      'A Settings consumer requires one non-empty id.',
    );
  }
  for (const method of ['apply', 'commit', 'rollback', 'stage']) {
    if (typeof consumer[method] !== 'function') {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_CONSUMER_INVALID',
        `Settings consumer ${consumer.id} requires ${method}().`,
      );
    }
  }
  return consumer;
}

function recordWire(settings, revision) {
  return Object.freeze({
    revision,
    schema: RECORD_SCHEMA,
    settings: serializeWorkstationSettings(settings),
    version: RECORD_VERSION,
  });
}

function restoreRecord(raw) {
  if (raw === null) return Object.freeze({ kind: 'missing' });
  try {
    const wire = JSON.parse(raw);
    if (!wire || typeof wire !== 'object' || Array.isArray(wire)
      || Object.keys(wire).sort().join(',') !== 'revision,schema,settings,version'
      || wire.schema !== RECORD_SCHEMA || wire.version !== RECORD_VERSION
      || !Number.isSafeInteger(wire.revision) || wire.revision < 0) {
      return Object.freeze({ kind: 'invalid' });
    }
    return Object.freeze({
      kind: 'ready',
      revision: wire.revision,
      settings: deserializeWorkstationSettings(wire.settings),
    });
  } catch {
    return Object.freeze({ kind: 'invalid' });
  }
}

function snapshotValue({ recoveryCode, revision, settings }) {
  return Object.freeze({ recoveryCode, revision, settings });
}

/**
 * Own the one global durable Settings value plus reversible preview/save transactions.
 * Consumers stage/apply/rollback without touching Replay, Workspace, or bars.
 */
export function createWorkstationSettingsRuntime({
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}) {
  const port = requireStorage(storage);
  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_STORAGE_KEY_INVALID',
      'Workstation Settings storage key must be non-empty.',
    );
  }
  const consumers = new Map();
  let current = null;
  let preview = null;

  function initialize() {
    if (current !== null) return current;
    let restored;
    try {
      restored = restoreRecord(port.read(storageKey));
    } catch {
      restored = Object.freeze({ kind: 'unavailable' });
    }
    current = snapshotValue({
      recoveryCode: restored.kind === 'invalid'
        ? 'stored-record-invalid'
        : (restored.kind === 'unavailable' ? 'persistence-unavailable' : null),
      revision: restored.kind === 'ready' ? restored.revision : 0,
      settings: restored.kind === 'ready' ? restored.settings : createWorkstationSettings(),
    });
    return current;
  }

  function runConsumer(consumer, candidate) {
    const staged = consumer.stage(candidate);
    try {
      consumer.apply(staged);
      consumer.commit(staged);
    } catch (error) {
      try { consumer.rollback(staged); } catch { /* Preserve first failure. */ }
      throw error;
    }
  }

  function registerConsumer(candidate) {
    const consumer = requireConsumer(candidate);
    if (preview !== null) {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_PREVIEW_ACTIVE',
        'Settings consumers cannot change while a preview is active.',
      );
    }
    if (consumers.has(consumer.id)) {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_CONSUMER_DUPLICATE',
        `Settings consumer ${consumer.id} is already registered.`,
      );
    }
    runConsumer(consumer, initialize());
    consumers.set(consumer.id, consumer);
    let registered = true;
    return () => {
      if (!registered) return;
      if (preview !== null) {
        failWorkstationSettings(
          'WORKSTATION_SETTINGS_PREVIEW_ACTIVE',
          'Settings consumers cannot change while a preview is active.',
        );
      }
      registered = false;
      consumers.delete(consumer.id);
    };
  }

  function rollbackEntries(entries) {
    let firstFailure = null;
    for (const entry of [...entries].reverse()) {
      try { entry.consumer.rollback(entry.staged); } catch (error) { firstFailure ??= error; }
    }
    if (firstFailure !== null) throw firstFailure;
  }

  function cancelPreview() {
    if (preview === null) return initialize();
    const active = preview;
    preview = null;
    try {
      rollbackEntries(active.entries);
      return initialize();
    } catch (cause) {
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_PREVIEW_ROLLBACK_FAILED',
        'Workstation Settings preview could not be restored.',
        { cause },
      );
    }
  }

  function previewSettings(settings) {
    readWorkstationSettings(settings);
    const committed = initialize();
    if (preview !== null && workstationSettingsEqual(preview.candidate.settings, settings)) {
      return preview.candidate;
    }
    if (preview !== null) cancelPreview();
    if (workstationSettingsEqual(committed.settings, settings)) return committed;
    const candidate = snapshotValue({
      recoveryCode: null,
      revision: committed.revision + 1,
      settings,
    });
    const entries = [];
    try {
      const stages = [...consumers.values()].map((consumer) => Object.freeze({
        consumer,
        staged: consumer.stage(candidate),
      }));
      for (const entry of stages) {
        entry.consumer.apply(entry.staged);
        entries.push(entry);
      }
      preview = Object.freeze({ candidate, entries: Object.freeze(entries) });
      return candidate;
    } catch (cause) {
      try { rollbackEntries(entries); } catch { /* Preserve the first failure. */ }
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_PREVIEW_FAILED',
        'Workstation Settings preview could not be applied to every consumer.',
        { cause },
      );
    }
  }

  function restoreStorage(previousRaw) {
    if (previousRaw === null) port.remove(storageKey);
    else port.write(storageKey, previousRaw);
  }

  function save(settings) {
    readWorkstationSettings(settings);
    let previous = initialize();
    if (preview !== null && !workstationSettingsEqual(preview.candidate.settings, settings)) {
      cancelPreview();
      previous = initialize();
    }
    if (previous.recoveryCode === null && workstationSettingsEqual(previous.settings, settings)) {
      return previous;
    }
    const activePreview = preview;
    const candidate = activePreview?.candidate ?? snapshotValue({
      recoveryCode: null,
      revision: previous.revision + 1,
      settings,
    });
    let previousRaw;
    try {
      previousRaw = port.read(storageKey);
    } catch (cause) {
      if (preview !== null) {
        try { cancelPreview(); } catch { /* Preserve the persistence failure. */ }
      }
      failWorkstationSettings(
        'WORKSTATION_SETTINGS_PERSISTENCE_FAILED',
        'Workstation Settings could not read durable state.',
        { cause },
      );
    }
    const applied = [];
    let durableChanged = false;
    try {
      const stages = activePreview?.entries ?? [...consumers.values()].map((consumer) => Object.freeze({
        consumer,
        staged: consumer.stage(candidate),
      }));
      if (activePreview !== null) applied.push(...stages);
      else {
        for (const entry of stages) {
          entry.consumer.apply(entry.staged);
          applied.push(entry);
        }
      }
      port.write(storageKey, JSON.stringify(recordWire(settings, candidate.revision)));
      durableChanged = true;
      for (const entry of stages) entry.consumer.commit(entry.staged);
      current = candidate;
      preview = null;
      return current;
    } catch (cause) {
      preview = null;
      try { rollbackEntries(applied); } catch { /* Preserve first failure. */ }
      if (durableChanged) {
        try { restoreStorage(previousRaw); } catch { /* Prior in-memory authority remains. */ }
      }
      failWorkstationSettings(
        durableChanged
          ? 'WORKSTATION_SETTINGS_CONSUMER_COMMIT_FAILED'
          : 'WORKSTATION_SETTINGS_SAVE_FAILED',
        'Workstation Settings were not committed.',
        { cause },
      );
    }
  }

  return Object.freeze({
    cancelPreview,
    initialize,
    preview: previewSettings,
    registerConsumer,
    save,
    snapshot: () => current ?? initialize(),
  });
}
