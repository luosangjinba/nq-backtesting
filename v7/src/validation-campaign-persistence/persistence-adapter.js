import {
  canonicalJson,
  failValidation,
  parseCanonicalJson,
  requireUuid,
  utf8Bytes,
  VALIDATION_CAMPAIGN_DOCUMENT_PREFIX,
  VALIDATION_CAMPAIGN_INDEX_KEY,
  VALIDATION_LIMITS,
} from '../validation-study-domain/public.js';

class ValidationPersistencePreparation {
  #record;
  constructor(record) { this.#record = record; Object.freeze(this); }
  read() { return this.#record; }
}

function preparation(value) {
  if (!(value instanceof ValidationPersistencePreparation)) {
    throw new TypeError('Validation Campaign persistence requires its exact preparation.');
  }
  return value.read();
}

function requireStorage(value) {
  for (const method of ['read', 'remove', 'write']) {
    if (typeof value?.[method] !== 'function') {
      throw new TypeError(`Validation Campaign storage requires ${method}().`);
    }
  }
  return value;
}

/** Return the exact Campaign document key without reading or mutating storage. */
export function validationCampaignDocumentStorageKey(campaignId) {
  return `${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}${requireUuid(campaignId, 'Campaign storage id')}`;
}

function campaignKeys(storage) {
  if (typeof storage.keys !== 'function') return Object.freeze([]);
  return Object.freeze(storage.keys().filter((key) => (
    key === VALIDATION_CAMPAIGN_INDEX_KEY || key.startsWith(VALIDATION_CAMPAIGN_DOCUMENT_PREFIX)
  )).sort());
}

function isCampaignDocumentKey(key) {
  if (!key.startsWith(VALIDATION_CAMPAIGN_DOCUMENT_PREFIX)) return false;
  try {
    return validationCampaignDocumentStorageKey(
      key.slice(VALIDATION_CAMPAIGN_DOCUMENT_PREFIX.length),
    ) === key;
  } catch {
    return false;
  }
}

function diagnostic(error, fallback = 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT') {
  return Object.freeze({
    code: typeof error?.code === 'string' ? error.code : fallback,
    message: typeof error?.message === 'string'
      ? error.message.slice(0, 320) : 'Validation Campaign storage is corrupt.',
  });
}

function readRaw(storage, key, operation) {
  try { return storage.read(key); } catch {
    failValidation(
      'VALIDATION_CAMPAIGN_PERSISTENCE_WRITE_FAILED',
      `Validation Campaign storage could not ${operation}.`,
      { operation },
    );
  }
}

function restoreRaw(storage) {
  const indexRaw = readRaw(storage, VALIDATION_CAMPAIGN_INDEX_KEY, 'hydrate');
  const knownKeys = campaignKeys(storage);
  if (indexRaw === null) {
    if (knownKeys.some((key) => key.startsWith(VALIDATION_CAMPAIGN_DOCUMENT_PREFIX))) {
      throw new Error('Validation Campaign storage contains an orphan document without an index.');
    }
    return Object.freeze({ documents: Object.freeze([]), index: null, indexRaw: null, status: 'empty' });
  }
  const index = parseCanonicalJson(indexRaw, {
    label: 'Validation Campaign index', maximumBytes: VALIDATION_LIMITS.maximumIndexBytes,
  });
  if (!Array.isArray(index.campaignIds)) throw new Error('Validation Campaign index ids are invalid.');
  const documents = index.campaignIds.map((campaignId) => {
    const key = validationCampaignDocumentStorageKey(campaignId);
    const raw = readRaw(storage, key, 'hydrate');
    if (raw === null) throw new Error(`Indexed Campaign ${campaignId} has no document.`);
    const payload = parseCanonicalJson(raw, {
      label: `Validation Campaign document ${campaignId}`,
      maximumBytes: VALIDATION_LIMITS.maximumCampaignBytes,
    });
    if (payload.campaign?.campaignId !== campaignId) {
      throw new Error(`Campaign document ${campaignId} has a mismatched identity.`);
    }
    return Object.freeze({ campaignId, key, payload, raw });
  });
  if (knownKeys.length > 0) {
    const expected = new Set([
      VALIDATION_CAMPAIGN_INDEX_KEY,
      ...index.campaignIds.map(validationCampaignDocumentStorageKey),
    ]);
    const orphan = knownKeys.find((key) => !expected.has(key));
    if (orphan) throw new Error('Validation Campaign storage contains an orphan document.');
  }
  const combined = utf8Bytes(indexRaw) + documents.reduce((total, entry) => total + utf8Bytes(entry.raw), 0);
  if (combined > VALIDATION_LIMITS.maximumCombinedBytes) {
    failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', 'Combined Campaign storage exceeds 1.5 MB.', {
      operation: 'hydrate',
    });
  }
  return Object.freeze({ documents: Object.freeze(documents), index, indexRaw, status: 'ready' });
}

