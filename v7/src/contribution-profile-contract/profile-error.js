/** Stable public failure for malformed or unavailable Contribution Profile contracts. */
export class ContributionProfileContractError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'ContributionProfileContractError';
    this.code = code;
  }
}

/** Throw one stable Contribution Profile failure without leaking implementation errors. */
export function failContributionProfile(code, message, options = {}) {
  throw new ContributionProfileContractError(code, message, options);
}
