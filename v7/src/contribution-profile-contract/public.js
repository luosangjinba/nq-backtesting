/**
 * Owner: contribution-profile-contract.
 * Purpose: expose pinned host Contribution Profile references, descriptors, and pure resolution.
 * Inputs: closed portable Profile wires and explicit host-pinned registry authority.
 * Outputs: branded immutable Profile values, compatibility results, and canonical registry records.
 * Side effects: none; this module never reads packages, persists state, or executes contributions.
 * Lifecycle: static pure values have no activation, disposal, or registration mutation phase.
 * Errors: ContributionProfileContractError fails malformed, forged, unknown, incompatible, or retired values closed.
 * Concurrency/cancellation: all operations are synchronous, deterministic, and retain no handles.
 */
export { ContributionProfileContractError } from './profile-error.js';
export {
  contributionProfileRefsEqual,
  defineContributionProfileRef,
  readContributionProfileRef,
} from './profile-ref.js';
export {
  defineContributionProfileDescriptor,
  readContributionProfileDescriptor,
} from './profile-descriptor.js';
export {
  CALCULATED_SERIES_PROFILE_DESCRIPTOR,
  CALCULATED_SERIES_PROFILE_REF,
} from './calculated-series-profile.js';
export {
  assessContributionProfileCompatibility,
  calculatedSeriesProfileRef,
  CONTRIBUTION_PROFILE_LIMITS,
  createContributionProfileRegistry,
  createInitialContributionProfileRegistry,
  readContributionProfileRegistry,
  resolveContributionProfile,
} from './profile-registry.js';
