export const VALIDATION_DATABASE_NAME = 'v6.validation';
export const VALIDATION_DATABASE_VERSION = 2;

export const VALIDATION_STORES = Object.freeze({
  CAMPAIGNS: 'validationCampaigns',
  EVIDENCE: 'validationEvidence',
  OBSERVATIONS: 'validationObservations',
  PLAYBOOK_VERSIONS: 'playbookVersions',
  TRIALS: 'validationTrials',
});

export const VALIDATION_STORE_DEFINITIONS = Object.freeze({
  [VALIDATION_STORES.PLAYBOOK_VERSIONS]: Object.freeze({
    indexes: Object.freeze([
      Object.freeze({ keyPath: ['playbookId', 'version'], name: 'byPlaybookVersion', unique: true }),
      Object.freeze({ keyPath: 'playbookId', name: 'byPlaybookId', unique: false }),
    ]),
    keyPath: 'id',
  }),
  [VALIDATION_STORES.CAMPAIGNS]: Object.freeze({
    indexes: Object.freeze([
      Object.freeze({ keyPath: 'playbookVersionId', name: 'byPlaybookVersionId', unique: false }),
      Object.freeze({ keyPath: 'status', name: 'byStatus', unique: false }),
    ]),
    keyPath: 'id',
  }),
  [VALIDATION_STORES.TRIALS]: Object.freeze({
    indexes: Object.freeze([
      Object.freeze({ keyPath: 'campaignId', name: 'byCampaignId', unique: false }),
      Object.freeze({ keyPath: 'status', name: 'byStatus', unique: false }),
    ]),
    keyPath: 'id',
  }),
  [VALIDATION_STORES.OBSERVATIONS]: Object.freeze({
    indexes: Object.freeze([
      Object.freeze({ keyPath: 'trialId', name: 'byTrialId', unique: false }),
      Object.freeze({ keyPath: 'evidenceId', name: 'byEvidenceId', unique: true }),
    ]),
    keyPath: 'id',
  }),
  [VALIDATION_STORES.EVIDENCE]: Object.freeze({
    indexes: Object.freeze([
      Object.freeze({ keyPath: 'trialId', name: 'byTrialId', unique: false }),
      Object.freeze({ keyPath: 'observationId', name: 'byObservationId', unique: true }),
    ]),
    keyPath: 'id',
  }),
});

function createStore(db, name, definition) {
  const store = db.createObjectStore(name, { keyPath: definition.keyPath });
  definition.indexes.forEach((index) => {
    store.createIndex(index.name, index.keyPath, { unique: index.unique });
  });
}

export function applyValidationIndexedDbMigrations({
  db,
  oldVersion = 0,
} = {}) {
  if (!db || typeof db.createObjectStore !== 'function') {
    throw new Error('Validation IndexedDB migration requires a database.');
  }
  if (Number(oldVersion) < 1) {
    [VALIDATION_STORES.PLAYBOOK_VERSIONS, VALIDATION_STORES.CAMPAIGNS, VALIDATION_STORES.TRIALS]
      .forEach((name) => {
      const definition = VALIDATION_STORE_DEFINITIONS[name];
      createStore(db, name, definition);
    });
  }
  if (Number(oldVersion) < 2) {
    [VALIDATION_STORES.OBSERVATIONS, VALIDATION_STORES.EVIDENCE].forEach((name) => {
      createStore(db, name, VALIDATION_STORE_DEFINITIONS[name]);
    });
  }
}
