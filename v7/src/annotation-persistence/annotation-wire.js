import {
  deserializeSessionId,
  serializeSessionId,
  sessionIdsEqual,
} from '../session-identity/public.js';
import { migrateAnnotationDocument } from './annotation-document-migration.js';
import { failAnnotationPersistence } from './annotation-persistence-error.js';

const ENTRY_SCHEMA = 'v7.annotation-repository-entry';
const ENTRY_VERSION = 2;
const EXPORT_SCHEMA = 'v7.annotation-document-export';
const EXPORT_VERSION = 1;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
const DOCUMENT_FIELDS = Object.freeze(['artifacts', 'drawings', 'revision', 'schemaVersion', 'sessionId']);
const DRAWING_FIELDS = Object.freeze([
  'drawingId', 'geometry', 'presentation', 'provenance', 'revision', 'scope', 'status',
]);
const ARTIFACT_FIELDS = Object.freeze([
  'artifactId', 'attributes', 'definition', 'presentation', 'provenance', 'relations',
  'revision', 'scope', 'status', 'typeId', 'typeVersion',
]);
const ARTIFACT_DEFINITION_FIELDS = Object.freeze([
  'definitionId', 'definitionVersion', 'packageId', 'packageVersion', 'status',
]);
const GEOMETRY_FIELDS = Object.freeze(['payload', 'schemaVersion', 'typeId', 'typeVersion']);
const PRESENTATION_FIELDS = Object.freeze([
  'fillColor', 'fillOpacity', 'schemaVersion', 'strokeColor', 'strokeWidth',
]);
const PROVENANCE_FIELDS = Object.freeze([
  'createdAtEpochMs', 'observedAtReplayCutoffEpochMs', 'origin',
]);
const ARTIFACT_PROVENANCE_FIELDS = Object.freeze([
  'constructionSource', 'createdAtEpochMs', 'instrumentId', 'manualAnchors',
  'observedAtReplayCutoffEpochMs', 'packageProvenance', 'promotedFromDrawingId',
  'recognitionSource', 'sourceBars', 'sourceTimeframeId',
]);
const SCOPE_FIELDS = Object.freeze(['kind', 'sessionId']);

class AnnotationOpaqueStateValue {
  #tree;

  constructor(tree) {
    this.#tree = deepFreeze(tree);
    Object.freeze(this);
  }

