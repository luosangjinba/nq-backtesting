import { CAPABILITY_INTERNALS } from './common-contract.js';

const { capabilityId, fail, normalizeBase, positiveSafeInteger, stringList } = CAPABILITY_INTERNALS;
const OUTPUT_KINDS = Object.freeze(['declarative-series', 'declarative-overlay']);

/**
 * Owner: module-registry.
 * Declares an optional indicator's immutable no-future input and declarative outputs.
 * It grants no Bar Data, Replay, Chart-engine, pane-mutation, network, or storage port.
 */
export function defineIndicatorModule(value) {
  const base = normalizeBase(value, {
    kind: 'indicator',
    contract: 'IndicatorModule',
    specificFields: [
      'inputKind',
      'outputKinds',
      'parameterSchemaVersion',
      'deterministic',
      'noFuture',
      'formulaEngineId',
    ],
  });
  const outputKinds = stringList(value.outputKinds, 'outputKinds', { ids: false });
  if (value.inputKind !== 'immutable-pane-bars'
    || outputKinds.some((kind) => !OUTPUT_KINDS.includes(kind))
    || value.deterministic !== true
    || value.noFuture !== true) {
    fail('UNSAFE_INDICATOR_CONTRACT', `${base.id} violates indicator isolation.`);
  }
  return Object.freeze({
    ...base,
    inputKind: value.inputKind,
    outputKinds,
    parameterSchemaVersion: positiveSafeInteger(
      value.parameterSchemaVersion,
      'parameterSchemaVersion',
    ),
    deterministic: true,
    noFuture: true,
    formulaEngineId: value.formulaEngineId === null
      ? null
      : capabilityId(value.formulaEngineId, 'formulaEngineId'),
  });
}
