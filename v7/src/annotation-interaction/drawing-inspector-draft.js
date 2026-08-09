import { failInteraction } from './interaction-error.js';

export const SELECT_FIELDS = Object.freeze(['drawingId', 'projectionId']);
export const PATCH_FIELDS = Object.freeze(['expectedDraftRevision', 'field', 'value']);

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STYLE_FIELDS = new Set(['fillColor', 'fillOpacity', 'strokeColor', 'strokeWidth']);
const GEOMETRY_FIELDS = Object.freeze({
  'geometry.rectangle': new Set(['endEpochMs', 'highPrice', 'lowPrice', 'startEpochMs']),
  'geometry.segment': new Set(['endEpochMs', 'endPrice', 'startEpochMs', 'startPrice']),
});

export function requireExactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failInteraction(code, `${label} fields must be exact.`);
  }
}

export function requireDrawingPort(candidate) {
  for (const method of ['readDrawing', 'reviseDrawing']) {
    if (typeof candidate?.[method] !== 'function') {
      failInteraction('ANNOTATION_INSPECTOR_DRAWING_PORT_INVALID', `Drawing port requires ${method}().`);
    }
  }
  return candidate;
}

export function requirePresentationContract(candidate) {
  for (const method of [
    'createDefaultDrawingPresentation', 'createDrawingPresentation', 'readDrawingPresentation',
  ]) {
    if (typeof candidate?.[method] !== 'function') {
      failInteraction(
        'ANNOTATION_INSPECTOR_PRESENTATION_PORT_INVALID',
        `Presentation contract requires ${method}().`,
      );
    }
  }
  return candidate;
}

export function requireOpaqueId(value, code, label) {
  if (typeof value !== 'string' || !ID.test(value)) {
    failInteraction(code, `${label} must be one opaque token.`);
  }
  return value;
}

export function requireDrawingRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Number.isSafeInteger(value.documentRevision) || value.documentRevision < 0
    || !value.drawing || typeof value.drawing !== 'object') {
    failInteraction('ANNOTATION_INSPECTOR_DRAWING_RESULT_INVALID', 'Drawing query returned invalid state.');
  }
  const drawing = value.drawing;
  if (!Number.isSafeInteger(drawing.revision) || drawing.revision < 1
    || drawing.status !== 'active' || !GEOMETRY_FIELDS[drawing.geometry?.typeId]) {
    failInteraction('ANNOTATION_INSPECTOR_DRAWING_UNSUPPORTED', 'Inspector requires one active Segment or Rectangle.');
  }
  return value;
}

export function controlsForDrawing(drawing, presentation) {
  const geometry = drawing.geometry;
  if (geometry.typeId === 'geometry.segment') {
    return Object.freeze({
      endEpochMs: geometry.payload.endAnchor.epochMs,
      endPrice: geometry.payload.endAnchor.price,
      geometryTypeId: geometry.typeId,
      startEpochMs: geometry.payload.startAnchor.epochMs,
      startPrice: geometry.payload.startAnchor.price,
      strokeColor: presentation.strokeColor,
      strokeWidth: presentation.strokeWidth,
    });
  }
  return Object.freeze({
    endEpochMs: geometry.payload.endEpochMs,
    fillColor: presentation.fillColor,
    fillOpacity: presentation.fillOpacity,
    geometryTypeId: geometry.typeId,
    highPrice: geometry.payload.highPrice,
    lowPrice: geometry.payload.lowPrice,
    startEpochMs: geometry.payload.startEpochMs,
    strokeColor: presentation.strokeColor,
    strokeWidth: presentation.strokeWidth,
  });
}

export function geometryForControls(controls, drawing, geometry) {
  const instrumentId = drawing.geometry.payload.instrumentId
    ?? drawing.geometry.payload.startAnchor.instrumentId;
  if (controls.geometryTypeId === 'geometry.segment') {
    return geometry.createSegmentGeometry({
      endAnchor: geometry.createMarketAnchor({
        epochMs: controls.endEpochMs,
        instrumentId,
        price: controls.endPrice,
      }),
      startAnchor: geometry.createMarketAnchor({
        epochMs: controls.startEpochMs,
        instrumentId,
        price: controls.startPrice,
      }),
    });
  }
  return geometry.createRectangleGeometry({
    firstAnchor: geometry.createMarketAnchor({
      epochMs: controls.startEpochMs,
      instrumentId,
      price: controls.lowPrice,
    }),
    secondAnchor: geometry.createMarketAnchor({
      epochMs: controls.endEpochMs,
      instrumentId,
      price: controls.highPrice,
    }),
  });
}

export function presentationForControls(controls, current, presentations) {
  const base = presentations.readDrawingPresentation(current);
  return presentations.createDrawingPresentation({
    fillColor: controls.fillColor ?? base.fillColor,
    fillOpacity: controls.fillOpacity ?? base.fillOpacity,
    schemaVersion: 1,
    strokeColor: controls.strokeColor,
    strokeWidth: controls.strokeWidth,
  });
}

export function requireSupportedField(geometryTypeId, field) {
  const geometryFields = GEOMETRY_FIELDS[geometryTypeId];
  if (!geometryFields.has(field) && !STYLE_FIELDS.has(field)) {
    failInteraction('ANNOTATION_INSPECTOR_FIELD_UNSUPPORTED', 'Inspector field is unsupported.');
  }
  if (geometryTypeId === 'geometry.segment' && ['fillColor', 'fillOpacity'].includes(field)) {
    failInteraction('ANNOTATION_INSPECTOR_FIELD_UNSUPPORTED', 'Segment has no fill controls.');
  }
}
