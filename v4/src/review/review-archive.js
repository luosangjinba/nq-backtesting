// JSON archive import/export for complete manual review state.

import * as bus from '../event-bus.js';
import { timeframeToString } from '../config.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  formatDateForFile,
  getArchiveRange,
  getExportableAnnotations,
  getImportableAnnotations,
  readFileAsText,
} from '../pda/pda-archive.js';
import { getAnnotations } from '../pda/pda-store.js';
import { getSegments } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';
import {
  getSmtRecords,
} from '../smt/smt-store.js';
import {
  getOrderReviews,
} from '../order/order-review-store.js';
import {
  getLiveRecords,
} from '../live-record/live-record-store.js';
import {
  getDailyTimeReviews,
  getDailyTimeReviewsWithContent,
} from '../time-reaction/daily-time-review-store.js';
import {
  getDailyRegimes,
} from '../daily-regime/daily-regime-store.js';
import { recordImportBatch } from '../import/import-batch-audit.js';
import {
  getChartNotes,
} from '../chart-notes/chart-note-store.js';
import { recordHistory } from '../history/history-manager.js';
import { collectReviewObjectDateKeys } from './review-archive-date-keys.js';
import {
  formatReviewExportStatus,
  formatReviewImportStatus,
  hasExportableReviewPayload,
  REVIEW_ARCHIVE_APP,
  REVIEW_ARCHIVE_VERSION,
  validateReviewPayload,
} from './review-archive-format.js';
import {
  isImportableSegment,
  normalizeImportedGroup,
  normalizeImportedSegment,
  prepareImportedAnnotationsWithIdMap,
  prepareImportedChartNotes,
  prepareImportedDailyRegimes,
  prepareImportedDailyTimeReviews,
  prepareImportedGroups,
  prepareImportedLiveRecords,
  prepareImportedOrderReviews,
  prepareImportedSegments,
  prepareImportedSmtRecords,
} from './review-archive-import-prepare.js';
import { loadReviewArchiveStores } from './review-archive-store-loader.js';

function getExportableSegments() {
  return getSegments().filter((segment) => segment.source !== 'draft' && !segment.draft);
}

function getExportableSegmentGroups() {
  return getSegmentGroups().filter((group) => group.type === 'composite-move');
}

function getExportableDailyRegimes(reviewObjectDateKeys) {
  if (!reviewObjectDateKeys?.size) return [];
  const instrument = getPrimaryInstrument();
  return getDailyRegimes().filter((regime) => (
    reviewObjectDateKeys.has(regime.date) && regime.instrument === instrument
  ));
}

function isTimestampInsideRange(timestamp, range = {}) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return false;
  const start = Number(range.requestedStartTs ?? range.start);
  const end = Number(range.requestedEndTs ?? range.end);
  if (Number.isFinite(start) && value < start) return false;
  if (Number.isFinite(end) && value > end) return false;
  return true;
}

function getExportableChartNotes(range) {
  return getChartNotes().filter((note) => isTimestampInsideRange(note.timestamp, range));
}

