import { CAPABILITY_INTERNALS } from './common-contract.js';

const { fail, normalizeBase, stringList } = CAPABILITY_INTERNALS;
const OUTPUT_KINDS = Object.freeze(['declarative-series', 'declarative-overlay']);

/**
 * Owner: module-registry.
 * Declares a versioned deterministic sandbox boundary for future formula syntax.
 * It contains neither evaluator implementation nor executable user code.
 */
export function defineFormulaEngine(value) {
  const base = normalizeBase(value, {
    kind: 'formula',
    contract: 'FormulaEngine',
    specificFields: ['syntaxVersion', 'inputKind', 'outputKinds', 'sandboxed', 'deterministic'],
  });
  const outputKinds = stringList(value.outputKinds, 'outputKinds', { ids: false });
  if (typeof value.syntaxVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.syntaxVersion)
    || value.inputKind !== 'immutable-pane-bars'
    || outputKinds.some((kind) => !OUTPUT_KINDS.includes(kind))
    || value.sandboxed !== true
    || value.deterministic !== true) {
    fail('UNSAFE_FORMULA_CONTRACT', `${base.id} violates formula isolation.`);
  }
  return Object.freeze({
    ...base,
    syntaxVersion: value.syntaxVersion,
    inputKind: value.inputKind,
    outputKinds,
    sandboxed: true,
    deterministic: true,
  });
}
