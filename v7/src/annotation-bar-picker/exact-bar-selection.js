import { failBarPicker } from './bar-picker-error.js';

const FIELDS = Object.freeze(['barStartEpochMs', 'paneId', 'schemaVersion']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const selections = new WeakSet();

function requireExact(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...FIELDS].sort().join(',')) {
    failBarPicker('ANNOTATION_BAR_SELECTION_INVALID', 'Exact Bar selection fields are invalid.');
  }
  if (value.schemaVersion !== 1 || typeof value.paneId !== 'string' || !ID.test(value.paneId)
    || !Number.isSafeInteger(value.barStartEpochMs) || value.barStartEpochMs < 0) {
    failBarPicker('ANNOTATION_BAR_SELECTION_INVALID', 'Exact Bar selection values are invalid.');
  }
  return value;
}

/** Create one vendor-neutral exact Bar selection for later evidence composition. */
export function createExactAnnotationBarSelection(value) {
  const input = requireExact(value);
  const selection = Object.freeze({
    barStartEpochMs: input.barStartEpochMs,
    paneId: input.paneId,
    schemaVersion: 1,
  });
  selections.add(selection);
  return selection;
}

/** Reject structural lookalikes at public boundaries. */
export function readExactAnnotationBarSelection(value) {
  requireExact(value);
  if (!selections.has(value)) {
    failBarPicker('ANNOTATION_BAR_SELECTION_UNBRANDED', 'Exact Bar selection is not owner-created.');
  }
  return value;
}