function restorePrior(storage, record) {
  const errors = [];
  for (const write of [...record.writes].reverse()) {
    if (!write.applied) continue;
    try {
      if (storage.read(write.key) !== write.candidateRaw) {
        throw new Error('Candidate bytes changed before rollback.');
      }
      if (write.previousRaw === null) storage.remove(write.key);
      else storage.write(write.key, write.previousRaw);
      if (storage.read(write.key) !== write.previousRaw) {
        throw new Error('Prior Campaign bytes were not restored.');
      }
      write.applied = false;
    } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) {
    failValidation(
      'VALIDATION_CAMPAIGN_ROLLBACK_UNPROVEN',
      'Validation Campaign rollback could not prove exact prior bytes.',
      { operation: 'rollback' },
    );
  }
}

/** Own exact Campaign index/document bytes and reversible multi-key CAS writes. */
export function createValidationCampaignPersistenceAdapter({ storage } = {}) {
  const port = requireStorage(storage);

  function restore() {
    try { return restoreRaw(port); } catch (error) {
      return Object.freeze({ diagnostic: diagnostic(error), documents: Object.freeze([]), status: 'corrupt' });
    }
  }

  function prepare({ writes } = {}) {
    if (!Array.isArray(writes) || writes.length < 1 || writes.length > 2) {
      throw new TypeError('Campaign persistence prepares one or two writes.');
    }
    const seen = new Set();
    const records = writes.map((write) => {
      if (!write || typeof write !== 'object' || typeof write.key !== 'string'
        || (write.key !== VALIDATION_CAMPAIGN_INDEX_KEY
          && !isCampaignDocumentKey(write.key))
        || (write.expectedRaw !== null && typeof write.expectedRaw !== 'string')
        || seen.has(write.key)) throw new TypeError('Campaign persistence write is invalid.');
      seen.add(write.key);
      const candidateRaw = canonicalJson(write.payload);
      const ceiling = write.key === VALIDATION_CAMPAIGN_INDEX_KEY
        ? VALIDATION_LIMITS.maximumIndexBytes : VALIDATION_LIMITS.maximumCampaignBytes;
      if (utf8Bytes(candidateRaw) > ceiling) {
        failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', 'Campaign persisted value is oversized.', {
          operation: 'prepare-persistence',
        });
      }
      const previousRaw = readRaw(port, write.key, 'prepare persistence');
      if (previousRaw !== write.expectedRaw) {
        failValidation(
          'VALIDATION_CAMPAIGN_PERSISTENCE_CAS_STALE',
          'Validation Campaign bytes changed before persistence preparation.',
          { operation: 'prepare-persistence' },
        );
      }
      return {
        applied: false,
        candidateRaw,
        key: write.key,
        previousRaw,
      };
    });
    const keys = new Set(campaignKeys(port));
    records.forEach(({ key }) => keys.add(key));
    let combined = 0;
    for (const key of keys) {
      const replacement = records.find((entry) => entry.key === key);
      const raw = replacement?.candidateRaw ?? readRaw(port, key, 'measure persistence');
      if (raw !== null) combined += utf8Bytes(raw);
    }
    if (combined > VALIDATION_LIMITS.maximumCombinedBytes) {
      failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', 'Combined Campaign storage exceeds 1.5 MB.', {
        operation: 'prepare-persistence',
      });
    }
    return new ValidationPersistencePreparation({ state: 'prepared', writes: records });
  }

  function apply(candidate) {
    const record = preparation(candidate);
    if (record.state !== 'prepared') throw new TypeError('Only prepared Campaign bytes may apply.');
    try {
      for (const write of record.writes) {
        if (port.read(write.key) !== write.previousRaw) {
          failValidation(
            'VALIDATION_CAMPAIGN_PERSISTENCE_CAS_STALE',
            'Validation Campaign bytes changed before apply.',
            { operation: 'apply-persistence' },
          );
        }
        port.write(write.key, write.candidateRaw);
        write.applied = true;
        if (port.read(write.key) !== write.candidateRaw) throw new Error('Campaign readback differs.');
      }
    } catch (error) {
      try { restorePrior(port, record); } catch (rollbackError) { throw rollbackError; }
      if (error?.code === 'VALIDATION_CAMPAIGN_PERSISTENCE_CAS_STALE') throw error;
      failValidation(
        'VALIDATION_CAMPAIGN_PERSISTENCE_WRITE_FAILED',
        'Validation Campaign persistence apply failed; prior bytes were restored.',
        { operation: 'apply-persistence' },
      );
    }
    record.state = 'applied';
    return Object.freeze({ raws: Object.freeze(record.writes.map(({ key, candidateRaw: raw }) => (
      Object.freeze({ key, raw })
    ))) });
  }

  function finalize(candidate) {
    const record = preparation(candidate);
    if (record.state !== 'applied') throw new TypeError('Only applied Campaign bytes may finalize.');
    for (const write of record.writes) {
      if (port.read(write.key) !== write.candidateRaw) {
        failValidation(
          'VALIDATION_CAMPAIGN_PERSISTENCE_WRITE_FAILED',
          'Validation Campaign final readback could not be proven.',
          { operation: 'finalize-persistence' },
        );
      }
    }
    record.state = 'finalized';
    return Object.freeze({ status: 'finalized' });
  }

  function rollback(candidate) {
    const record = preparation(candidate);
    if (record.state === 'rolled-back') return;
    if (record.state === 'finalized') throw new TypeError('Finalized Campaign bytes cannot roll back.');
    restorePrior(port, record);
    record.state = 'rolled-back';
  }

  return Object.freeze({ apply, finalize, prepare, restore, rollback });
}
