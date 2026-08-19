import {
  exactRecord,
  requireContractId,
  requireDigest,
  requireSemver,
  strictPortableValue,
  verifyContentDigest,
  withContentDigest,
} from './canonical-value.js';
import {
  OUTCOME_POLICY_ID,
  OUTCOME_POLICY_VERSION,
  SETUP_TEMPLATE_ID,
  SETUP_TEMPLATE_VERSION,
  VALIDATION_SCHEMAS,
} from './constants.js';

const DEFINITION_REF_FIELDS = Object.freeze(['contentDigest', 'id', 'version']);
const SETUP_FIELDS = Object.freeze([
  'contentDigest', 'contextRole', 'executionRole', 'fvgPredicate',
  'humanClassificationPolicy', 'schema', 'setupDefinitionId',
  'setupDefinitionVersion', 'smaPredicate', 'templateId', 'templateVersion', 'version',
]);
const OUTCOME_FIELDS = Object.freeze([
  'contentDigest', 'horizonUnit', 'maximumHorizon', 'mfeMaePolicy', 'minimumHorizon',
  'nonterminalClasses', 'outcomeDefinitionId', 'outcomeDefinitionVersion', 'policyId',
  'policyVersion', 'sameBarPolicy', 'schema', 'terminalClasses',
  'timeToFirstTouchPolicy', 'version',
]);

export function readDefinitionRef(value) {
  exactRecord(value, DEFINITION_REF_FIELDS, 'Definition reference');
  return strictPortableValue({
    contentDigest: requireDigest(value.contentDigest, 'Definition content digest'),
    id: requireContractId(value.id, 'Definition id'),
    version: requireSemver(value.version, 'Definition version'),
  });
}
export function definitionRef(definition, kind) {
  const prefix = kind === 'setup' ? 'setup' : 'outcome';
  return readDefinitionRef({
    contentDigest: definition.contentDigest,
    id: definition[`${prefix}DefinitionId`],
    version: definition[`${prefix}DefinitionVersion`],
  });
}

function validateSetupShape(value) {
  exactRecord(value, SETUP_FIELDS, 'Setup Definition');
  exactRecord(value.smaPredicate, [
    'definitionId', 'definitionVersion', 'length', 'longComparison', 'providerId',
    'providerVersion', 'requiredState', 'shortComparison', 'source',
  ], 'SMA predicate');
  exactRecord(value.fvgPredicate, [
    'longDirection', 'providerId', 'providerVersion', 'requiredState',
    'semanticTypeId', 'semanticTypeVersion', 'shortDirection',
  ], 'FVG predicate');
  exactRecord(value.humanClassificationPolicy, [
    'classes', 'explicitConfirmationRequired',
  ], 'Human classification policy');
  if (value.schema !== VALIDATION_SCHEMAS.setupDefinition || value.version !== 1
    || value.setupDefinitionId !== SETUP_TEMPLATE_ID
    || value.setupDefinitionVersion !== SETUP_TEMPLATE_VERSION
    || value.templateId !== SETUP_TEMPLATE_ID || value.templateVersion !== SETUP_TEMPLATE_VERSION
    || value.contextRole !== 'context-pane' || value.executionRole !== 'execution-pane'
    || JSON.stringify(value.smaPredicate) !== JSON.stringify({
      definitionId: 'moving-averages.sma.close',
      definitionVersion: '1.0.0',
      length: 20,
      longComparison: 'close-above-sma',
      providerId: 'validation.evidence.sma-close',
      providerVersion: '1.0.0',
      requiredState: 'ready-visible',
      shortComparison: 'close-below-sma',
      source: 'close',
    })
    || JSON.stringify(value.fvgPredicate) !== JSON.stringify({
      longDirection: 'bullish',
      providerId: 'validation.evidence.manual-fvg',
      providerVersion: '1.0.0',
      requiredState: 'active-accepted',
      semanticTypeId: 'imbalance.fvg',
      semanticTypeVersion: '1.0.0',
      shortDirection: 'bearish',
    })
    || JSON.stringify(value.humanClassificationPolicy) !== JSON.stringify({
      classes: ['qualified', 'rejected', 'ambiguous', 'incomplete'],
      explicitConfirmationRequired: true,
    })) {
    throw new TypeError('The R14.1 Setup Definition differs from its accepted seed.');
  }
  return value;
}

