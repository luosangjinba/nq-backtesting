import { failPluginContract } from './plugin-contract-error.js';

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RANGE = /^(\^)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function components(value, pattern, label) {
  const match = typeof value === 'string' ? value.match(pattern) : null;
  if (!match) failPluginContract('PLUGIN_VERSION_INVALID', `${label} is invalid.`);
  const values = match.slice(-3).map(Number);
  if (values.some((component) => !Number.isSafeInteger(component))) {
    failPluginContract('PLUGIN_VERSION_INVALID', `${label} exceeds the portable version bound.`);
  }
  return Object.freeze(values);
}

export function pluginVersion(value, label) {
  components(value, VERSION, label);
  return value;
}

export function pluginVersionRange(value, label) {
  components(value, RANGE, label);
  return value;
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** Compare two exact semantic versions, returning a negative, zero, or positive number. */
export function comparePluginVersions(left, right) {
  return compare(
    components(left, VERSION, 'Left plugin version'),
    components(right, VERSION, 'Right plugin version'),
  );
}

export function pluginVersionSatisfies(version, range) {
  const candidate = components(version, VERSION, 'Plugin version');
  const required = components(range, RANGE, 'Plugin version range');
  if (!range.startsWith('^')) return compare(candidate, required) === 0;
  if (compare(candidate, required) < 0) return false;
  if (required[0] > 0) return candidate[0] === required[0];
  if (required[1] > 0) return candidate[0] === 0 && candidate[1] === required[1];
  return candidate[0] === 0 && candidate[1] === 0 && candidate[2] === required[2];
}