  read() { return this.#tree; }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function parseJson(source, code) {
  if (typeof source !== 'string' || source.length === 0 || source.length > MAX_PAYLOAD_BYTES) {
    failAnnotationPersistence(code, 'Annotation JSON payload size is invalid.');
  }
  try { return JSON.parse(source); } catch (cause) {
    failAnnotationPersistence(code, 'Annotation JSON payload is malformed.', { cause });
  }
}

function portableClone(value, code) {
  let source;
  try { source = JSON.stringify(value); } catch (cause) {
    failAnnotationPersistence(code, 'Annotation value is not JSON-compatible.', { cause });
  }
  if (source === undefined) {
    failAnnotationPersistence(code, 'Annotation value is not JSON-compatible.');
  }
  return parseJson(source, code);
}

function exactRecord(value, fields, code, label) {
  if (!isRecord(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failAnnotationPersistence(code, `${label} fields are invalid.`);
  }
}

function splitKnown(value, fields, code, label) {
  if (!isRecord(value)) failAnnotationPersistence(code, `${label} must be a record.`);
  const known = {};
  const opaque = {};
  for (const [key, entry] of Object.entries(value)) {
    if (fields.includes(key)) known[key] = entry;
    else opaque[key] = entry;
  }
  for (const field of fields) {
    if (!Object.hasOwn(known, field)) {
      failAnnotationPersistence(code, `${label} is missing ${field}.`);
    }
  }
  return { known, opaque };
}

function splitDrawing(value, index) {
  const drawing = splitKnown(
    value,
    DRAWING_FIELDS,
    'ANNOTATION_PERSISTENCE_DRAWING_INVALID',
    'Stored Drawing',
  );
  const geometry = splitKnown(
    drawing.known.geometry,
    GEOMETRY_FIELDS,
    'ANNOTATION_PERSISTENCE_GEOMETRY_INVALID',
    'Stored Geometry',
  );
  const provenance = splitKnown(
    drawing.known.provenance,
    PROVENANCE_FIELDS,
    'ANNOTATION_PERSISTENCE_PROVENANCE_INVALID',
    'Stored provenance',
  );
  const scope = splitKnown(
    drawing.known.scope,
    SCOPE_FIELDS,
    'ANNOTATION_PERSISTENCE_SCOPE_INVALID',
    'Stored scope',
  );
  let presentation = { known: null, opaque: {} };
  if (drawing.known.presentation !== null) {
    presentation = splitKnown(
      drawing.known.presentation,
      PRESENTATION_FIELDS,
      'ANNOTATION_PERSISTENCE_PRESENTATION_INVALID',
      'Stored Presentation',
    );
  }
  const id = typeof drawing.known.drawingId === 'string'
    ? drawing.known.drawingId : `@invalid-${index}`;
  return {
    drawing: {
      ...drawing.known,
      geometry: geometry.known,
      presentation: presentation.known,
      provenance: provenance.known,
      scope: scope.known,
    },
    id,
    opaque: {
      drawing: drawing.opaque,
      geometry: geometry.opaque,
      presentation: presentation.opaque,
      provenance: provenance.opaque,
      scope: scope.opaque,
    },
  };
}

function splitArtifact(value, index) {
  const artifact = splitKnown(
    value,
    ARTIFACT_FIELDS,
    'ANNOTATION_PERSISTENCE_ARTIFACT_INVALID',
    'Stored Semantic Artifact',
  );
  const definition = splitKnown(
    artifact.known.definition,
    ARTIFACT_DEFINITION_FIELDS,
    'ANNOTATION_PERSISTENCE_ARTIFACT_DEFINITION_INVALID',
    'Stored Artifact definition',
  );
  const provenance = splitKnown(
    artifact.known.provenance,
    ARTIFACT_PROVENANCE_FIELDS,
    'ANNOTATION_PERSISTENCE_ARTIFACT_PROVENANCE_INVALID',
    'Stored Artifact provenance',
  );
  const scope = splitKnown(
    artifact.known.scope,
    SCOPE_FIELDS,
    'ANNOTATION_PERSISTENCE_ARTIFACT_SCOPE_INVALID',
    'Stored Artifact scope',
  );
  let presentation = { known: null, opaque: {} };
  if (artifact.known.presentation !== null) {
    presentation = splitKnown(
      artifact.known.presentation,
      PRESENTATION_FIELDS,
      'ANNOTATION_PERSISTENCE_ARTIFACT_PRESENTATION_INVALID',
      'Stored Artifact Presentation',
    );
  }
  const id = typeof artifact.known.artifactId === 'string'
    ? artifact.known.artifactId : `@invalid-${index}`;
  return {
    artifact: {
      ...artifact.known,
      definition: definition.known,
      presentation: presentation.known,
      provenance: provenance.known,
      scope: scope.known,
    },
    id,
    opaque: {
      artifact: artifact.opaque,
      definition: definition.opaque,
      presentation: presentation.opaque,
      provenance: provenance.opaque,
      scope: scope.opaque,
    },
  };
}

function emptyOpaqueTree() {
  return { artifacts: {}, document: {}, drawings: {} };
}

/** Strip unknown envelope fields and retain them in one branded sidecar. */
export function splitAnnotationDocument(value) {
  const migrated = migrateAnnotationDocument(value);
  const document = splitKnown(
    migrated,
    DOCUMENT_FIELDS,
    'ANNOTATION_PERSISTENCE_DOCUMENT_INVALID',
    'Stored Annotation document',
  );
  if (!Array.isArray(document.known.drawings)) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_DOCUMENT_INVALID', 'Stored drawings must be an array.');
  }
  if (!Array.isArray(document.known.artifacts)) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_DOCUMENT_INVALID', 'Stored artifacts must be an array.');
  }
  const drawings = document.known.drawings.map(splitDrawing);
  const artifacts = document.known.artifacts.map(splitArtifact);
  const opaqueDrawings = {};
  for (const drawing of drawings) opaqueDrawings[drawing.id] = drawing.opaque;
  const opaqueArtifacts = {};
  for (const artifact of artifacts) opaqueArtifacts[artifact.id] = artifact.opaque;
  return Object.freeze({
    document: deepFreeze({
      ...document.known,
      artifacts: artifacts.map((artifact) => artifact.artifact),
      drawings: drawings.map((drawing) => drawing.drawing),
    }),
    opaqueState: new AnnotationOpaqueStateValue({
      artifacts: opaqueArtifacts,
      document: document.opaque,
      drawings: opaqueDrawings,
    }),
  });
}

