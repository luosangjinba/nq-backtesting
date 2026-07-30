/** Stable validation failure for the Raw Coverage Lease public contract. */
export class RawCoverageLeaseContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RawCoverageLeaseContractError';
    this.code = code;
  }
}

export function failRawCoverageLeaseContract(code, message) {
  throw new RawCoverageLeaseContractError(code, message);
}
