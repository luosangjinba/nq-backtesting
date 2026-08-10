import {
  AnnotationSemanticPackageError,
  defineSemanticPackage,
  defineSemanticType,
} from '../annotation-semantic-registry/public.js';

const TYPE_IDS = Object.freeze({ bsl: 'liquidity.bsl', ssl: 'liquidity.ssl' });
const VERSION = '1.0.0';
const CONTEXT_FIELDS = Object.freeze([
  'createdAtEpochMs', 'instrumentId', 'observedAtReplayCutoffEpochMs', 'sourceTimeframeId',
]);

function reject(message) {
  throw new AnnotationSemanticPackageError('SEMANTIC_CONSTRUCTION_REJECTED', message);
}

function exact(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    reject(`${label} fields are invalid.`);
  }
}

function context(value) {
  exact(value, CONTEXT_FIELDS, 'Liquidity construction context');
  if (typeof value.instrumentId !== 'string' || value.instrumentId.length === 0
    || typeof value.sourceTimeframeId !== 'string' || value.sourceTimeframeId.length === 0
    || !Number.isSafeInteger(value.createdAtEpochMs) || value.createdAtEpochMs < 0
    || !Number.isSafeInteger(value.observedAtReplayCutoffEpochMs)
    || value.observedAtReplayCutoffEpochMs < 0) {
    reject('Liquidity construction context is invalid.');
  }
  return Object.freeze({ ...value });
}

function anchor(value, expectedInstrument) {
  exact(value, ['epochMs', 'instrumentId', 'price'], 'Liquidity anchor');
  if (value.instrumentId !== expectedInstrument || !Number.isSafeInteger(value.epochMs)
    || value.epochMs < 0 || !Number.isFinite(value.price)) {
    reject('Liquidity anchor is invalid.');
  }
  return Object.freeze({
    epochMs: value.epochMs,
    instrumentId: value.instrumentId,
    price: Object.is(value.price, -0) ? 0 : value.price,
  });
}

function horizontalAnchors(values, expectedInstrument) {
  if (!Array.isArray(values) || values.length !== 2) reject('Liquidity requires two anchors.');
  const anchors = Object.freeze(values.map((value) => anchor(value, expectedInstrument)));
  if (anchors[0].epochMs === anchors[1].epochMs || anchors[0].price !== anchors[1].price) {
    reject('Liquidity requires one non-degenerate horizontal Segment.');
  }
  return anchors;
}

function presentation(value, side) {
  if (value !== null) return value;
  const strokeColor = side === 'buy' ? '#f59e0b' : '#a78bfa';
  return Object.freeze({
    fillColor: strokeColor,
    fillOpacity: 0,
    schemaVersion: 1,
    strokeColor,
    strokeWidth: 2,
  });
}

function construction(value, side) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reject('Liquidity construction input is invalid.');
  }
  let anchors;
  let sourceDrawing = null;
  let selectedPresentation;
  let selectedContext;
  if (value.mode === 'manual') {
    exact(value, ['anchors', 'context', 'mode', 'presentation'], 'Manual liquidity construction');
    selectedContext = context(value.context);
    anchors = horizontalAnchors(value.anchors, selectedContext.instrumentId);
    selectedPresentation = presentation(value.presentation, side);
  } else if (value.mode === 'drawing-promotion') {
    exact(value, ['context', 'drawing', 'mode'], 'Liquidity Drawing promotion');
    selectedContext = context(value.context);
    const drawing = value.drawing;
    if (!drawing || typeof drawing !== 'object' || drawing.status !== 'active'
      || drawing.geometry?.typeId !== 'geometry.segment'
      || drawing.geometry?.typeVersion !== '1.0.0') {
      reject('Only one active Segment Drawing can be promoted.');
    }
    anchors = horizontalAnchors(
      [drawing.geometry.payload.startAnchor, drawing.geometry.payload.endAnchor],
      selectedContext.instrumentId,
    );
    selectedPresentation = presentation(null, side);
    sourceDrawing = Object.freeze({ drawingId: drawing.drawingId, revision: drawing.revision });
  } else {
    reject('Liquidity construction mode is unsupported.');
  }
  return Object.freeze({
    attributes: Object.freeze({ levelPrice: anchors[0].price }),
    presentation: selectedPresentation,
    provenance: Object.freeze({
      constructionSource: 'manual',
      createdAtEpochMs: selectedContext.createdAtEpochMs,
      instrumentId: selectedContext.instrumentId,
      manualAnchors: anchors,
      observedAtReplayCutoffEpochMs: selectedContext.observedAtReplayCutoffEpochMs,
      promotedFromDrawingId: sourceDrawing?.drawingId ?? null,
      recognitionSource: 'human',
      sourceBars: Object.freeze([]),
      sourceTimeframeId: selectedContext.sourceTimeframeId,
    }),
    relations: Object.freeze([]),
    sourceDrawing,
  });
}

