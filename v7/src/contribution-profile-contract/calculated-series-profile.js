export const CALCULATED_SERIES_PROFILE_REF = Object.freeze({
  profileContractVersion: '1.0.0',
  profileId: 'analysis.calculated-series',
});

export const CALCULATED_SERIES_PROFILE_DESCRIPTOR = Object.freeze({
  compatibilityRange: '^1.0.0',
  conformanceSuiteId: 'calculated-series.pure-contract-h118',
  definitionSchemaId: 'https://replay-lab.local/schemas/calculated-series-contract-v1.json#/$defs/definition',
  inputContractIds: Object.freeze(['calculated-series.current-workspace-pane-bars-v1']),
  invalidationContract: 'calculated-series.exact-frame-invalidation-v1',
  lifecycleStatus: 'active',
  migrationContract: 'calculated-series.declarative-forward-migration-v1',
  outputContractIds: Object.freeze([
    'calculated-series.projection-frame-v1',
    'calculated-series.result-v1',
  ]),
  ownerContract: 'core.calculated-series-contract',
  permittedCapabilityRanges: Object.freeze([]),
  persistenceContract: 'calculated-series.workspace-document-v1',
  profileContractVersion: '1.0.0',
  profileId: 'analysis.calculated-series',
  provenanceContract: 'calculated-series.provenance-v1',
  resourceClassContract: 'calculated-series.resource-declaration-v1',
  schemaVersion: 1,
  truthModel: 'calculated-series.definition-result-v1',
});
