export const MOVING_AVERAGES_VERSION = '1.0.0';
export const MOVING_AVERAGES_PACKAGE_ID = 'first-party.moving-averages';
export const MOVING_AVERAGES_MODULE_ID = 'optional.core-moving-averages';
export const MOVING_AVERAGES_CONTRIBUTION_ID = 'indicator.moving-averages';
export const SMA_CLOSE_DEFINITION_ID = 'moving-averages.sma.close';
export const TRUSTED_CALCULATED_SERIES_EXECUTOR = Object.freeze({
  executorId: 'host.trusted-calculated-series',
  executorVersion: MOVING_AVERAGES_VERSION,
});

export const MOVING_AVERAGES_PARAMETER_SCHEMA_ID =
  'https://replay-lab.local/schemas/moving-averages-sma-close-parameters-v1.json';

// These identities are deliberately pinned package evidence. H120 compares the
// values to the exact committed definition/formula fixtures; runtime code never
// invents a digest from display metadata.
export const MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST =
  'sha256:37c628f955cf9881596a6f7e5dc4639d981b1080a79e962b7fe55aa5b442f783';
export const MOVING_AVERAGES_DEFINITION_DIGEST =
  'sha256:f735a6054f4695a995e6ed31ade3ce5af700712840e6c6e3763719e1211aeee9';
export const MOVING_AVERAGES_FORMULA_DIGEST =
  'sha256:85a2459cb56033500358416673ca4f02cb8e3be06bc215004b07cdd413d1b0e0';
export const MOVING_AVERAGES_PACKAGE_DIGEST =
  'sha256:db562b59fd526d057861237e40a18044f6561834dd48b5e8990561734556bbe4';