function validateArtifact(artifact, side) {
  if (!artifact || typeof artifact !== 'object'
    || artifact.typeId !== TYPE_IDS[side === 'buy' ? 'bsl' : 'ssl']
    || artifact.typeVersion !== VERSION
    || !Number.isFinite(artifact.attributes?.levelPrice)
    || !Array.isArray(artifact.provenance?.manualAnchors)
    || artifact.provenance.manualAnchors.length !== 2
    || artifact.provenance.manualAnchors.some(({ price }) => price !== artifact.attributes.levelPrice)) {
    throw new AnnotationSemanticPackageError(
      'SEMANTIC_ARTIFACT_INVALID',
      'Stored liquidity Artifact does not satisfy its active definition.',
    );
  }
  return artifact;
}

function projection(geometry, artifact, side) {
  const value = validateArtifact(artifact, side);
  const anchors = value.provenance.manualAnchors;
  const segment = geometry.createSegmentGeometry({
    endAnchor: geometry.createMarketAnchor(anchors[1]),
    startAnchor: geometry.createMarketAnchor(anchors[0]),
  });
  return Object.freeze([Object.freeze({
    entityId: value.artifactId,
    geometry: geometry.readDrawingGeometry(segment),
    observedAtReplayCutoffEpochMs: value.provenance.observedAtReplayCutoffEpochMs,
    policy: Object.freeze({ policyId: 'projection.anchor.exact-instant', version: '1.0.0' }),
    presentation: value.presentation,
    projectionId: `semantic:${value.artifactId}:level`,
    revision: value.revision,
    sourceBars: value.provenance.sourceBars,
  })]);
}

function field(id, label, value) {
  return Object.freeze({ id, label, readOnly: true, source: 'LOCKED', value });
}

function inspector(artifact, side) {
  const value = validateArtifact(artifact, side);
  return Object.freeze([
    Object.freeze({
      fields: Object.freeze([
        field('type', 'Type', side === 'buy' ? 'BSL' : 'SSL'),
        field('side', 'Side', side),
        field('levelPrice', 'Level price', value.attributes.levelPrice),
        field('recognitionSource', 'Recognition', value.provenance.recognitionSource),
        field('constructionSource', 'Construction', value.provenance.constructionSource),
      ]),
      id: 'semantic',
      label: 'Semantic',
    }),
    Object.freeze({
      fields: Object.freeze([
        field('observedAt', 'Observed Replay cutoff', value.provenance.observedAtReplayCutoffEpochMs),
        field('sourceDrawing', 'Source Drawing', value.provenance.promotedFromDrawingId ?? 'None'),
        field('typeVersion', 'Type version', value.typeVersion),
        field('artifactRevision', 'Artifact revision', value.revision),
      ]),
      id: 'history',
      label: 'History',
    }),
  ]);
}

function typeDefinition(geometry, side) {
  const typeId = side === 'buy' ? TYPE_IDS.bsl : TYPE_IDS.ssl;
  return defineSemanticType({
    construct: (value) => construction(value, side),
    displayMetadata: Object.freeze({ label: side === 'buy' ? 'Buy-side liquidity' : 'Sell-side liquidity' }),
    inspect: (artifact) => inspector(artifact, side),
    project: (artifact) => projection(geometry, artifact, side),
    typeId,
    version: VERSION,
  });
}

function requireGeometry(value) {
  if (!value || typeof value.createMarketAnchor !== 'function'
    || typeof value.createSegmentGeometry !== 'function'
    || typeof value.readDrawingGeometry !== 'function') {
    reject('Liquidity package requires the public Segment Geometry contract.');
  }
  return value;
}

/** Create the first-party human-asserted BSL/SSL trusted-build package. */
export function createLiquidityLevelSemanticPackage({ geometryContract } = {}) {
  const geometry = requireGeometry(geometryContract);
  return defineSemanticPackage({
    activate: async () => Object.freeze({ dispose: async () => {} }),
    geometryDependencies: Object.freeze(['geometry.segment']),
    hostContractVersion: '1.0.0',
    packageId: 'first-party.liquidity-level',
    packageVersion: VERSION,
    requiredCapabilities: Object.freeze(['annotation.geometry.segment']),
    semanticTypes: Object.freeze([typeDefinition(geometry, 'buy'), typeDefinition(geometry, 'sell')]),
    toolDescriptors: Object.freeze([
      Object.freeze({ id: 'promote.liquidity.bsl', label: 'Promote to BSL' }),
      Object.freeze({ id: 'promote.liquidity.ssl', label: 'Promote to SSL' }),
    ]),
  });
}

export const LIQUIDITY_LEVEL_TYPE_IDS = TYPE_IDS;
