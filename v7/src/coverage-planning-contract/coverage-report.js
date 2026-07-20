import { createRawBarRequest, rawBarRequestKey } from '../bar-data-contract/public.js';
import { failCoveragePlanning } from './coverage-error.js';

const COVERAGE_KINDS = Object.freeze([
  'data', 'market-closed', 'not-listed', 'source-unavailable', 'unknown',
]);
const REPORT_FIELDS = Object.freeze(['schemaVersion', 'request', 'requestKey', 'segments']);
const SEGMENT_FIELDS = Object.freeze(['startEpochMs', 'endEpochMs', 'kind']);

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))) {
    failCoveragePlanning(code, `${label} fields are invalid.`);
  }
}

function normalizeSegment(value, request) {
  exactRecord(value, SEGMENT_FIELDS, 'INVALID_COVERAGE_SEGMENT', 'Coverage segment');
  if (!Number.isSafeInteger(value.startEpochMs) || !Number.isSafeInteger(value.endEpochMs)
    || value.startEpochMs < request.windowStartEpochMs
    || value.endEpochMs > request.windowEndEpochMs
    || value.startEpochMs >= value.endEpochMs
    || !COVERAGE_KINDS.includes(value.kind)) {
    failCoveragePlanning('INVALID_COVERAGE_SEGMENT', 'Coverage segment bounds or kind are invalid.');
  }
  return { startEpochMs: value.startEpochMs, endEpochMs: value.endEpochMs, kind: value.kind };
}

function normalizeTiling(values, request) {
  if (!Array.isArray(values) || values.length === 0) {
    failCoveragePlanning('INCOMPLETE_COVERAGE_TILING', 'Coverage must tile the complete request window.');
  }
  const merged = [];
  let cursor = request.windowStartEpochMs;
  for (const value of values) {
    const segment = normalizeSegment(value, request);
    if (segment.startEpochMs !== cursor) {
      failCoveragePlanning('INCOMPLETE_COVERAGE_TILING', 'Coverage segments must be contiguous and ordered.');
    }
    const previous = merged.at(-1);
    if (previous?.kind === segment.kind) previous.endEpochMs = segment.endEpochMs;
    else merged.push(segment);
    cursor = segment.endEpochMs;
  }
  if (cursor !== request.windowEndEpochMs) {
    failCoveragePlanning('INCOMPLETE_COVERAGE_TILING', 'Coverage must reach the request window end.');
  }
  return Object.freeze(merged.map((segment) => Object.freeze(segment)));
}

/**
 * Normalize an explicit full-window coverage report. Missing bars never imply a
 * gap kind: an adapter must classify every interval explicitly.
 */
export function createCoverageReport(value) {
  const fields = value && Object.hasOwn(value, 'requestKey')
    ? REPORT_FIELDS : REPORT_FIELDS.filter((field) => field !== 'requestKey');
  exactRecord(value, fields, 'INVALID_COVERAGE_REPORT', 'Coverage report');
  if (value.schemaVersion !== 1) {
    failCoveragePlanning('UNSUPPORTED_COVERAGE_VERSION', 'Coverage report requires schemaVersion 1.');
  }
  const request = createRawBarRequest(value.request);
  const requestKey = rawBarRequestKey(request);
  if (value.requestKey !== undefined && value.requestKey !== requestKey) {
    failCoveragePlanning('COVERAGE_IDENTITY_MISMATCH', 'Coverage requestKey does not match its request.');
  }
  return Object.freeze({
    schemaVersion: 1,
    request,
    requestKey,
    segments: normalizeTiling(value.segments, request),
  });
}

export function createUnknownCoverageReport(requestValue) {
  const request = createRawBarRequest(requestValue);
  return createCoverageReport({
    schemaVersion: 1,
    request,
    segments: [{
      startEpochMs: request.windowStartEpochMs,
      endEpochMs: request.windowEndEpochMs,
      kind: 'unknown',
    }],
  });
}
