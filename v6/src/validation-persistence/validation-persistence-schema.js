export const VALIDATION_DATABASE_NAME = 'v6.validation';
export const VALIDATION_DATABASE_VERSION = 1;

export const VALIDATION_STORES = Object.freeze({
  CAMPAIGNS: 'validationCampaigns',
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
    Object.entries(VALIDATION_STORE_DEFINITIONS).forEach(([name, definition]) => {
      createStore(db, name, definition);
    });
  }
}
