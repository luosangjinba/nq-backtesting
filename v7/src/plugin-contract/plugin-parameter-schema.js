import {
  boundedText,
  exactRecord,
  fieldId,
  portableValue,
} from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';

const TAB_ORDER = Object.freeze(['inputs', 'style', 'visibility', 'evidence', 'history']);
const SETTINGS_TABS = new Set(['inputs', 'style', 'visibility']);
const INSPECTOR_TABS = new Set(['inputs', 'evidence', 'history']);
const SCOPE_ORDER = Object.freeze(['package', 'profile', 'instance']);
const COLOR = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;

class PluginParameterSchemaValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function normalizeSelectOptions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Select options are invalid.');
  }
  const options = value.map((option) => {
    exactRecord(
      option,
      ['label', 'value'],
      'PLUGIN_PARAMETER_SCHEMA_INVALID',
      'Select option',
    );
    return Object.freeze({
      label: boundedText(option.label, 'Select option label', { max: 80 }),
      value: boundedText(option.value, 'Select option value', { max: 80 }),
    });
  });
  if (new Set(options.map(({ value: option }) => option)).size !== options.length) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Select option values must be unique.');
  }
  return Object.freeze(options);
}

function normalizeControl(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter control is invalid.');
  }
  if (value.kind === 'boolean' || value.kind === 'color') {
    exactRecord(value, ['kind'], 'PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter control');
    return Object.freeze({ kind: value.kind });
  }
  if (value.kind === 'number') {
    exactRecord(
      value,
      ['kind', 'max', 'min', 'step'],
      'PLUGIN_PARAMETER_SCHEMA_INVALID',
      'Number control',
    );
    if (!Number.isFinite(value.min) || !Number.isFinite(value.max)
      || !Number.isFinite(value.step) || value.min > value.max || value.step <= 0) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Number control bounds are invalid.');
    }
    return Object.freeze({ kind: 'number', max: value.max, min: value.min, step: value.step });
  }
  if (value.kind === 'text') {
    exactRecord(
      value,
      ['kind', 'maxLength'],
      'PLUGIN_PARAMETER_SCHEMA_INVALID',
      'Text control',
    );
    if (!Number.isInteger(value.maxLength) || value.maxLength < 1 || value.maxLength > 512) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Text control bound is invalid.');
    }
    return Object.freeze({ kind: 'text', maxLength: value.maxLength });
  }
  if (value.kind === 'select') {
    exactRecord(
      value,
      ['kind', 'options'],
      'PLUGIN_PARAMETER_SCHEMA_INVALID',
      'Select control',
    );
    return Object.freeze({ kind: 'select', options: normalizeSelectOptions(value.options) });
  }
  failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter control kind is unsupported.');
}

function valueMatchesControl(control, value) {
  if (control.kind === 'boolean') return typeof value === 'boolean';
  if (control.kind === 'color') return typeof value === 'string' && COLOR.test(value);
  if (control.kind === 'text') return typeof value === 'string' && value.length <= control.maxLength;
  if (control.kind === 'select') {
    return typeof value === 'string' && control.options.some((option) => option.value === value);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)
    || value < control.min || value > control.max) return false;
  const steps = (value - control.min) / control.step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function normalizeScopes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > SCOPE_ORDER.length
    || value.some((scope) => !SCOPE_ORDER.includes(scope))
    || new Set(value).size !== value.length) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter scopes are invalid.');
  }
  return Object.freeze([...value].sort((left, right) => (
    SCOPE_ORDER.indexOf(left) - SCOPE_ORDER.indexOf(right)
  )));
}

function normalizeField(value) {
  exactRecord(
    value,
    ['control', 'defaultValue', 'id', 'label', 'scopes'],
    'PLUGIN_PARAMETER_SCHEMA_INVALID',
    'Parameter field',
  );
  const control = normalizeControl(value.control);
  const defaultValue = portableValue(value.defaultValue, `parameter.${value.id}.defaultValue`);
  if (!valueMatchesControl(control, defaultValue)) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter default does not match its control.');
  }
  return Object.freeze({
    control,
    defaultValue,
    id: fieldId(value.id, 'Parameter field id'),
    label: boundedText(value.label, 'Parameter field label', { max: 96 }),
    scopes: normalizeScopes(value.scopes),
  });
}

