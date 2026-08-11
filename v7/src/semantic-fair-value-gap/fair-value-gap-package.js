import {
  AnnotationSemanticPackageError,
  defineSemanticPackage,
  defineSemanticType,
} from '../annotation-semantic-registry/public.js';
import { readFvgConstructionEvidence, fvgSourceBarReferences } from './fvg-evidence.js';
import {
  FAIR_VALUE_GAP_PROFILE,
  FAIR_VALUE_GAP_TYPE_ID,
  FAIR_VALUE_GAP_VERSION,
  readFairValueGapArtifact,
} from './fvg-artifact.js';
import { deriveStrictFvgFormation } from './fvg-formation.js';
import { inspectFairValueGapArtifact } from './fvg-inspector.js';
import { reviseFvgOverride } from './fvg-override.js';
import {
  projectFairValueGapArtifact,
  requireFvgGeometryContract,
} from './fvg-projection.js';

export const FAIR_VALUE_GAP_PACKAGE_ID = 'first-party.fair-value-gap';

function requireEvidenceContract(value) {
  if (typeof value?.readAnnotationEvidenceBundle !== 'function') {
    throw new AnnotationSemanticPackageError(
      'SEMANTIC_CONSTRUCTION_REJECTED',
      'FVG package requires the public Evidence Bundle reader.',
    );
  }
  return value;
}

function defaultPresentation(direction) {
  const color = direction === 'bullish' ? '#10b981' : '#f43f5e';
  return Object.freeze({
    fillColor: color,
    fillOpacity: 0.18,
    schemaVersion: 1,
    strokeColor: color,
    strokeWidth: 2,
  });
}

function construction(evidenceContract, value) {
  const evidence = readFvgConstructionEvidence(value, evidenceContract);
  const formation = deriveStrictFvgFormation(evidence.bars);
  const firstReference = evidence.bars[0].reference;
  return Object.freeze({
    attributes: formation.attributes,
    presentation: defaultPresentation(formation.direction),
    provenance: Object.freeze({
      constructionSource: 'derived',
      createdAtEpochMs: evidence.createdAtEpochMs,
      instrumentId: firstReference.instrumentId,
      manualAnchors: Object.freeze([]),
      observedAtReplayCutoffEpochMs: evidence.bundle.replayCutoffEpochMs,
      packageProvenance: Object.freeze({
        acceptedWorkspaceRevision: evidence.bundle.acceptedWorkspaceRevision,
        bars: evidence.bars,
        paneId: evidence.bundle.paneId,
        profile: FAIR_VALUE_GAP_PROFILE,
        selectedBarStartEpochMs: evidence.bars[1].reference.startEpochMs,
        session: evidence.session,
      }),
      promotedFromDrawingId: null,
      recognitionSource: 'human',
      sourceBars: fvgSourceBarReferences(evidence.bars),
      sourceTimeframeId: firstReference.sourceTimeframeId,
    }),
    relations: Object.freeze([]),
    sourceDrawing: null,
  });
}

function typeDefinition(geometryContract, evidenceContract) {
  return defineSemanticType({
    construct: (value) => construction(evidenceContract, value),
    definitionId: FAIR_VALUE_GAP_PROFILE.profileId,
    definitionVersion: FAIR_VALUE_GAP_PROFILE.profileVersion,
    displayMetadata: Object.freeze({ label: 'Fair Value Gap' }),
    inspect: (artifact, context) => inspectFairValueGapArtifact(artifact, context),
    project: (artifact) => projectFairValueGapArtifact(geometryContract, artifact),
    revise: (artifact, revision) => {
      const { formation } = readFairValueGapArtifact(artifact);
      return Object.freeze({
        attributes: reviseFvgOverride(artifact, formation, revision),
        presentation: artifact.presentation,
        relations: artifact.relations,
      });
    },
    typeId: FAIR_VALUE_GAP_TYPE_ID,
    version: FAIR_VALUE_GAP_VERSION,
  });
}

/** Create the first evidence-derived trusted-build FVG Semantic package. */
export function createFairValueGapSemanticPackage({ evidenceContract, geometryContract } = {}) {
  const evidence = requireEvidenceContract(evidenceContract);
  const geometry = requireFvgGeometryContract(geometryContract);
  return defineSemanticPackage({
    activate: async () => Object.freeze({ dispose: async () => {} }),
    geometryDependencies: Object.freeze(['geometry.rectangle', 'geometry.segment']),
    hostContractVersion: '1.0.0',
    packageId: FAIR_VALUE_GAP_PACKAGE_ID,
    packageVersion: FAIR_VALUE_GAP_VERSION,
    requiredCapabilities: Object.freeze([
      'annotation.evidence.bundle',
      'annotation.geometry.rectangle',
      'annotation.geometry.segment',
    ]),
    semanticTypes: Object.freeze([typeDefinition(geometry, evidence)]),
    toolDescriptors: Object.freeze([
      Object.freeze({ id: 'construct.imbalance.fvg', label: 'FVG from selected Bar' }),
    ]),
  });
}
