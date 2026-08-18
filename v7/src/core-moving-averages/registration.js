import {
  readCalculatedSeriesContributionBinding,
  readCalculatedSeriesDefinition,
} from '../calculated-series-contract/public.js';
import { readBuiltInPluginManifest } from '../plugin-contract/public.js';
import {
  MOVING_AVERAGES_DEFINITION_DIGEST,
  MOVING_AVERAGES_FORMULA_DIGEST,
  MOVING_AVERAGES_PACKAGE_DIGEST,
  TRUSTED_CALCULATED_SERIES_EXECUTOR,
} from './identities.js';
import { MOVING_AVERAGES_PLUGIN_MANIFEST } from './plugin-manifest.js';
import {
  MOVING_AVERAGES_CALCULATED_SERIES_BINDING,
  SMA_CLOSE_DEFINITION,
} from './sma-definition.js';
import { executeSmaCloseFormula } from './sma-formula.js';
import { normalizeMovingAveragesSettings } from './settings-normalizer.js';
import { failMovingAverages } from './package-error.js';

class TrustedCalculatedSeriesRegistrationValue {
  #record;
  constructor(record) { this.#record = record; Object.freeze(this); }
  read() { return this.#record; }
}

/** Create the one exact trusted registration exposed by this package generation. */
export function createMovingAveragesRegistration() {
  const manifest = readBuiltInPluginManifest(MOVING_AVERAGES_PLUGIN_MANIFEST);
  const definition = readCalculatedSeriesDefinition(SMA_CLOSE_DEFINITION);
  const binding = readCalculatedSeriesContributionBinding(
    MOVING_AVERAGES_CALCULATED_SERIES_BINDING,
  );
  return new TrustedCalculatedSeriesRegistrationValue(Object.freeze({
    binding: MOVING_AVERAGES_CALCULATED_SERIES_BINDING,
    definition: SMA_CLOSE_DEFINITION,
    definitionDigest: MOVING_AVERAGES_DEFINITION_DIGEST,
    display: Object.freeze({
      definitionName: 'Simple Moving Average',
      packageName: manifest.display.name,
      shortName: 'SMA',
    }),
    executor: TRUSTED_CALCULATED_SERIES_EXECUTOR,
    formula: executeSmaCloseFormula,
    formulaDigest: MOVING_AVERAGES_FORMULA_DIGEST,
    instanceLimitPerPane: 4,
    legendLabelFields: Object.freeze(['length']),
    manifest: MOVING_AVERAGES_PLUGIN_MANIFEST,
    normalizeSettings: normalizeMovingAveragesSettings,
    packageDigest: MOVING_AVERAGES_PACKAGE_DIGEST,
    reference: Object.freeze({ ...definition.identity, profile: definition.profile }),
    schemaVersion: 1,
    visibilityFieldId: 'visible',
  }));
}

/** Reject plain lookalikes before generic runtime registration. */
export function readTrustedCalculatedSeriesRegistration(candidate) {
  if (!(candidate instanceof TrustedCalculatedSeriesRegistrationValue)) {
    failMovingAverages(
      'MOVING_AVERAGES_REGISTRATION_REQUIRED',
      'Moving Averages requires its host-created trusted registration.',
    );
  }
  return candidate.read();
}