function validateOutcomeShape(value) {
  exactRecord(value, OUTCOME_FIELDS, 'Outcome Definition');
  if (value.schema !== VALIDATION_SCHEMAS.outcomeDefinition || value.version !== 1
    || value.outcomeDefinitionId !== OUTCOME_POLICY_ID
    || value.outcomeDefinitionVersion !== OUTCOME_POLICY_VERSION
    || value.policyId !== OUTCOME_POLICY_ID || value.policyVersion !== OUTCOME_POLICY_VERSION
    || value.horizonUnit !== 'execution-bars' || value.minimumHorizon !== 1
    || value.maximumHorizon !== 2000
    || JSON.stringify(value.terminalClasses) !== JSON.stringify([
      'target-first', 'invalidation-first', 'same-bar-ambiguous',
    ])
    || JSON.stringify(value.nonterminalClasses) !== JSON.stringify([
      'horizon-expired', 'incomplete-data',
    ])
    || value.mfeMaePolicy !== 'direction-aware-absolute-points-through-terminal-or-horizon'
    || value.timeToFirstTouchPolicy !== 'one-based-execution-bar-count'
    || value.sameBarPolicy !== 'never-infer-intrabar-order') {
    throw new TypeError('The R14.1 Outcome Definition differs from its accepted seed.');
  }
  return value;
}

export async function createSeedDefinitions(crypto = globalThis.crypto) {
  const setupDefinition = await withContentDigest({
    contextRole: 'context-pane',
    executionRole: 'execution-pane',
    fvgPredicate: {
      longDirection: 'bullish',
      providerId: 'validation.evidence.manual-fvg',
      providerVersion: '1.0.0',
      requiredState: 'active-accepted',
      semanticTypeId: 'imbalance.fvg',
      semanticTypeVersion: '1.0.0',
      shortDirection: 'bearish',
    },
    humanClassificationPolicy: {
      classes: ['qualified', 'rejected', 'ambiguous', 'incomplete'],
      explicitConfirmationRequired: true,
    },
    schema: VALIDATION_SCHEMAS.setupDefinition,
    setupDefinitionId: SETUP_TEMPLATE_ID,
    setupDefinitionVersion: SETUP_TEMPLATE_VERSION,
    smaPredicate: {
      definitionId: 'moving-averages.sma.close',
      definitionVersion: '1.0.0',
      length: 20,
      longComparison: 'close-above-sma',
      providerId: 'validation.evidence.sma-close',
      providerVersion: '1.0.0',
      requiredState: 'ready-visible',
      shortComparison: 'close-below-sma',
      source: 'close',
    },
    templateId: SETUP_TEMPLATE_ID,
    templateVersion: SETUP_TEMPLATE_VERSION,
    version: 1,
  }, crypto);
  const outcomeDefinition = await withContentDigest({
    horizonUnit: 'execution-bars',
    maximumHorizon: 2000,
    mfeMaePolicy: 'direction-aware-absolute-points-through-terminal-or-horizon',
    minimumHorizon: 1,
    nonterminalClasses: ['horizon-expired', 'incomplete-data'],
    outcomeDefinitionId: OUTCOME_POLICY_ID,
    outcomeDefinitionVersion: OUTCOME_POLICY_VERSION,
    policyId: OUTCOME_POLICY_ID,
    policyVersion: OUTCOME_POLICY_VERSION,
    sameBarPolicy: 'never-infer-intrabar-order',
    schema: VALIDATION_SCHEMAS.outcomeDefinition,
    terminalClasses: ['target-first', 'invalidation-first', 'same-bar-ambiguous'],
    timeToFirstTouchPolicy: 'one-based-execution-bar-count',
    version: 1,
  }, crypto);
  return Object.freeze({
    outcomeDefinition: validateOutcomeShape(outcomeDefinition),
    outcomeDefinitionRef: definitionRef(outcomeDefinition, 'outcome'),
    setupDefinition: validateSetupShape(setupDefinition),
    setupDefinitionRef: definitionRef(setupDefinition, 'setup'),
  });
}

export async function readSetupDefinition(value, crypto = globalThis.crypto) {
  validateSetupShape(value);
  return verifyContentDigest(value, crypto);
}

export async function readOutcomeDefinition(value, crypto = globalThis.crypto) {
  validateOutcomeShape(value);
  return verifyContentDigest(value, crypto);
}
