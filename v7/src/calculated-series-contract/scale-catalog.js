import { failCalculatedSeries } from './contract-error.js';
import {
  enumValue,
  exactRecord,
  finiteNumber,
  optionalExactRecord,
  portableValue,
} from './portable-value.js';

const DIMENSION_ENTRIES = Object.freeze([
  Object.freeze({ dimensionId: 'market.instrument-price', dimensionVersion: '1.0.0', unitId: 'market.instrument-price', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.price@1.0.0']) }),
  Object.freeze({ dimensionId: 'market.price-distance', dimensionVersion: '1.0.0', unitId: 'market.price-distance', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.decimal@1.0.0']) }),
  Object.freeze({ dimensionId: 'market.volume', dimensionVersion: '1.0.0', unitId: 'market.volume', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.volume@1.0.0']) }),
  Object.freeze({ dimensionId: 'ratio.percentage', dimensionVersion: '1.0.0', unitId: 'ratio.percent', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.percentage@1.0.0']) }),
  Object.freeze({ dimensionId: 'ratio.value', dimensionVersion: '1.0.0', unitId: 'ratio.decimal', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.decimal@1.0.0']) }),
  Object.freeze({ dimensionId: 'unitless.value', dimensionVersion: '1.0.0', unitId: 'unitless.value', unitVersion: '1.0.0', formatterIds: Object.freeze(['host.decimal@1.0.0']) }),
]);

const FORMATTER_ENTRIES = Object.freeze([
  Object.freeze({ formatterId: 'host.decimal', formatterVersion: '1.0.0', optionFields: Object.freeze(['decimals']) }),
  Object.freeze({ formatterId: 'host.percentage', formatterVersion: '1.0.0', optionFields: Object.freeze(['decimals']) }),
  Object.freeze({ formatterId: 'host.price', formatterVersion: '1.0.0', optionFields: Object.freeze(['decimals']) }),
  Object.freeze({ formatterId: 'host.volume', formatterVersion: '1.0.0', optionFields: Object.freeze(['compact', 'decimals']) }),
]);

const DIMENSIONS = Object.freeze(Object.fromEntries(DIMENSION_ENTRIES.map((entry) => [
  `${entry.dimensionId}@${entry.dimensionVersion}`,
  entry,
])));

const FORMATTERS = Object.freeze(Object.fromEntries(FORMATTER_ENTRIES.map((entry) => [
  `${entry.formatterId}@${entry.formatterVersion}`,
  entry.optionFields,
])));

function versionedKey(value) {
  return `${value.dimensionId}@${value.dimensionVersion}`;
}

function formatterKey(value) {
  return `${value.formatterId}@${value.formatterVersion}`;
}

function normalizeIdentity(value, prefix, label) {
  const id = value[`${prefix}Id`];
  const version = value[`${prefix}Version`];
  if (typeof id !== 'string' || typeof version !== 'string') {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_INVALID', `${label} identity is invalid.`);
  }
  return Object.freeze({ [`${prefix}Id`]: id, [`${prefix}Version`]: version });
}

function formatterOptions(value, key) {
  const allowed = FORMATTERS[key];
  if (!allowed) {
    failCalculatedSeries('CALCULATED_SERIES_FORMATTER_UNSUPPORTED', 'Formatter is not catalogued.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).some((field) => !allowed.includes(field))) {
    failCalculatedSeries('CALCULATED_SERIES_FORMATTER_INVALID', 'Formatter options are invalid.');
  }
  const options = {};
  if ('decimals' in value) {
    if (!Number.isSafeInteger(value.decimals) || value.decimals < 0 || value.decimals > 12) {
      failCalculatedSeries('CALCULATED_SERIES_FORMATTER_INVALID', 'Formatter decimals are invalid.');
    }
    options.decimals = value.decimals;
  }
  if ('compact' in value) {
    if (typeof value.compact !== 'boolean') {
      failCalculatedSeries('CALCULATED_SERIES_FORMATTER_INVALID', 'Formatter compact flag is invalid.');
    }
    options.compact = value.compact;
  }
  return Object.freeze(options);
}

function normalizeFormatter(value) {
  exactRecord(
    value,
    ['formatterId', 'formatterVersion', 'options'],
    'CALCULATED_SERIES_SCALE_INVALID',
    'Formatter',
  );
  const identity = normalizeIdentity(value, 'formatter', 'Formatter');
  const key = formatterKey(identity);
  return Object.freeze({ ...identity, options: formatterOptions(value.options, key) });
}

function normalizeDomain(value) {
  optionalExactRecord(
    value,
    ['kind'],
    ['magnitude', 'maximum', 'minimum'],
    'CALCULATED_SERIES_SCALE_INVALID',
    'Scale domain',
  );
  if (value.kind === 'auto' && Object.keys(value).length === 1) return Object.freeze({ kind: 'auto' });
  if (value.kind === 'fixed' && Object.keys(value).length === 3) {
    const minimum = finiteNumber(value.minimum, 'Fixed-domain minimum');
    const maximum = finiteNumber(value.maximum, 'Fixed-domain maximum');
    if (minimum >= maximum) {
      failCalculatedSeries('CALCULATED_SERIES_SCALE_INVALID', 'Fixed domain must increase.');
    }
    return Object.freeze({ kind: 'fixed', maximum, minimum });
  }
  if (value.kind === 'symmetric-around-zero' && Object.keys(value).length === 2) {
    const magnitude = value.magnitude === 'auto'
      ? 'auto' : finiteNumber(value.magnitude, 'Symmetric magnitude', { positive: true });
    return Object.freeze({ kind: value.kind, magnitude });
  }
  failCalculatedSeries('CALCULATED_SERIES_SCALE_INVALID', 'Scale domain variant is invalid.');
}

function enforceCatalogAndSemantics(scale) {
  const dimension = DIMENSIONS[versionedKey(scale.dimension)];
  if (!dimension || dimension.unitId !== scale.unit.unitId
    || dimension.unitVersion !== scale.unit.unitVersion) {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_CATALOG_MISMATCH', 'Dimension/unit is not catalogued.');
  }
  if (!dimension.formatterIds.includes(formatterKey(scale.formatter))) {
    failCalculatedSeries('CALCULATED_SERIES_FORMATTER_INCOMPATIBLE', 'Formatter does not match dimension.');
  }
  if (scale.transform === 'logarithmic' && scale.zeroPolicy !== 'forbid-nonpositive') {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_ZERO_INCOMPATIBLE', 'Logarithmic scale must forbid nonpositive values.');
  }
  if (scale.transform === 'logarithmic' && scale.domain.kind === 'symmetric-around-zero') {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_DOMAIN_INCOMPATIBLE', 'Symmetric domain cannot be logarithmic.');
  }
  if (scale.transform === 'logarithmic' && scale.domain.kind === 'fixed'
    && scale.domain.minimum <= 0) {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_DOMAIN_INCOMPATIBLE', 'Logarithmic fixed domain must be positive.');
  }
}

/** Define an exact host-catalogued Scale intent without choosing chart placement. */
export function defineScaleIntent(value = {}) {
  exactRecord(
    value,
    ['dimension', 'domain', 'formatter', 'schemaVersion', 'transform', 'unit', 'zeroPolicy'],
    'CALCULATED_SERIES_SCALE_INVALID',
    'Scale intent',
  );
  if (value.schemaVersion !== 1) {
    failCalculatedSeries('CALCULATED_SERIES_SCHEMA_UNSUPPORTED', 'Scale schema is unsupported.');
  }
  exactRecord(value.dimension, ['dimensionId', 'dimensionVersion'],
    'CALCULATED_SERIES_SCALE_INVALID', 'Dimension');
  exactRecord(value.unit, ['unitId', 'unitVersion'],
    'CALCULATED_SERIES_SCALE_INVALID', 'Unit');
  const scale = Object.freeze({
    dimension: normalizeIdentity(value.dimension, 'dimension', 'Dimension'),
    domain: normalizeDomain(value.domain),
    formatter: normalizeFormatter(value.formatter),
    schemaVersion: 1,
    transform: enumValue(value.transform, ['linear', 'logarithmic'], 'CALCULATED_SERIES_SCALE_INVALID', 'Scale transform'),
    unit: normalizeIdentity(value.unit, 'unit', 'Unit'),
    zeroPolicy: enumValue(value.zeroPolicy, ['not-required', 'include', 'forbid-nonpositive'], 'CALCULATED_SERIES_SCALE_INVALID', 'Zero policy'),
  });
  enforceCatalogAndSemantics(scale);
  return scale;
}

function comparable(value) {
  return typeof value === 'object' ? JSON.stringify(value) : value;
}

/** Compare two valid Scale intents structurally without selecting a region or native scale. */
export function assessScaleIntentCompatibility(leftCandidate, rightCandidate) {
  const left = defineScaleIntent(leftCandidate);
  const right = defineScaleIntent(rightCandidate);
  const conflicts = ['dimension', 'unit', 'transform', 'domain', 'formatter', 'zeroPolicy']
    .filter((field) => comparable(left[field]) !== comparable(right[field]));
  return Object.freeze({
    code: conflicts.length === 0
      ? 'CALCULATED_SERIES_SCALE_COMPATIBLE'
      : 'CALCULATED_SERIES_SCALE_INCOMPATIBLE',
    compatible: conflicts.length === 0,
    conflicts: Object.freeze(conflicts),
  });
}

/** Return the immutable V1 dimension/formatter catalog for evidence and tooling. */
export function readCalculatedSeriesScaleCatalog() {
  return portableValue({
    dimensions: DIMENSION_ENTRIES,
    formatters: FORMATTER_ENTRIES,
    schemaVersion: 1,
  });
}
