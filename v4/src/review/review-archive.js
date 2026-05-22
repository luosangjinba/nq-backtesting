// JSON archive import/export for complete manual review state.

import * as bus from '../event-bus.js';
import { timeframeToString } from '../config.js';
import * as store from '../data/bar-store.js';
import {
  DEFAULT_INSTRUMENT,
  formatDateForFile,
  getArchiveRange,
  getExportableAnnotations,
  getImportableAnnotations,
  readFileAsText,
} from '../pda/pda-archive.js';
import { getAnnotationIdentity, getAnnotations, loadAnnotations } from '../pda/pda-store.js';
import { getSegmentIdentity, getSegments, loadSegments } from '../segment/segment-store.js';

const REVIEW_ARCHIVE_VERSION = 1;
const REVIEW_ARCHIVE_APP = 'trading-v4-review';
const DISPLAY_MODES = new Set(['highlight', 'normal', 'hidden']);

function getExportableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function buildReviewPayload() {
  return {
    app: REVIEW_ARCHIVE_APP,
    version: REVIEW_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    instrument: DEFAULT_INSTRUMENT,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    range: getArchiveRange(),
    pdaAnnotations: getExportableAnnotations(),
    marketSegments: getExportableSegments(),
  };
}

function downloadReviewJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `v4-review-${payload.instrument}-${payload.timeframe}-${formatDateForFile()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateReviewPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('review archive payload must be an object');
  }
  if (payload.app !== REVIEW_ARCHIVE_APP) {
    throw new Error(`unsupported review archive app: ${payload.app || 'unknown'}`);
  }
  if (payload.version !== REVIEW_ARCHIVE_VERSION) {
    throw new Error(`unsupported review archive version: ${payload.version || 'unknown'}`);
  }
  if (!Array.isArray(payload.pdaAnnotations)) {
    throw new Error('review archive pdaAnnotations must be an array');
  }
  if (!Array.isArray(payload.marketSegments)) {
    throw new Error('review archive marketSegments must be an array');
  }
}

function prepareImportedAnnotationsWithIdMap(existingAnnotations, importedAnnotations) {
  const usedIds = new Set(existingAnnotations.map((annotation) => annotation.id).filter(Boolean));
  const existingByIdentity = new Map(
    existingAnnotations.map((annotation) => [getAnnotationIdentity(annotation), annotation])
  );
  const idMap = new Map();
  const importStamp = Date.now();
  let skippedDuplicates = 0;

  const annotations = [];
  importedAnnotations.forEach((annotation, index) => {
    const originalId = annotation.id;
    const identity = getAnnotationIdentity(annotation);
    const existing = existingByIdentity.get(identity);
    if (existing) {
      skippedDuplicates += 1;
      idMap.set(originalId, existing.id);
      return;
    }

    let nextAnnotation = annotation;
    if (usedIds.has(originalId)) {
      const nextId = `${originalId}-import-${importStamp}-${index + 1}`;
      nextAnnotation = {
        ...annotation,
        id: nextId,
        importedFromId: originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(nextAnnotation.id);
    existingByIdentity.set(identity, nextAnnotation);
    idMap.set(originalId, nextAnnotation.id);
    annotations.push(nextAnnotation);
  });

  return { annotations, skippedDuplicates, idMap };
}

function isImportableSegment(segment) {
  if (!segment || typeof segment !== 'object') return false;
  if (!segment.id) return false;
  return (
    segment.start &&
    segment.end &&
    Number.isFinite(Number(segment.start.price)) &&
    Number.isFinite(Number(segment.end.price)) &&
    (segment.start.timestamp || segment.start.time) &&
    (segment.end.timestamp || segment.end.time)
  );
}

function normalizeDisplayMode(value, fallback = 'highlight') {
  return DISPLAY_MODES.has(value) ? value : fallback;
}

function normalizeImportedResponse(response, pdaIdMap, availablePdaIds) {
  const originalPdaId = response?.pdaId;
  const pdaId = pdaIdMap.get(originalPdaId) || originalPdaId;
  if (!pdaId || !availablePdaIds.has(pdaId)) return null;

  const displayMode = normalizeDisplayMode(
    response?.displayMode,
    response?.selected === false ? 'normal' : 'highlight'
  );

  return {
    pdaId,
    pdaType: response.pdaType || 'unknown',
    relation: response.relation || 'approached',
    note: response.note || '',
    displayMode,
    selected: displayMode === 'highlight',
    linkedAt: response.linkedAt || Date.now(),
  };
}

function normalizeImportedSegment(segment, pdaIdMap, availablePdaIds) {
  const responses = Array.isArray(segment.pdaResponses)
    ? segment.pdaResponses
        .map((response) => normalizeImportedResponse(response, pdaIdMap, availablePdaIds))
        .filter(Boolean)
    : [];

  return {
    ...segment,
    source: segment.source || 'manual',
    timeframe: segment.timeframe || '1H',
    tags: Array.isArray(segment.tags) ? segment.tags.filter((tag) => typeof tag === 'string') : [],
    pdaResponses: responses,
    display: {
      ...(segment.display || {}),
      isolate: false,
      isolateDisplayMode: normalizeDisplayMode(segment.display?.isolateDisplayMode),
    },
  };
}

function prepareImportedSegments(existingSegments, importedSegments) {
  const usedIds = new Set(existingSegments.map((segment) => segment.id).filter(Boolean));
  const existingIdentities = new Set(existingSegments.map(getSegmentIdentity));
  const importStamp = Date.now();
  let skippedDuplicates = 0;

  const segments = [];
  importedSegments.forEach((segment, index) => {
    const identity = getSegmentIdentity(segment);
    if (existingIdentities.has(identity)) {
      skippedDuplicates += 1;
      return;
    }

    let nextSegment = segment;
    if (usedIds.has(segment.id)) {
      const nextId = `${segment.id}-import-${importStamp}-${index + 1}`;
      nextSegment = {
        ...segment,
        id: nextId,
        importedFromId: segment.id,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(nextSegment.id);
    existingIdentities.add(identity);
    segments.push(nextSegment);
  });

  return { segments, skippedDuplicates };
}

export function exportReviewArchive() {
  const payload = buildReviewPayload();
  if (payload.pdaAnnotations.length === 0 && payload.marketSegments.length === 0) {
    bus.emit('status:update', { text: '没有可导出的复盘对象', isError: true });
    return;
  }

  downloadReviewJson(payload);
  bus.emit('status:update', {
    text: `已导出 ${payload.pdaAnnotations.length} 条 PDA 与 ${payload.marketSegments.length} 条 Segment`,
    isError: false,
  });
}

export async function importReviewArchive(file) {
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const payload = JSON.parse(text);
    validateReviewPayload(payload);

    const existingAnnotations = getAnnotations();
    const importedAnnotations = getImportableAnnotations({ annotations: payload.pdaAnnotations });
    const {
      annotations,
      skippedDuplicates: skippedPdaDuplicates,
      idMap,
    } = prepareImportedAnnotationsWithIdMap(existingAnnotations, importedAnnotations);
    loadAnnotations([...existingAnnotations, ...annotations]);

    const existingSegments = getSegments();
    const availablePdaIds = new Set(
      [...existingAnnotations, ...annotations].map((annotation) => annotation.id).filter(Boolean)
    );
    const normalizedSegments = payload.marketSegments
      .filter(isImportableSegment)
      .map((segment) => normalizeImportedSegment(segment, idMap, availablePdaIds));
    const { segments, skippedDuplicates: skippedSegmentDuplicates } = prepareImportedSegments(
      existingSegments,
      normalizedSegments
    );
    loadSegments([...existingSegments, ...segments]);

    const skipped = skippedPdaDuplicates + skippedSegmentDuplicates;
    bus.emit('status:update', {
      text: `已导入 ${annotations.length} 条 PDA 与 ${segments.length} 条 Segment${
        skipped ? `，跳过 ${skipped} 条重复对象` : ''
      }`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', {
      text: `复盘导入失败: ${err.message}`,
      isError: true,
    });
  }
}
