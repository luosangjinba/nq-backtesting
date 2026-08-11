import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';
import { readFairValueGapArtifact } from './fvg-artifact.js';

const CONTAINING_BUCKET_POLICY = Object.freeze({
  policyId: 'projection.anchor.accepted-containing-bucket',
  version: '1.0.0',
});

export function requireFvgGeometryContract(value) {
  for (const method of [
    'createMarketAnchor', 'createRectangleGeometry', 'createSegmentGeometry', 'readDrawingGeometry',
  ]) {
    if (typeof value?.[method] !== 'function') {
      throw new AnnotationSemanticPackageError(
        'SEMANTIC_CONSTRUCTION_REJECTED',
        `FVG package requires Geometry contract ${method}().`,
      );
    }
  }
  return value;
}

function presentation(direction, { label = false, midpoint = false } = {}) {
  const bullish = direction === 'bullish';
  const strokeColor = bullish ? '#10b981' : '#f43f5e';
  const value = {
    fillColor: strokeColor,
    fillOpacity: midpoint ? 0 : 0.18,
    schemaVersion: 1,
    strokeColor,
    strokeWidth: midpoint ? 1 : 2,
  };
  if (label) {
    value.label = Object.freeze({
      color: bullish ? '#a7f3d0' : '#fecdd3',
      fontSize: 11,
      text: bullish ? 'Bullish FVG' : 'Bearish FVG',
      visible: true,
    });
  }
  return Object.freeze(value);
}

function projectionInput({ artifact, geometry, geometryValue, id, presentationValue, sourceBars }) {
  return Object.freeze({
    entityId: artifact.artifactId,
    geometry: geometry.readDrawingGeometry(geometryValue),
    observedAtReplayCutoffEpochMs: artifact.provenance.observedAtReplayCutoffEpochMs,
    policy: CONTAINING_BUCKET_POLICY,
    presentation: presentationValue,
    projectionId: `semantic:${artifact.artifactId}:${id}`,
    revision: artifact.revision,
    sourceBars,
  });
}

/** Derive generic Rectangle and midpoint subjects from one exact FVG Artifact. */
export function projectFairValueGapArtifact(geometryContract, artifactCandidate) {
  const geometry = requireFvgGeometryContract(geometryContract);
  const { artifact, effectiveState, formation, packageEvidence, sourceBars } = readFairValueGapArtifact(
    artifactCandidate,
  );
  const startEpochMs = packageEvidence.bars[0].reference.startEpochMs;
  const endEpochMs = packageEvidence.bars[2].reference.startEpochMs;
  const instrumentId = artifact.provenance.instrumentId;
  const anchor = (epochMs, price) => geometry.createMarketAnchor({ epochMs, instrumentId, price });
  const zone = geometry.createRectangleGeometry({
    firstAnchor: anchor(startEpochMs, effectiveState.lowerPrice),
    secondAnchor: anchor(endEpochMs, effectiveState.upperPrice),
  });
  const midpoint = geometry.createSegmentGeometry({
    endAnchor: anchor(endEpochMs, effectiveState.midpointPrice),
    startAnchor: anchor(startEpochMs, effectiveState.midpointPrice),
  });
  return Object.freeze([
    projectionInput({
      artifact,
      geometry,
      geometryValue: zone,
      id: 'fvg-zone',
      presentationValue: presentation(formation.direction, { label: true }),
      sourceBars,
    }),
    projectionInput({
      artifact,
      geometry,
      geometryValue: midpoint,
      id: 'fvg-midpoint',
      presentationValue: presentation(formation.direction, { midpoint: true }),
      sourceBars,
    }),
  ]);
}
