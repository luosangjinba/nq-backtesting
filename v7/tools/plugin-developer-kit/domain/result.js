import {
  CONTRACT_PROFILE,
  EXIT,
  OPERATION_VERSION,
  SDK_VERSION,
} from './contract.js';
import { canonicalClone } from './canonical-json.js';

function statusFor(kind) {
  return kind === 'passed' ? 'passed' : kind === 'blocked' ? 'blocked' : 'failed';
}

export function createResult({
  artifacts = [],
  compatibilityReport,
  diagnostics = [],
  inputDigest,
  kind,
  operation,
  receipt,
  responseContract = {},
  toolchainDigest,
}) {
  const result = {
    artifacts,
    contractProfile: responseContract.contractProfile ?? CONTRACT_PROFILE,
    diagnostics,
    exitCode: EXIT[kind],
    inputDigest,
    operation,
    operationVersion: responseContract.operationVersion ?? OPERATION_VERSION,
    schemaVersion: responseContract.schemaVersion ?? 1,
    sdkVersion: SDK_VERSION,
    status: statusFor(kind),
    toolchainDigest,
  };
  if (compatibilityReport !== undefined) result.compatibilityReport = compatibilityReport;
  if (receipt !== undefined) result.receipt = receipt;
  return Object.freeze(canonicalClone(result));
}