export function buildReviewPayload() {
  const pdaAnnotations = getExportableAnnotations();
  const marketSegments = getExportableSegments();
  const segmentGroups = getExportableSegmentGroups();
  const instrument = getPrimaryInstrument();
  const smtRecords = getSmtRecords().filter((record) => record.primaryInstrument === instrument);
  const orderReviews = getOrderReviews();
  const liveRecords = getLiveRecords().filter((record) => record.instrument === instrument);
  const dailyTimeReviews = getDailyTimeReviewsWithContent();
  const reviewObjectDateKeys = collectReviewObjectDateKeys({
    pdaAnnotations,
    marketSegments,
    segmentGroups,
    smtRecords,
    orderReviews,
    liveRecords,
    dailyTimeReviews,
  });
  const range = getArchiveRange();
  const chartNotes = getExportableChartNotes(range);

  return {
    app: REVIEW_ARCHIVE_APP,
    version: REVIEW_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    instrument,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    range,
    pdaAnnotations,
    marketSegments,
    segmentGroups,
    smtRecords,
    orderReviews,
    liveRecords,
    dailyTimeReviews,
    chartNotes,
    dailyRegimes: getExportableDailyRegimes(reviewObjectDateKeys),
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

function validateArchiveInstrument(payloadInstrument) {
  const archiveInstrument = String(payloadInstrument || 'NQ').trim().toUpperCase();
  const currentInstrument = getPrimaryInstrument();
  if (archiveInstrument !== currentInstrument) {
    throw new Error(`archive instrument ${archiveInstrument} does not match current Pane 2 ${currentInstrument}`);
  }
}

export function exportReviewArchive() {
  const payload = buildReviewPayload();
  if (!hasExportableReviewPayload(payload)) {
    bus.emit('status:update', { text: '没有可导出的复盘对象', isError: true });
    return;
  }

  downloadReviewJson(payload);
  bus.emit('status:update', {
    text: formatReviewExportStatus(payload),
    isError: false,
  });
}

export async function importReviewArchive(file) {
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const payload = JSON.parse(text);
    validateReviewPayload(payload);
    validateArchiveInstrument(payload.instrument);

    let annotations = [];
    let segments = [];
    let groups = [];
    let smtRecords = [];
    let orders = [];
    let liveRecords = [];
    let dailyTimeReviews = [];
    let chartNotes = [];
    let dailyRegimes = [];
    let skippedPdaDuplicates = 0;
    let skippedSegmentDuplicates = 0;
    let skippedGroupDuplicates = 0;
    let skippedSmtDuplicates = 0;
    let skippedInvalidSmt = 0;
    let skippedOrderDuplicates = 0;
    let skippedInvalidOrders = 0;
    let skippedLiveRecordDuplicates = 0;
    let skippedInvalidLiveRecords = 0;
    let skippedDailyTimeDuplicates = 0;
    let skippedInvalidDailyTime = 0;
    let skippedChartNoteDuplicates = 0;
    let skippedInvalidChartNotes = 0;
    let skippedDailyRegimeDuplicates = 0;
    let skippedInvalidDailyRegimes = 0;

    await recordHistory('Import Review Archive', () => {
      const existingAnnotations = getAnnotations();
      const importedAnnotations = getImportableAnnotations({ annotations: payload.pdaAnnotations });
      const preparedPda = prepareImportedAnnotationsWithIdMap(existingAnnotations, importedAnnotations);
      annotations = preparedPda.annotations;
      skippedPdaDuplicates = preparedPda.skippedDuplicates;
      const idMap = preparedPda.idMap;

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

      const existingSmtRecords = getSmtRecords();
      const preparedSmt = prepareImportedSmtRecords(existingSmtRecords, Array.isArray(payload.smtRecords) ? payload.smtRecords : []);
      smtRecords = preparedSmt.records;
      skippedSmtDuplicates = preparedSmt.skippedDuplicates;
      skippedInvalidSmt = preparedSmt.skippedInvalid;
      const smtIdMap = preparedSmt.idMap;

      const existingChartNotes = getChartNotes();
      const preparedChartNotes = prepareImportedChartNotes(
        existingChartNotes,
        Array.isArray(payload.chartNotes) ? payload.chartNotes : []
      );
      chartNotes = preparedChartNotes.notes;
      skippedChartNoteDuplicates = preparedChartNotes.skippedDuplicates;
      skippedInvalidChartNotes = preparedChartNotes.skippedInvalid;
      const chartNoteIdMap = preparedChartNotes.idMap;

      const existingOrderReviews = getOrderReviews();
      const preparedOrders = prepareImportedOrderReviews(
        existingOrderReviews,
        Array.isArray(payload.orderReviews) ? payload.orderReviews : [],
        { pdaIdMap: idMap, segmentIdMap, groupIdMap, smtIdMap, chartNoteIdMap }
      );
      orders = preparedOrders.orders;
      skippedOrderDuplicates = preparedOrders.skippedDuplicates;
      skippedInvalidOrders = preparedOrders.skippedInvalid;
      const orderIdMap = preparedOrders.idMap;

      const existingLiveRecords = getLiveRecords();
      const preparedLiveRecords = prepareImportedLiveRecords(
        existingLiveRecords,
        Array.isArray(payload.liveRecords) ? payload.liveRecords : [],
        { pdaIdMap: idMap, segmentIdMap, groupIdMap, smtIdMap, chartNoteIdMap, orderIdMap }
      );
      liveRecords = preparedLiveRecords.records;
      skippedLiveRecordDuplicates = preparedLiveRecords.skippedDuplicates;
      skippedInvalidLiveRecords = preparedLiveRecords.skippedInvalid;

      const existingDailyTimeReviews = getDailyTimeReviews();
      const preparedDailyTimeReviews = prepareImportedDailyTimeReviews(
        existingDailyTimeReviews,
        Array.isArray(payload.dailyTimeReviews) ? payload.dailyTimeReviews : [],
        { pdaIdMap: idMap, segmentIdMap, groupIdMap, smtIdMap, orderIdMap }
      );
      dailyTimeReviews = preparedDailyTimeReviews.reviews;
      skippedDailyTimeDuplicates = preparedDailyTimeReviews.skippedDuplicates;
      skippedInvalidDailyTime = preparedDailyTimeReviews.skippedInvalid;

      const existingDailyRegimes = getDailyRegimes();
      const preparedDailyRegimes = prepareImportedDailyRegimes(
        existingDailyRegimes,
        Array.isArray(payload.dailyRegimes) ? payload.dailyRegimes : []
      );
      dailyRegimes = preparedDailyRegimes.regimes;
      skippedDailyRegimeDuplicates = preparedDailyRegimes.skippedDuplicates;
      skippedInvalidDailyRegimes = preparedDailyRegimes.skippedInvalid;

      loadReviewArchiveStores(
        {
          annotations: existingAnnotations,
          segments: existingSegments,
          groups: existingGroups,
          smtRecords: existingSmtRecords,
          chartNotes: existingChartNotes,
          orders: existingOrderReviews,
          liveRecords: existingLiveRecords,
          dailyTimeReviews: existingDailyTimeReviews,
        },
        {
          annotations,
          segments,
          groups,
          smtRecords,
          chartNotes,
          orders,
          liveRecords,
          dailyTimeReviews,
        }
      );
    });

    const skipped =
      skippedPdaDuplicates +
      skippedSegmentDuplicates +
      skippedGroupDuplicates +
      skippedSmtDuplicates +
      skippedInvalidSmt +
      skippedOrderDuplicates +
      skippedInvalidOrders +
      skippedLiveRecordDuplicates +
      skippedInvalidLiveRecords +
      skippedDailyTimeDuplicates +
      skippedInvalidDailyTime +
      skippedChartNoteDuplicates +
      skippedInvalidChartNotes +
      skippedDailyRegimeDuplicates +
      skippedInvalidDailyRegimes;
    recordImportBatch({
      sourceType: payload.source?.type || 'review-json',
      sourceFileName: file.name || '',
      instrument: getPrimaryInstrument(),
      counts: {
        pdaAnnotations: annotations.length,
        marketSegments: segments.length,
        segmentGroups: groups.length,
        smtRecords: smtRecords.length,
        orderReviews: orders.length,
        liveRecords: liveRecords.length,
        dailyTimeReviews: dailyTimeReviews.length,
        chartNotes: chartNotes.length,
        dailyRegimes: dailyRegimes.length,
      },
      skipped: {
        pdaAnnotations: skippedPdaDuplicates,
        marketSegments: skippedSegmentDuplicates,
        segmentGroups: skippedGroupDuplicates,
        smtRecords: skippedSmtDuplicates + skippedInvalidSmt,
        orderReviews: skippedOrderDuplicates + skippedInvalidOrders,
        liveRecords: skippedLiveRecordDuplicates + skippedInvalidLiveRecords,
        dailyTimeReviews: skippedDailyTimeDuplicates + skippedInvalidDailyTime,
        chartNotes: skippedChartNoteDuplicates + skippedInvalidChartNotes,
        dailyRegimes: skippedDailyRegimeDuplicates + skippedInvalidDailyRegimes,
        total: skipped,
      },
      metadata: {
        archiveVersion: payload.version,
        archiveExportedAt: payload.exportedAt || '',
        archiveSource: payload.source || null,
      },
    });
    bus.emit('status:update', {
      text: formatReviewImportStatus({
        annotations,
        segments,
        groups,
        smtRecords,
        orders,
        liveRecords,
        dailyTimeReviews,
        chartNotes,
        dailyRegimes,
        skipped,
      }),
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', {
      text: `复盘导入失败: ${err.message}`,
      isError: true,
    });
  }
}
