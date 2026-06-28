import { getAnnotationIdentity } from '../pda/pda-store.js';
import { getSegmentIdentity } from '../segment/segment-store.js';
import { normalizeReactionEvidenceList } from '../segment/reaction-evidence.js';
import { getSmtRecordIdentity, normalizeSmtRecord } from '../smt/smt-store.js';
import { getOrderReviewIdentity, normalizeOrderReview } from '../order/order-review-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { normalizeLiveRecord } from '../live-record/live-record-store.js';
import { getDailyTimeReviewIdentity, normalizeDailyTimeReview } from '../time-reaction/daily-time-review-store.js';
import { getDailyRegimeIdentity, normalizeDailyRegime } from '../daily-regime/daily-regime-types.js';
import { getChartNoteIdentity, normalizeChartNote } from '../chart-notes/chart-note-store.js';
import {
  remapDailyTimeReviewRefs,
  remapLiveRecordRefs,
  remapOrderReviewLinkedRefs,
} from './review-archive-import-maps.js';

const DISPLAY_MODES = new Set(['highlight', 'normal', 'hidden']);

export function prepareImportedAnnotationsWithIdMap(existingAnnotations, importedAnnotations) {
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

export function isImportableSegment(segment) {
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
  const reactionEvidence = normalizeReactionEvidenceList(response.reactionEvidence).map((evidence) => ({
    ...evidence,
    pdaId,
  }));

  return {
    pdaId,
    pdaType: response.pdaType || 'unknown',
    relation: response.relation || 'approached',
    note: response.note || '',
    displayMode,
    selected: displayMode === 'highlight',
    linkedAt: response.linkedAt || Date.now(),
    ...(reactionEvidence.length ? { reactionEvidence } : {}),
  };
}

export function normalizeImportedSegment(segment, pdaIdMap, availablePdaIds) {
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

export function prepareImportedSegments(existingSegments, importedSegments) {
  const usedIds = new Set(existingSegments.map((segment) => segment.id).filter(Boolean));
  const existingByIdentity = new Map(existingSegments.map((segment) => [getSegmentIdentity(segment), segment]));
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  const idMap = new Map();

  const segments = [];
  importedSegments.forEach((segment, index) => {
    const identity = getSegmentIdentity(segment);
    const existing = existingByIdentity.get(identity);
    if (existing) {
      skippedDuplicates += 1;
      idMap.set(segment.id, existing.id);
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
    existingByIdentity.set(identity, nextSegment);
    idMap.set(segment.id, nextSegment.id);
    segments.push(nextSegment);
  });

  return { segments, skippedDuplicates, idMap };
}

export function normalizeImportedGroup(group, segmentIdMap, availableSegmentIds) {
  if (!group || group.type !== 'composite-move' || !Array.isArray(group.childSegmentIds)) return null;
  const childSegmentIds = group.childSegmentIds
    .map((id) => segmentIdMap.get(id) || id)
    .filter((id, index, ids) => availableSegmentIds.has(id) && ids.indexOf(id) === index);
  if (childSegmentIds.length < 2) return null;

  const targetSegmentId = segmentIdMap.get(group.targetSegmentId) || group.targetSegmentId || '';
  return {
    ...group,
    type: 'composite-move',
    childSegmentIds,
    targetSegmentId: availableSegmentIds.has(targetSegmentId) ? targetSegmentId : '',
    objective: group.objective || 'break-previous-extreme',
    outcome: group.outcome || 'pending',
    notes: group.notes || '',
    display: {
      ...(group.display || {}),
      showLabel: group.display?.showLabel ?? true,
    },
  };
}

export function prepareImportedGroups(existingGroups, importedGroups) {
  const usedIds = new Set(existingGroups.map((group) => group.id).filter(Boolean));
  const existingIdentities = new Set(
    existingGroups.map((group) => `${group.type}:${(group.childSegmentIds || []).join(',')}:${group.targetSegmentId || ''}`)
  );
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  const idMap = new Map();
  const groups = [];

  importedGroups.forEach((group, index) => {
    const identity = `${group.type}:${(group.childSegmentIds || []).join(',')}:${group.targetSegmentId || ''}`;
    if (existingIdentities.has(identity)) {
      skippedDuplicates += 1;
      const existing = existingGroups.find(
        (candidate) =>
          `${candidate.type}:${(candidate.childSegmentIds || []).join(',')}:${candidate.targetSegmentId || ''}` === identity
      );
      if (existing) idMap.set(group.id, existing.id);
      return;
    }

    const originalId = group.id;
    let nextGroup = group;
    if (usedIds.has(group.id)) {
      nextGroup = {
        ...group,
        id: `${group.id}-import-${importStamp}-${index + 1}`,
        importedFromId: originalId,
        updatedAt: Date.now(),
      };
    }
    usedIds.add(nextGroup.id);
    existingIdentities.add(identity);
    idMap.set(originalId, nextGroup.id);
    groups.push(nextGroup);
  });

  return { groups, skippedDuplicates, idMap };
}

export function prepareImportedSmtRecords(existingRecords, importedRecords) {
  const usedIds = new Set(existingRecords.map((record) => record.id).filter(Boolean));
  const existingByIdentity = new Map(existingRecords.map((record) => [getSmtRecordIdentity(record), record]));
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const idMap = new Map();
  const records = [];

  importedRecords.forEach((record, index) => {
    let normalized;
    try {
      normalized = normalizeSmtRecord(record, { preserveId: true });
    } catch {
      skippedInvalid += 1;
      return;
    }

    const identity = getSmtRecordIdentity(normalized);
    const existing = existingByIdentity.get(identity);
    if (existing) {
      skippedDuplicates += 1;
      idMap.set(normalized.id, existing.id);
      return;
    }

    const originalId = normalized.id;
    if (usedIds.has(normalized.id)) {
      normalized = {
        ...normalized,
        id: `${normalized.id}-import-${importStamp}-${index + 1}`,
        importedFromId: originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(normalized.id);
    existingByIdentity.set(identity, normalized);
    idMap.set(originalId, normalized.id);
    records.push(normalized);
  });

  return { records, skippedDuplicates, skippedInvalid, idMap };
}

export function prepareImportedOrderReviews(existingOrders, importedOrders, refIdMaps = {}) {
  const usedIds = new Set(existingOrders.map((order) => order.id).filter(Boolean));
  const existingByIdentity = new Map(
    existingOrders
      .map((order) => [getOrderReviewIdentity(order), order])
      .filter(([identity]) => identity)
  );
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const idMap = new Map();
  const orders = [];

  importedOrders.forEach((order, index) => {
    let normalized;
    try {
      normalized = normalizeOrderReview(
        remapOrderReviewLinkedRefs(order, refIdMaps),
        { now: Date.now() }
      );
    } catch {
      skippedInvalid += 1;
      return;
    }

    const identity = getOrderReviewIdentity(normalized);
    if (identity && existingByIdentity.has(identity)) {
      skippedDuplicates += 1;
      const existing = existingByIdentity.get(identity);
      if (existing) idMap.set(normalized.id, existing.id);
      return;
    }

    const originalId = normalized.id;
    if (usedIds.has(normalized.id)) {
      normalized = {
        ...normalized,
        id: `${normalized.id}-import-${importStamp}-${index + 1}`,
        importedFromId: normalized.importedFromId || originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(normalized.id);
    if (identity) existingByIdentity.set(identity, normalized);
    idMap.set(originalId, normalized.id);
    orders.push(normalized);
  });

  return { orders, skippedDuplicates, skippedInvalid, idMap };
}

function getLiveRecordImportIdentity(record = {}) {
  return [
    record.instrument || '',
    record.direction || '',
    record.anchor?.timestamp || '',
    record.anchor?.price ?? '',
    record.execution?.entry?.timestamp || '',
    record.execution?.entry?.price ?? '',
    record.result?.exitTimestamp || '',
  ].join('|');
}

export function prepareImportedLiveRecords(existingRecords, importedRecords, refIdMaps = {}) {
  const instrument = getPrimaryInstrument();
  const usedIds = new Set(existingRecords.map((record) => record.id).filter(Boolean));
  const existingByIdentity = new Map(
    existingRecords
      .map((record) => [getLiveRecordImportIdentity(record), record])
      .filter(([identity]) => identity)
  );
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const records = [];

  (Array.isArray(importedRecords) ? importedRecords : []).forEach((record, index) => {
    const recordInstrument = String(record?.instrument || '').trim().toUpperCase();
    if (recordInstrument && recordInstrument !== instrument) {
      skippedInvalid += 1;
      return;
    }
    let normalized;
    try {
      normalized = normalizeLiveRecord(
        { ...remapLiveRecordRefs(record, refIdMaps), instrument: recordInstrument || instrument },
        { now: Date.now() }
      );
    } catch {
      skippedInvalid += 1;
      return;
    }
    if (normalized.instrument !== instrument) {
      skippedInvalid += 1;
      return;
    }

    const identity = getLiveRecordImportIdentity(normalized);
    if (identity && existingByIdentity.has(identity)) {
      skippedDuplicates += 1;
      return;
    }

    const originalId = normalized.id;
    if (usedIds.has(normalized.id)) {
      normalized = {
        ...normalized,
        id: `${normalized.id}-import-${importStamp}-${index + 1}`,
        importedFromId: normalized.importedFromId || originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(normalized.id);
    if (identity) existingByIdentity.set(identity, normalized);
    records.push(normalized);
  });

  return { records, skippedDuplicates, skippedInvalid };
}

export function prepareImportedDailyTimeReviews(existingReviews, importedReviews, refIdMaps = {}) {
  const existingByIdentity = new Map(existingReviews.map((review) => [getDailyTimeReviewIdentity(review), review]));
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const usedIds = new Set(existingReviews.map((review) => review.id).filter(Boolean));
  const reviews = [];

  importedReviews.forEach((review, index) => {
    let normalized;
    try {
      normalized = normalizeDailyTimeReview(
        remapDailyTimeReviewRefs(review, refIdMaps),
        { preserveId: true, preserveUpdatedAt: true }
      );
    } catch {
      skippedInvalid += 1;
      return;
    }

    if (!normalized.date) {
      skippedInvalid += 1;
      return;
    }

    const identity = getDailyTimeReviewIdentity(normalized);
    if (existingByIdentity.has(identity)) {
      skippedDuplicates += 1;
      return;
    }

    const originalId = normalized.id;
    if (usedIds.has(normalized.id)) {
      normalized = {
        ...normalized,
        id: `${normalized.id}-import-${importStamp}-${index + 1}`,
        importedFromId: originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(normalized.id);
    existingByIdentity.set(identity, normalized);
    reviews.push(normalized);
  });

  return { reviews, skippedDuplicates, skippedInvalid };
}

export function prepareImportedDailyRegimes(existingRegimes, importedRegimes) {
  const existingByIdentity = new Map(existingRegimes.map((regime) => [getDailyRegimeIdentity(regime), regime]));
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const regimes = [];

  (Array.isArray(importedRegimes) ? importedRegimes : []).forEach((regime) => {
    let normalized;
    try {
      normalized = normalizeDailyRegime(regime);
    } catch {
      skippedInvalid += 1;
      return;
    }

    if (!normalized.date) {
      skippedInvalid += 1;
      return;
    }

    const identity = getDailyRegimeIdentity(normalized);
    if (existingByIdentity.has(identity)) {
      skippedDuplicates += 1;
      return;
    }

    existingByIdentity.set(identity, normalized);
    regimes.push(normalized);
  });

  return { regimes, skippedDuplicates, skippedInvalid };
}

export function prepareImportedChartNotes(existingNotes, importedNotes) {
  const usedIds = new Set(existingNotes.map((note) => note.id).filter(Boolean));
  const existingByIdentity = new Map(existingNotes.map((note) => [getChartNoteIdentity(note), note]));
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
  const notes = [];
  const idMap = new Map();

  (Array.isArray(importedNotes) ? importedNotes : []).forEach((note, index) => {
    const normalized = normalizeChartNote(note);
    if (!normalized) {
      skippedInvalid += 1;
      return;
    }

    const identity = getChartNoteIdentity(normalized);
    if (existingByIdentity.has(identity)) {
      skippedDuplicates += 1;
      idMap.set(normalized.id, existingByIdentity.get(identity).id);
      return;
    }

    let nextNote = normalized;
    const originalId = normalized.id;
    if (usedIds.has(normalized.id)) {
      nextNote = {
        ...normalized,
        id: `${normalized.id}-import-${importStamp}-${index + 1}`,
        importedFromId: originalId,
        updatedAt: Date.now(),
      };
    }

    usedIds.add(nextNote.id);
    existingByIdentity.set(identity, nextNote);
    idMap.set(originalId, nextNote.id);
    notes.push(nextNote);
  });

  return { notes, skippedDuplicates, skippedInvalid, idMap };
}