function normalizeTabSource(tabId, value) {
  if (value?.kind === 'settings') {
    exactRecord(value, ['fields', 'kind'], 'PLUGIN_PARAMETER_SCHEMA_INVALID', 'Settings source');
    if (!SETTINGS_TABS.has(tabId) || !Array.isArray(value.fields)
      || value.fields.length < 1 || value.fields.length > 32) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Settings tab source is invalid.');
    }
    return Object.freeze({ kind: 'settings', fields: Object.freeze(value.fields.map(normalizeField)) });
  }
  if (value?.kind === 'inspector-groups') {
    exactRecord(
      value,
      ['groupIds', 'kind'],
      'PLUGIN_PARAMETER_SCHEMA_INVALID',
      'Inspector source',
    );
    if (!INSPECTOR_TABS.has(tabId) || !Array.isArray(value.groupIds)
      || value.groupIds.length < 1 || value.groupIds.length > 8) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Inspector tab source is invalid.');
    }
    const groupIds = Object.freeze(value.groupIds.map((id) => fieldId(id, 'Inspector group id')));
    if (new Set(groupIds).size !== groupIds.length) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Inspector group ids must be unique.');
    }
    return Object.freeze({ groupIds, kind: 'inspector-groups' });
  }
  failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter tab source is invalid.');
}

export function normalizePluginParameterSchemaWire(value = {}) {
  exactRecord(
    value,
    ['schemaVersion', 'tabs'],
    'PLUGIN_PARAMETER_SCHEMA_INVALID',
    'Plugin parameter schema',
  );
  if (value.schemaVersion !== 1 || !Array.isArray(value.tabs)
    || value.tabs.length < 1 || value.tabs.length > TAB_ORDER.length) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Plugin parameter schema is invalid.');
  }
  const tabs = value.tabs.map((tab) => {
    exactRecord(tab, ['id', 'source'], 'PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter tab');
    if (!TAB_ORDER.includes(tab.id)) {
      failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter tab id is invalid.');
    }
    return Object.freeze({ id: tab.id, source: normalizeTabSource(tab.id, tab.source) });
  }).sort((left, right) => TAB_ORDER.indexOf(left.id) - TAB_ORDER.indexOf(right.id));
  if (new Set(tabs.map(({ id }) => id)).size !== tabs.length) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter tab ids must be unique.');
  }
  const fieldIds = tabs.flatMap(({ source }) => source.kind === 'settings'
    ? source.fields.map(({ id }) => id) : []);
  if (new Set(fieldIds).size !== fieldIds.length) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_INVALID', 'Parameter field ids must be unique.');
  }
  return Object.freeze({ schemaVersion: 1, tabs: Object.freeze(tabs) });
}

/** Define one portable host-rendered parameter schema with no DOM or persistence authority. */
export function definePluginParameterSchema(value = {}) {
  return new PluginParameterSchemaValue(normalizePluginParameterSchemaWire(value));
}

/** Read one branded parameter schema for a host renderer or pure settings resolver. */
export function readPluginParameterSchema(candidate) {
  if (!(candidate instanceof PluginParameterSchemaValue)) {
    failPluginContract('PLUGIN_PARAMETER_SCHEMA_REQUIRED', 'A branded parameter schema is required.');
  }
  return candidate.read();
}

function settingsMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failPluginContract('PLUGIN_SETTINGS_INVALID', `${label} must be a plain record.`);
  }
  return value;
}

function validateOverrides(values, scope, fields) {
  return Object.freeze(Object.fromEntries(Object.entries(settingsMap(values, `${scope} settings`)).map(
    ([id, candidate]) => {
      const field = fields.get(id);
      if (!field || !field.scopes.includes(scope)) {
        failPluginContract('PLUGIN_SETTINGS_INVALID', `${scope} setting ${id} is unavailable.`);
      }
      const value = portableValue(candidate, `${scope}.${id}`);
      if (!valueMatchesControl(field.control, value)) {
        failPluginContract('PLUGIN_SETTINGS_INVALID', `${scope} setting ${id} is invalid.`);
      }
      return [id, value];
    },
  )));
}

/** Resolve effective package/profile/instance values without owning their persistence. */
export function resolvePluginSettings(schema, input = {}) {
  const wire = readPluginParameterSchema(schema);
  const keys = Object.keys(input);
  if (keys.some((key) => !['instanceValues', 'packageValues', 'profileValues'].includes(key))) {
    failPluginContract('PLUGIN_SETTINGS_INVALID', 'Settings input contains unknown fields.');
  }
  const fields = new Map(wire.tabs.flatMap(({ source }) => source.kind === 'settings'
    ? source.fields.map((field) => [field.id, field]) : []));
  const packageValues = validateOverrides(input.packageValues ?? {}, 'package', fields);
  const profileValues = validateOverrides(input.profileValues ?? {}, 'profile', fields);
  const instanceValues = validateOverrides(input.instanceValues ?? {}, 'instance', fields);
  const values = [...fields.values()].map((field) => {
    const candidates = [
      ['instance', instanceValues],
      ['profile', profileValues],
      ['package', packageValues],
    ];
    const selected = candidates.find(([, map]) => Object.hasOwn(map, field.id));
    return Object.freeze({
      fieldId: field.id,
      source: selected?.[0] ?? 'definition-default',
      value: selected?.[1][field.id] ?? field.defaultValue,
    });
  });
  return Object.freeze({ schemaVersion: wire.schemaVersion, values: Object.freeze(values) });
}
