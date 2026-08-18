import {
  defineCalculatedSeriesContributionBinding,
  defineCalculatedSeriesDefinition,
} from '../calculated-series-contract/public.js';
import {
  calculatedSeriesProfileRef,
  createInitialContributionProfileRegistry,
} from '../contribution-profile-contract/public.js';
import {
  MOVING_AVERAGES_CONTRIBUTION_ID,
  MOVING_AVERAGES_PACKAGE_ID,
  MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST,
  MOVING_AVERAGES_PARAMETER_SCHEMA_ID,
  MOVING_AVERAGES_VERSION,
  SMA_CLOSE_DEFINITION_ID,
} from './identities.js';

const PRICE_SCALE = Object.freeze({
  schemaVersion: 1,
  dimension: Object.freeze({
    dimensionId: 'market.instrument-price', dimensionVersion: '1.0.0',
  }),
  unit: Object.freeze({ unitId: 'market.instrument-price', unitVersion: '1.0.0' }),
  transform: 'linear',
  domain: Object.freeze({ kind: 'auto' }),
  formatter: Object.freeze({
    formatterId: 'host.price',
    formatterVersion: '1.0.0',
    options: Object.freeze({ decimals: 2 }),
  }),
  zeroPolicy: 'not-required',
});

export const SMA_CLOSE_DEFINITION_WIRE = Object.freeze({
  schemaVersion: 1,
  identity: Object.freeze({
    packageId: MOVING_AVERAGES_PACKAGE_ID,
    packageVersion: MOVING_AVERAGES_VERSION,
    contributionId: MOVING_AVERAGES_CONTRIBUTION_ID,
    contributionVersion: MOVING_AVERAGES_VERSION,
    definitionId: SMA_CLOSE_DEFINITION_ID,
    definitionVersion: MOVING_AVERAGES_VERSION,
  }),
  profile: calculatedSeriesProfileRef().read(),
  parameterContract: Object.freeze({
    schemaDigest: MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST,
    schemaId: MOVING_AVERAGES_PARAMETER_SCHEMA_ID,
    schemaVersion: 1,
  }),
  executionSemantics: Object.freeze({
    deterministic: true, incrementalMode: 'none', noFuture: true,
  }),
  inputRequirement: Object.freeze({
    additionalContexts: Object.freeze([]),
    insufficientWarmup: 'whitespace',
    source: 'current-workspace-pane-bars',
    warmupBars: 499,
  }),
  plotGroups: Object.freeze([Object.freeze({
    defaultPlacement: 'main',
    displayName: 'Simple Moving Average',
    plotGroupId: 'sma-price',
    plots: Object.freeze([Object.freeze({
      displayName: 'SMA',
      kind: 'line',
      legendIntent: 'value',
      plotId: 'sma',
      style: Object.freeze({
        stroke: Object.freeze({ color: '#2962FFFF', pattern: 'solid', width: 2 }),
      }),
      visibleByDefault: true,
    })]),
    referenceLines: Object.freeze([]),
    scaleIntent: PRICE_SCALE,
  })]),
  resourceDeclaration: Object.freeze({
    maximumIncrementalStateBytes: 0,
    maximumInputBars: 20_499,
    maximumOutputBytes: 4 * 1024 * 1024,
    maximumOutputPoints: 20_000,
  }),
  migrationRefs: Object.freeze([]),
});

const PROFILE_REGISTRY = createInitialContributionProfileRegistry();

export const SMA_CLOSE_DEFINITION = defineCalculatedSeriesDefinition(
  SMA_CLOSE_DEFINITION_WIRE,
  { profileRegistry: PROFILE_REGISTRY },
);

export const MOVING_AVERAGES_CALCULATED_SERIES_BINDING =
  defineCalculatedSeriesContributionBinding({
    contributionId: MOVING_AVERAGES_CONTRIBUTION_ID,
    contributionVersion: MOVING_AVERAGES_VERSION,
    declaredKind: 'indicator',
    definitionId: SMA_CLOSE_DEFINITION_ID,
    definitionVersion: MOVING_AVERAGES_VERSION,
    packageId: MOVING_AVERAGES_PACKAGE_ID,
    packageVersion: MOVING_AVERAGES_VERSION,
    profile: calculatedSeriesProfileRef().read(),
    schemaVersion: 1,
  }, {
    definition: SMA_CLOSE_DEFINITION,
    profileRegistry: PROFILE_REGISTRY,
  });
