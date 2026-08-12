/** Portable JSON values accepted by the P1a synthetic host. */
export type PortableValue =
  | null
  | boolean
  | number
  | string
  | readonly PortableValue[]
  | { readonly [key: string]: PortableValue };

export type DeveloperKitOperationV1 =
  | 'discover'
  | 'scaffold'
  | 'validate'
  | 'build'
  | 'test'
  | 'preview'
  | 'pack'
  | 'inspect';

export interface DeveloperWorkspaceEntrypointV1 {
  readonly id: string;
  readonly kind: 'semantic-construction';
  readonly path: string;
}

export interface DeveloperWorkspaceFixtureSuiteV1 {
  readonly id: string;
  readonly path: string;
}

export interface DeveloperWorkspaceExpectedOutputV1 {
  readonly fixtureSuiteId: string;
  readonly path: string;
}

export interface DeveloperWorkspaceV1 {
  readonly schemaVersion: 1;
  readonly developerKitRange: string;
  readonly sdkRange: string;
  readonly contractProfile: 'trusted-built-in-core-v1';
  readonly manifestPath: string;
  readonly sourceRoot: string;
  readonly entrypoints: readonly DeveloperWorkspaceEntrypointV1[];
  readonly fixtureSuites: readonly DeveloperWorkspaceFixtureSuiteV1[];
  readonly expectedOutputs: readonly DeveloperWorkspaceExpectedOutputV1[];
}

export interface DeveloperKitRequestV1 {
  readonly schemaVersion: 1;
  readonly operation: DeveloperKitOperationV1;
  readonly operationVersion: 1;
  readonly workspaceRoot?: string;
  readonly outputRoot?: string;
  readonly contractProfile?: 'trusted-built-in-core-v1';
  readonly sdkVersion?: '1.0.0';
  readonly fixtureSelection?: readonly string[];
  readonly options: Readonly<Record<string, PortableValue>>;
}

export interface DeveloperDiagnosticV1 {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly phase: string;
  readonly message: string;
  readonly logicalPath?: string;
  readonly jsonPointer?: string;
  readonly related: readonly PortableValue[];
  readonly suggestedFix?: {
    readonly kind: string;
    readonly description: string;
    readonly safeToAutomate: boolean;
  };
}

export interface CompatibilityReportV1 {
  readonly schemaVersion: 1;
  readonly requested: PortableValue;
  readonly resolved: PortableValue;
  readonly contributions: PortableValue;
  readonly capabilities: PortableValue;
  readonly permissions: PortableValue;
  readonly gates: PortableValue;
  readonly review: PortableValue;
  readonly developerBundleOnly: true;
  readonly laterCandidateEligible: false;
}

export interface DeveloperKitReceiptV1 {
  readonly schemaVersion: 1;
  readonly receiptVersion: 1;
  readonly operation: DeveloperKitOperationV1;
  readonly operationVersion: 1;
  readonly packageId: string;
  readonly packageVersion: string;
  readonly contractProfile: 'trusted-built-in-core-v1';
  readonly identities: PortableValue;
  readonly content: PortableValue;
  readonly conformance: PortableValue;
  readonly execution: PortableValue;
  readonly diagnosticCodes: readonly string[];
  readonly reviewRequirements: readonly string[];
  readonly installable: false;
  readonly activated: false;
  readonly publisherTrusted: false;
  readonly productionExecutionAuthorized: false;
  readonly digest: string;
}

export interface DeveloperKitResultV1 {
  readonly schemaVersion: 1;
  readonly operation: DeveloperKitOperationV1;
  readonly operationVersion: 1;
  readonly status: 'passed' | 'failed' | 'blocked';
  readonly exitCode: 0 | 1 | 2 | 3 | 4;
  readonly contractProfile: string;
  readonly sdkVersion: string;
  readonly toolchainDigest: string;
  readonly inputDigest: string;
  readonly diagnostics: readonly DeveloperDiagnosticV1[];
  readonly artifacts: readonly PortableValue[];
  readonly compatibilityReport?: CompatibilityReportV1;
  readonly receipt?: DeveloperKitReceiptV1;
}

/** One immutable confirmed source Bar supplied by a fixture. */
export interface EvidenceBarV1 {
  readonly startEpochMs: number;
  readonly endEpochMs: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number | null;
}

/** Exact evidence made available to a stateless semantic constructor. */
export interface SemanticEvidenceV1 {
  readonly selectedBarStartEpochMs: number;
  readonly bars: readonly EvidenceBarV1[];
}

/** Immutable synthetic-host input; it carries no owner or acquisition handle. */
export interface SemanticConstructionInputV1 {
  readonly schemaVersion: 1;
  readonly session: { readonly id: string };
  readonly workspace: { readonly revision: number };
  readonly pane: {
    readonly id: string;
    readonly instrumentId: string;
    readonly displayTimeframeId: string;
    readonly sourceResolution: string;
    readonly datasetRevision: string;
  };
  readonly replay: { readonly cutoffEpochMs: number };
  readonly evidence: SemanticEvidenceV1;
  readonly settings: Readonly<Record<string, PortableValue>>;
}

/** Vendor-neutral host projection emitted by the initial fixture ABI. */
export type SemanticProjectionV1 =
  | {
      readonly kind: 'rectangle';
      readonly fromEpochMs: number;
      readonly toEpochMs: number;
      readonly lowerPrice: number;
      readonly upperPrice: number;
      readonly label: string;
    }
  | {
      readonly kind: 'segment';
      readonly fromEpochMs: number;
      readonly toEpochMs: number;
      readonly price: number;
    };

/** Portable output accepted by the P1a synthetic host. */
export interface SemanticConstructionOutputV1 {
  readonly schemaVersion: 1;
  readonly artifact: {
    readonly typeId: string;
    readonly definitionId: string;
    readonly direction: string;
    readonly lowerPrice: number;
    readonly upperPrice: number;
    readonly midpointPrice: number;
    readonly observedAtReplayCutoffEpochMs: number;
    readonly source: {
      readonly sessionId: string;
      readonly workspaceRevision: number;
      readonly paneId: string;
      readonly instrumentId: string;
      readonly displayTimeframeId: string;
      readonly sourceResolution: string;
      readonly datasetRevision: string;
      readonly selectedBarStartEpochMs: number;
      readonly barStartsEpochMs: readonly number[];
    };
  };
  readonly projections: readonly SemanticProjectionV1[];
}

/** Initial profile ABI proven by the trusted FVG reference. */
export interface SemanticConstructionDefinitionV1 {
  readonly schemaVersion: 1;
  readonly kind: 'semantic-construction';
  readonly packageId: string;
  readonly contributionId: string;
  readonly executionModel: 'stateless-evidence-construction';
  readonly run: (input: SemanticConstructionInputV1) => SemanticConstructionOutputV1;
}

/**
 * Defines a stateless developer-test contribution without granting installation,
 * production execution, owner access, or lifecycle authority.
 */
export function defineSemanticConstruction(
  definition: SemanticConstructionDefinitionV1,
): SemanticConstructionDefinitionV1;
