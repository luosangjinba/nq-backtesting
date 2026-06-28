export const REVIEW_ARCHIVE_VERSION = 1;
export const REVIEW_ARCHIVE_APP = 'trading-v4-review';

export function validateReviewPayload(payload) {
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
  if (payload.liveRecords !== undefined && !Array.isArray(payload.liveRecords)) {
    throw new Error('review archive liveRecords must be an array');
  }
  if (payload.dailyTimeReviews !== undefined && !Array.isArray(payload.dailyTimeReviews)) {
    throw new Error('review archive dailyTimeReviews must be an array');
  }
  if (payload.chartNotes !== undefined && !Array.isArray(payload.chartNotes)) {
    throw new Error('review archive chartNotes must be an array');
  }
  if (payload.dailyRegimes !== undefined && !Array.isArray(payload.dailyRegimes)) {
    throw new Error('review archive dailyRegimes must be an array');
  }
}

export function hasExportableReviewPayload(payload = {}) {
  return Boolean(
    payload.pdaAnnotations?.length ||
      payload.marketSegments?.length ||
      payload.segmentGroups?.length ||
      payload.smtRecords?.length ||
      payload.orderReviews?.length ||
      payload.liveRecords?.length ||
      payload.dailyTimeReviews?.length ||
      payload.chartNotes?.length
  );
}

export function formatReviewExportStatus(payload = {}) {
  return `已导出 ${payload.pdaAnnotations?.length || 0} 条 PDA、${payload.marketSegments?.length || 0} 条 Segment、${payload.segmentGroups?.length || 0} 个 Composite Move、${payload.smtRecords?.length || 0} 条 SMT、${payload.orderReviews?.length || 0} 条 Order Setup、${payload.liveRecords?.length || 0} 条 Live Record、${payload.dailyTimeReviews?.length || 0} 条 Time Reaction、${payload.chartNotes?.length || 0} 条 Chart Note 与 ${payload.dailyRegimes?.length || 0} 条 Daily Regime`;
}

export function formatReviewImportStatus({
  annotations = [],
  segments = [],
  groups = [],
  smtRecords = [],
  orders = [],
  liveRecords = [],
  dailyTimeReviews = [],
  chartNotes = [],
  dailyRegimes = [],
  skipped = 0,
} = {}) {
  return `已导入 ${annotations.length} 条 PDA、${segments.length} 条 Segment、${groups.length} 个 Composite Move、${smtRecords.length} 条 SMT、${orders.length} 条 Order Setup、${liveRecords.length} 条 Live Record、${dailyTimeReviews.length} 条 Time Reaction、${chartNotes.length} 条 Chart Note，并校验 ${dailyRegimes.length} 条 Daily Regime${
    skipped ? `，跳过 ${skipped} 条重复对象` : ''
  }`;
}