function readOpaqueState(candidate) {
  return candidate instanceof AnnotationOpaqueStateValue
    ? candidate.read() : emptyOpaqueTree();
}

function mergeDrawing(drawing, opaque) {
  const value = opaque ?? {};
  return {
    ...(value.drawing ?? {}),
    ...drawing,
    geometry: { ...(value.geometry ?? {}), ...drawing.geometry },
    presentation: drawing.presentation === null ? null : {
      ...(value.presentation ?? {}), ...drawing.presentation,
    },
    provenance: { ...(value.provenance ?? {}), ...drawing.provenance },
    scope: { ...(value.scope ?? {}), ...drawing.scope },
  };
}

function mergeArtifact(artifact, opaque) {
  const value = opaque ?? {};
  return {
    ...(value.artifact ?? {}),
    ...artifact,
    definition: { ...(value.definition ?? {}), ...artifact.definition },
    presentation: artifact.presentation === null ? null : {
      ...(value.presentation ?? {}), ...artifact.presentation,
    },
    provenance: { ...(value.provenance ?? {}), ...artifact.provenance },
    scope: { ...(value.scope ?? {}), ...artifact.scope },
  };
}

/** Merge one canonical document with only its adapter-owned opaque sidecar. */
export function mergeAnnotationDocument(document, opaqueState) {
  const opaque = readOpaqueState(opaqueState);
  return {
    ...opaque.document,
    ...document,
    artifacts: document.artifacts.map((artifact) => (
      mergeArtifact(artifact, opaque.artifacts?.[artifact.artifactId])
    )),
    drawings: document.drawings.map((drawing) => (
      mergeDrawing(drawing, opaque.drawings[drawing.drawingId])
    )),
  };
}

/** Filter a sidecar to one candidate document and return a fresh branded token. */
export function projectAnnotationOpaqueState(candidate, document) {
  const opaque = readOpaqueState(candidate);
  const artifacts = {};
  for (const artifact of document.artifacts) {
    if (Object.hasOwn(opaque.artifacts ?? {}, artifact.artifactId)) {
      artifacts[artifact.artifactId] = opaque.artifacts[artifact.artifactId];
    }
  }
  const drawings = {};
  for (const drawing of document.drawings) {
    if (Object.hasOwn(opaque.drawings, drawing.drawingId)) {
      drawings[drawing.drawingId] = opaque.drawings[drawing.drawingId];
    }
  }
  return new AnnotationOpaqueStateValue({ artifacts, document: opaque.document, drawings });
}

function requireSession(serialized, sessionId, code) {
  let restored;
  try { restored = deserializeSessionId(serialized); } catch (cause) {
    failAnnotationPersistence(code, 'Persisted Annotation Session id is invalid.', { cause });
  }
  if (!sessionIdsEqual(restored, sessionId)) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_SESSION_MISMATCH', 'Annotation bytes belong to another Session.');
  }
}

