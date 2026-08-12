import {
  CONTRACT_PROFILE,
  DETERMINISM,
  LIMITS,
  OPERATION_VERSION,
} from './contract.js';
import { digestValue } from './canonical-json.js';

export function createReceipt({
  catalogs,
  compiler,
  conformance,
  content,
  diagnostics,
  manifest,
  operation,
  operationDigest,
  schemaDigest,
  sdkDigest,
  simulatorDigest,
  toolchainDigest,
}) {
  const value = {
    activated: false,
    conformance,
    content,
    contractProfile: CONTRACT_PROFILE,
    diagnosticCodes: [...new Set(diagnostics.map(({ code }) => code))].sort(),
    execution: {
      classification: operation === 'test' || operation === 'preview'
        ? 'isolated-developer-test' : operation === 'build' ? 'compiler-only' : 'never',
      determinism: DETERMINISM,
      limits: LIMITS,
      productionRuntime: false,
    },
    identities: {
      catalogs,
      compiler,
      operation: { digest: operationDigest, version: OPERATION_VERSION },
      schemas: { digest: schemaDigest, version: 1 },
      sdk: { digest: sdkDigest, version: '1.0.0' },
      simulator: { digest: simulatorDigest, version: 1 },
      toolchain: { digest: toolchainDigest, version: 1 },
    },
    installable: false,
    operation,
    operationVersion: OPERATION_VERSION,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    receiptVersion: 1,
    reviewRequirements: [],
    schemaVersion: 1,
  };
  return Object.freeze({ ...value, digest: digestValue(value) });
}

export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)
    || typeof receipt.digest !== 'string') return false;
  const fields = [
    'activated', 'conformance', 'content', 'contractProfile', 'diagnosticCodes', 'digest',
    'execution', 'identities', 'installable', 'operation', 'operationVersion', 'packageId',
    'packageVersion', 'productionExecutionAuthorized', 'publisherTrusted', 'receiptVersion',
    'reviewRequirements', 'schemaVersion',
  ];
  if (Object.keys(receipt).sort().join(',') !== fields.sort().join(',')
    || receipt.schemaVersion !== 1 || receipt.receiptVersion !== 1
    || receipt.operationVersion !== 1 || !['build', 'test', 'preview', 'pack'].includes(receipt.operation)
    || receipt.contractProfile !== 'trusted-built-in-core-v1'
    || typeof receipt.packageId !== 'string' || typeof receipt.packageVersion !== 'string'
    || !receipt.identities || typeof receipt.identities !== 'object' || Array.isArray(receipt.identities)
    || !receipt.content || typeof receipt.content !== 'object' || Array.isArray(receipt.content)
    || !receipt.conformance || typeof receipt.conformance !== 'object' || Array.isArray(receipt.conformance)
    || !receipt.execution || typeof receipt.execution !== 'object' || Array.isArray(receipt.execution)
    || !Array.isArray(receipt.diagnosticCodes) || !Array.isArray(receipt.reviewRequirements)) return false;
  const { digest, ...unsigned } = receipt;
  return digest === digestValue(unsigned)
    && receipt.installable === false
    && receipt.activated === false
    && receipt.publisherTrusted === false
    && receipt.productionExecutionAuthorized === false;
}
