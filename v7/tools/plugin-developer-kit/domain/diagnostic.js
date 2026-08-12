import { EXIT } from './contract.js';

const KINDS = new Set(Object.keys(EXIT));

export function diagnostic(code, phase, message, location = {}) {
  const result = {
    code,
    message,
    phase,
    related: location.related ?? [],
    severity: location.severity ?? 'error',
  };
  for (const key of ['jsonPointer', 'logicalPath', 'sourceSpan', 'suggestedFix']) {
    if (location[key] !== undefined) result[key] = location[key];
  }
  return Object.freeze(result);
}

export class DeveloperKitFailure extends Error {
  constructor(kind, diagnostics, options) {
    if (!KINDS.has(kind) || kind === 'passed') throw new TypeError('Invalid Developer Kit failure kind.');
    const values = Array.isArray(diagnostics) ? diagnostics : [diagnostics];
    super(values[0]?.message ?? 'Developer Kit operation failed.', options);
    this.name = 'DeveloperKitFailure';
    this.kind = kind;
    this.diagnostics = Object.freeze(values);
  }
}

export function fail(kind, code, phase, message, location) {
  throw new DeveloperKitFailure(kind, diagnostic(code, phase, message, location));
}

export function asFailure(error) {
  if (error instanceof DeveloperKitFailure) return error;
  return new DeveloperKitFailure('internal', diagnostic(
    'V7DK_INTERNAL_TOOLCHAIN',
    'internal',
    'The Developer Kit encountered an internal toolchain failure.',
    { related: [{ errorName: error?.name ?? 'Error' }] },
  ), { cause: error });
}