function splitHistory(history) {
  exactRecord(
    history,
    ['redo', 'undo'],
    'ANNOTATION_PERSISTENCE_HISTORY_INVALID',
    'Stored Annotation history',
  );
  if (!Array.isArray(history.undo) || !Array.isArray(history.redo)
    || history.undo.length > 100 || history.redo.length > 100) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_HISTORY_INVALID', 'Stored history is invalid.');
  }
  const split = (documents) => documents.map((document) => splitAnnotationDocument(document));
  return { redo: split(history.redo), undo: split(history.undo) };
}

function migrateEntry(value) {
  if (value?.schema !== ENTRY_SCHEMA) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_SCHEMA_UNSUPPORTED', 'Annotation entry schema is unsupported.');
  }
  if (value.version === 1) {
    exactRecord(
      value,
      ['document', 'schema', 'sessionId', 'version'],
      'ANNOTATION_PERSISTENCE_ENTRY_INVALID',
      'Version 1 Annotation entry',
    );
    return {
      document: value.document,
      history: { redo: [], undo: [] },
      schema: ENTRY_SCHEMA,
      sessionId: value.sessionId,
      version: ENTRY_VERSION,
    };
  }
  if (value.version !== ENTRY_VERSION) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_VERSION_UNSUPPORTED', 'Annotation entry version is unsupported.');
  }
  return value;
}

/** Decode and migrate one exact durable entry without publishing it. */
export function decodeAnnotationEntry(source, sessionId) {
  const value = migrateEntry(parseJson(source, 'ANNOTATION_PERSISTENCE_JSON_INVALID'));
  exactRecord(
    value,
    ['document', 'history', 'schema', 'sessionId', 'version'],
    'ANNOTATION_PERSISTENCE_ENTRY_INVALID',
    'Annotation entry',
  );
  requireSession(value.sessionId, sessionId, 'ANNOTATION_PERSISTENCE_ENTRY_INVALID');
  const current = splitAnnotationDocument(value.document);
  const history = splitHistory(value.history);
  const entry = (item) => Object.freeze({ document: item.document, opaqueState: item.opaqueState });
  return Object.freeze({
    document: current.document,
    history: Object.freeze({
      redo: Object.freeze(history.redo.map(entry)),
      undo: Object.freeze(history.undo.map(entry)),
    }),
    opaqueState: current.opaqueState,
  });
}

/** Encode one current durable entry including bounded history. */
export function encodeAnnotationEntry({ document, history, opaqueState, sessionId }) {
  const merge = (entry) => mergeAnnotationDocument(entry.document, entry.opaqueState);
  return JSON.stringify({
    document: mergeAnnotationDocument(document, opaqueState),
    history: { redo: history.redo.map(merge), undo: history.undo.map(merge) },
    schema: ENTRY_SCHEMA,
    sessionId: serializeSessionId(sessionId),
    version: ENTRY_VERSION,
  });
}

/** Decode one portable document export and retain its opaque fields. */
export function decodeAnnotationExport(payload, sessionId) {
  const value = typeof payload === 'string'
    ? parseJson(payload, 'ANNOTATION_EXPORT_JSON_INVALID')
    : portableClone(payload, 'ANNOTATION_EXPORT_JSON_INVALID');
  exactRecord(
    value,
    ['document', 'schema', 'version'],
    'ANNOTATION_EXPORT_ENVELOPE_INVALID',
    'Annotation export',
  );
  if (value.schema !== EXPORT_SCHEMA || value.version !== EXPORT_VERSION) {
    failAnnotationPersistence('ANNOTATION_EXPORT_VERSION_UNSUPPORTED', 'Annotation export version is unsupported.');
  }
  const result = splitAnnotationDocument(value.document);
  if (result.document.sessionId !== serializeSessionId(sessionId).value) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_SESSION_MISMATCH', 'Annotation export belongs to another Session.');
  }
  return result;
}

/** Encode one portable document export with opaque envelope fields restored. */
export function encodeAnnotationExport({ document, opaqueState }) {
  return JSON.stringify({
    document: mergeAnnotationDocument(document, opaqueState),
    schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
  });
}
