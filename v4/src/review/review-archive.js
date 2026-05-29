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
import { getSegmentGroups, loadSegmentGroups } from '../segment/segment-group-store.js';
import { normalizeReactionEvidenceList } from '../segment/reaction-evidence.js';
import {
  getSmtRecordIdentity,
  getSmtRecords,
  loadSmtRecords,
  normalizeSmtRecord,
} from '../smt/smt-store.js';
import {
  getOrderReviewIdentity,
  getOrderReviews,
  loadOrderReviews,
  normalizeOrderReview,
  ORDER_REF_TYPES,
} from '../order/order-review-store.js';
import { recordHistory } from '../history/history-manager.js';

const REVIEW_ARCHIVE_VERSION = 1;
const REVIEW_ARCHIVE_APP = 'trading-v4-review';
const DISPLAY_MODES = new Set(['highlight', 'normal', 'hidden']);

function getExportableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getExportableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
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
    segmentGroups: getExportableSegmentGroups(),
    smtRecords: getSmtRecords(),
    orderReviews: getOrderReviews(),
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
  if (payload.segmentGroups !== undefined && !Array.isArray(payload.segmentGroups)) {
    throw new Error('review archive segmentGroups must be an array');
  }
  if (payload.smtRecords !== undefined && !Array.isArray(payload.smtRecords)) {
    throw new Error('review archive smtRecords must be an array');
  }
  if (payload.orderReviews !== undefined && !Array.isArray(payload.orderReviews)) {
    throw new Error('review archive orderReviews must be an array');
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

function normalizeImportedGroup(group, segmentIdMap, availableSegmentIds) {
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

function prepareImportedGroups(existingGroups, importedGroups) {
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

function prepareImportedSmtRecords(existingRecords, importedRecords) {
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

function remapOrderReviewLinkedRefs(order, refIdMaps = {}) {
  const refs = Array.isArray(order.setupThesis?.linkedObjectRefs)
    ? order.setupThesis.linkedObjectRefs.map((ref) => {
        if (ref.type === ORDER_REF_TYPES.PDA) {
          return { ...ref, id: refIdMaps.pdaIdMap?.get(ref.id) || ref.id };
        }
        if (ref.type === ORDER_REF_TYPES.SEGMENT) {
          return { ...ref, id: refIdMaps.segmentIdMap?.get(ref.id) || ref.id };
        }
        if (ref.type === ORDER_REF_TYPES.COMPOSITE) {
          return { ...ref, id: refIdMaps.groupIdMap?.get(ref.id) || ref.id };
        }
        if (ref.type === ORDER_REF_TYPES.SMT) {
          return { ...ref, id: refIdMaps.smtIdMap?.get(ref.id) || ref.id };
        }
        return ref;
      })
    : [];

  return {
    ...order,
    setupThesis: {
      ...(order.setupThesis || {}),
      linkedObjectRefs: refs,
    },
  };
}

function prepareImportedOrderReviews(existingOrders, importedOrders, refIdMaps = {}) {
  const usedIds = new Set(existingOrders.map((order) => order.id).filter(Boolean));
  const existingByIdentity = new Map(
    existingOrders
      .map((order) => [getOrderReviewIdentity(order), order])
      .filter(([identity]) => identity)
  );
  const importStamp = Date.now();
  let skippedDuplicates = 0;
  let skippedInvalid = 0;
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
    orders.push(normalized);
  });

  return { orders, skippedDuplicates, skippedInvalid };
}

export function exportReviewArchive() {
  const payload = buildReviewPayload();
  if (
    payload.pdaAnnotations.length === 0 &&
    payload.marketSegments.length === 0 &&
    payload.segmentGroups.length === 0 &&
    payload.smtRecords.length === 0 &&
    payload.orderReviews.length === 0
  ) {
    bus.emit('status:update', { text: '没有可导出的复盘对象', isError: true });
    return;
  }

  downloadReviewJson(payload);
  bus.emit('status:update', {
    text: `已导出 ${payload.pdaAnnotations.length} 条 PDA、${payload.marketSegments.length} 条 Segment、${payload.segmentGroups.length} 个 Composite Move、${payload.smtRecords.length} 条 SMT 与 ${payload.orderReviews.length} 条 Order Review`,
    isError: false,
  });
}

export async function importReviewArchive(file) {
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const payload = JSON.parse(text);
    validateReviewPayload(payload);

    let annotations = [];
    let segments = [];
    let groups = [];
    let smtRecords = [];
    let orders = [];
    let skippedPdaDuplicates = 0;
    let skippedSegmentDuplicates = 0;
    let skippedGroupDuplicates = 0;
    let skippedSmtDuplicates = 0;
    let skippedInvalidSmt = 0;
    let skippedOrderDuplicates = 0;
    let skippedInvalidOrders = 0;

    await recordHistory('Import Review Archive', () => {
      const existingAnnotations = getAnnotations();
      const importedAnnotations = getImportableAnnotations({ annotations: payload.pdaAnnotations });
      const preparedPda = prepareImportedAnnotationsWithIdMap(existingAnnotations, importedAnnotations);
      annotations = preparedPda.annotations;
      skippedPdaDuplicates = preparedPda.skippedDuplicates;
      const idMap = preparedPda.idMap;
      loadAnnotations([...existingAnnotations, ...annotations]);

      const existingSegments = getSegments();
      const availablePdaIds = new Set(
        [...existingAnnotations, ...annotations].map((annotation) => annotation.id).filter(Boolean)
      );
      const normalizedSegments = payload.marketSegments
        .filter(isImportableSegment)
        .map((segment) => normalizeImportedSegment(segment, idMap, availablePdaIds));
      const preparedSegments = prepareImportedSegments(
        existingSegments,
        normalizedSegments
      );
      segments = preparedSegments.segments;
      skippedSegmentDuplicates = preparedSegments.skippedDuplicates;
      const segmentIdMap = preparedSegments.idMap;
      loadSegments([...existingSegments, ...segments]);

      const availableSegmentIds = new Set([...existingSegments, ...segments].map((segment) => segment.id));
      const existingGroups = getSegmentGroups();
      const normalizedGroups = (Array.isArray(payload.segmentGroups) ? payload.segmentGroups : [])
        .map((group) => normalizeImportedGroup(group, segmentIdMap, availableSegmentIds))
        .filter(Boolean);
      const preparedGroups = prepareImportedGroups(
        existingGroups,
        normalizedGroups
      );
      groups = preparedGroups.groups;
      skippedGroupDuplicates = preparedGroups.skippedDuplicates;
      const groupIdMap = preparedGroups.idMap;
      loadSegmentGroups([...existingGroups, ...groups]);

      const existingSmtRecords = getSmtRecords();
      const preparedSmt = prepareImportedSmtRecords(existingSmtRecords, Array.isArray(payload.smtRecords) ? payload.smtRecords : []);
      smtRecords = preparedSmt.records;
      skippedSmtDuplicates = preparedSmt.skippedDuplicates;
      skippedInvalidSmt = preparedSmt.skippedInvalid;
      const smtIdMap = preparedSmt.idMap;
      loadSmtRecords([...existingSmtRecords, ...smtRecords]);

      const existingOrderReviews = getOrderReviews();
      const preparedOrders = prepareImportedOrderReviews(
        existingOrderReviews,
        Array.isArray(payload.orderReviews) ? payload.orderReviews : [],
        { pdaIdMap: idMap, segmentIdMap, groupIdMap, smtIdMap }
      );
      orders = preparedOrders.orders;
      skippedOrderDuplicates = preparedOrders.skippedDuplicates;
      skippedInvalidOrders = preparedOrders.skippedInvalid;
      loadOrderReviews([...existingOrderReviews, ...orders]);
    });

    const skipped =
      skippedPdaDuplicates +
      skippedSegmentDuplicates +
      skippedGroupDuplicates +
      skippedSmtDuplicates +
      skippedInvalidSmt +
      skippedOrderDuplicates +
      skippedInvalidOrders;
    bus.emit('status:update', {
      text: `已导入 ${annotations.length} 条 PDA、${segments.length} 条 Segment、${groups.length} 个 Composite Move、${smtRecords.length} 条 SMT 与 ${orders.length} 条 Order Review${
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
