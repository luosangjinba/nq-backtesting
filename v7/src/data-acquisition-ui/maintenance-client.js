import { abortableDelay } from '../browser-async-contract/public.js';

const MAINTENANCE_HEADER = 'data-maintenance';
const POLL_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 15000;

export function resolveMaintenanceApiBase(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname || '127.0.0.1';
  if (locationLike?.protocol === 'https:') return '';
  return `http://${hostname}:8766`;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Maintenance API returned non-JSON HTTP ${response.status}.`);
  }
}

function timestampWire(value) {
  return String(value ?? '').trim().replace('T', ' ').slice(0, 16);
}

function shiftWallMinute(value, minutes) {
  const normalized = timestampWire(value);
  const date = new Date(`${normalized.replace(' ', 'T')}:00Z`);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Latest timestamp is invalid.');
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function createMaintenanceClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  if (typeof fetchImpl !== 'function') throw new TypeError('Maintenance client requires fetch.');
  const apiBase = options.apiBase ?? resolveMaintenanceApiBase(options.location);
  const setTimer = options.setTimer ?? globalThis.setTimeout.bind(globalThis);
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout.bind(globalThis);
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;

  async function request(payload, {
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    acceptErrorResult = false,
  } = {}) {
    const requestController = new AbortController();
    const abortFromCaller = () => requestController.abort(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeout = setTimer(
      () => requestController.abort(new Error('Maintenance API request timed out.')),
      timeoutMs,
    );
    try {
      const response = await fetchImpl(`${apiBase}/v7/maintenance/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-V7-Maintenance-Request': MAINTENANCE_HEADER,
        },
        body: JSON.stringify(payload),
        signal: requestController.signal,
      });
      const data = await parseJsonResponse(response);
      if (!response.ok && !data.job && !acceptErrorResult) {
        throw new Error(data.error || data.output || `Maintenance API failed with HTTP ${response.status}.`);
      }
      return data;
    } finally {
      clearTimer(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  async function watchJob(jobId, { onStatus = () => {}, signal } = {}) {
    while (true) {
      await abortableDelay(pollIntervalMs, signal, setTimer, clearTimer);
      const status = await request({ action: 'job_status', jobId }, { signal });
      const job = status.job;
      if (!job) throw new Error(status.output || 'The maintenance job is no longer available.');
      onStatus(job);
      if (job.state === 'running') continue;
      if (!job.result) throw new Error('The maintenance job ended without a result.');
      return job.result;
    }
  }

  async function runJob(jobRequest, options = {}) {
    const started = await request({ action: 'job_start', request: jobRequest }, { signal: options.signal });
    if (!started.ok || started.job?.state !== 'running') {
      throw new Error(started.output || 'The maintenance job did not start.');
    }
    options.onStatus?.(started.job);
    return watchJob(started.job.jobId, options);
  }

  async function verifyV7Read({ instrument, latestTimestamp, signal }) {
    const end = shiftWallMinute(latestTimestamp, 1);
    const start = shiftWallMinute(latestTimestamp, -29);
    const query = new URLSearchParams({ instrument, start, end, tf: '1' });
    const response = await fetchImpl(`${apiBase}/v7/market-data/bars?${query}`, { signal });
    const data = await parseJsonResponse(response);
    if (!response.ok || !Array.isArray(data.bars) || data.bars.length === 0) {
      throw new Error(data.error || 'V7 feed verification returned no bars.');
    }
    return Object.freeze({
      instrument,
      returnedBars: data.bars.length,
      requestedStart: start,
      requestedEnd: end,
    });
  }

  return Object.freeze({
    request,
    runJob,
    watchJob,
    verifyV7Read,
    apiBase,
  });
}
