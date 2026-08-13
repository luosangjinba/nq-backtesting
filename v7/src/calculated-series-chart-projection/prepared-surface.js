import { failCalculatedSeriesChartProjection } from './projection-error.js';

class PreparedCalculatedSeriesChartProjectionValue {
  #operations;
  #snapshot;
  constructor(snapshot, operations) {
    this.#operations = operations;
    this.#snapshot = snapshot;
    Object.freeze(this);
  }
  apply() { return this.#operations.apply(this); }
  dispose() { return this.#operations.dispose(this); }
  finalize(receipt) { return this.#operations.finalize(this, receipt); }
  read() { return this.#snapshot(); }
  rollback(receipt = null) { return this.#operations.rollback(this, receipt); }
  snapshot() { return this.#snapshot(); }
}

class CalculatedSeriesChartProjectionReceiptValue {
  #prepared;
  #snapshot;
  constructor(prepared, snapshot) {
    this.#prepared = prepared;
    this.#snapshot = snapshot;
    Object.freeze(this);
  }
  matches(prepared) { return this.#prepared === prepared; }
  read() { return this.#snapshot; }
}

export function createPreparedCalculatedSeriesChartProjection(snapshot, operations) {
  return new PreparedCalculatedSeriesChartProjectionValue(snapshot, operations);
}

/** Reject lookalikes and return the immutable lifecycle evidence for one Chart-owned preparation. */
export function readPreparedCalculatedSeriesChartProjection(candidate) {
  if (!(candidate instanceof PreparedCalculatedSeriesChartProjectionValue)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_PREPARATION_REQUIRED',
      'A branded Chart-owned calculated-series preparation is required.',
    );
  }
  return candidate.read();
}

export function createCalculatedSeriesChartProjectionReceipt(prepared, snapshot) {
  readPreparedCalculatedSeriesChartProjection(prepared);
  return new CalculatedSeriesChartProjectionReceiptValue(prepared, snapshot);
}

/** Read receipt evidence without exposing the adapter-native stage or preparation brand. */
export function readCalculatedSeriesChartProjectionReceipt(candidate) {
  if (!(candidate instanceof CalculatedSeriesChartProjectionReceiptValue)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_RECEIPT_REQUIRED',
      'An exact calculated-series Chart receipt is required.',
    );
  }
  return candidate.read();
}

export function requireMatchingCalculatedSeriesChartProjectionReceipt(candidate, prepared) {
  readCalculatedSeriesChartProjectionReceipt(candidate);
  if (!candidate.matches(prepared)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_RECEIPT_MISMATCH',
      'Projection receipt belongs to another preparation.',
    );
  }
  return candidate;
}
