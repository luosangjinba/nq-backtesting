import { failCalculatedSeriesPersistence } from './persistence-error.js';

class CalculatedSeriesPersistencePreparationValue {
  #record;
  constructor(record) { this.#record = record; Object.freeze(this); }
  record() { return this.#record; }
}

export function createCalculatedSeriesPersistencePreparation(record) {
  return new CalculatedSeriesPersistencePreparationValue(record);
}

export function readCalculatedSeriesPersistencePreparation(candidate) {
  if (!(candidate instanceof CalculatedSeriesPersistencePreparationValue)) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_PREPARATION_REQUIRED',
      'Calculated-series persistence requires its exact preparation.',
    );
  }
  return candidate.record();
}
