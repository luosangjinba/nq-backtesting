import { loadAnnotations } from '../pda/pda-store.js';
import { loadSegments } from '../segment/segment-store.js';
import { loadSegmentGroups } from '../segment/segment-group-store.js';
import { loadSmtRecords } from '../smt/smt-store.js';
import { loadOrderReviews } from '../order/order-review-store.js';
import { loadLiveRecords } from '../live-record/live-record-store.js';
import { loadDailyTimeReviews } from '../time-reaction/daily-time-review-store.js';
import { loadChartNotes } from '../chart-notes/chart-note-store.js';

export function loadReviewArchiveStores(existing = {}, imported = {}) {
  loadAnnotations([...(existing.annotations || []), ...(imported.annotations || [])]);
  loadSegments([...(existing.segments || []), ...(imported.segments || [])]);
  loadSegmentGroups([...(existing.groups || []), ...(imported.groups || [])]);
  loadSmtRecords([...(existing.smtRecords || []), ...(imported.smtRecords || [])]);
  loadChartNotes([...(existing.chartNotes || []), ...(imported.chartNotes || [])]);
  loadOrderReviews([...(existing.orders || []), ...(imported.orders || [])]);
  loadLiveRecords([...(existing.liveRecords || []), ...(imported.liveRecords || [])]);
  loadDailyTimeReviews(
    [...(existing.dailyTimeReviews || []), ...(imported.dailyTimeReviews || [])],
    { preserveUpdatedAt: true }
  );
}
