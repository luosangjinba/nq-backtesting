import { abortableDelay, abortReason } from '../browser-async-contract/public.js';

const POLL_INTERVAL_MS = 750;

async function parseResponse(response) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(`Database service returned non-JSON HTTP ${response.status}.`);
    error.code = 'DATABASE_RESPONSE_NOT_JSON';
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.error?.message || `Database service failed with HTTP ${response.status}.`);
    error.code = payload.error?.code || 'DATABASE_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return payload;
}

/** Browser client for same-origin authenticated database bootstrap routes. */
export function createDatabaseImportClient(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const xhrFactory = options.xhrFactory ?? (() => new XMLHttpRequest());
  const apiBase = options.apiBase ?? '';
  const setTimer = options.setTimer ?? globalThis.setTimeout.bind(globalThis);
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout.bind(globalThis);
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  if (typeof fetchImpl !== 'function') throw new TypeError('Database import client requires fetch.');

  async function jsonRequest(path, { body, method = 'GET', signal } = {}) {
    const response = await fetchImpl(`${apiBase}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      method,
      signal,
    });
    return parseResponse(response);
  }

  function upload(file, { onProgress = () => {}, signal } = {}) {
    if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size)) {
      return Promise.reject(new TypeError('Select one CSV or DuckDB file.'));
    }
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    return new Promise((resolve, reject) => {
      const xhr = xhrFactory();
      let settled = false;
      const onUploadProgress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded, event.total);
      };
      const cleanup = () => {
        signal?.removeEventListener('abort', onCallerAbort);
        xhr.upload.removeEventListener?.('progress', onUploadProgress);
        xhr.removeEventListener?.('load', onLoad);
        xhr.removeEventListener?.('error', onError);
        xhr.removeEventListener?.('abort', onXhrAbort);
      };
      const settle = (complete, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        complete(value);
      };
      const onLoad = () => {
        const payload = xhr.response && typeof xhr.response === 'object' ? xhr.response : {};
        if (xhr.status >= 200 && xhr.status < 300) settle(resolve, payload);
        else {
          const error = new Error(payload.error?.message || `Upload failed with HTTP ${xhr.status}.`);
          error.code = payload.error?.code || 'DATABASE_UPLOAD_FAILED';
          error.status = xhr.status;
          settle(reject, error);
        }
      };
      const onError = () => settle(reject, new Error('Database upload connection failed.'));
      const onXhrAbort = () => settle(reject, abortReason(signal));
      const onCallerAbort = () => {
        try {
          xhr.abort();
        } catch {
          // The abort reason below remains authoritative even if the XHR port throws.
        }
        settle(reject, abortReason(signal));
      };
      try {
        xhr.open('PUT', `${apiBase}/v7/database/import/upload`);
        xhr.responseType = 'json';
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('X-Replay-Lab-File-Name', encodeURIComponent(file.name));
        xhr.upload.addEventListener('progress', onUploadProgress);
        xhr.addEventListener('load', onLoad);
        xhr.addEventListener('error', onError);
        xhr.addEventListener('abort', onXhrAbort);
        signal?.addEventListener('abort', onCallerAbort, { once: true });
        if (signal?.aborted) onCallerAbort();
        else xhr.send(file);
      } catch (error) {
        settle(reject, error);
      }
    });
  }

  async function watch(uploadId, { onStatus = () => {}, signal } = {}) {
    while (true) {
      await abortableDelay(pollIntervalMs, signal, setTimer, clearTimer);
      const job = await jsonRequest(
        `/v7/database/import/status?uploadId=${encodeURIComponent(uploadId)}`,
        { signal },
      );
      onStatus(job);
      if (job.state === 'preparing') continue;
      return job;
    }
  }

  return Object.freeze({
    health: (signal) => jsonRequest('/v7/database/health', { signal }),
    current: (signal) => jsonRequest('/v7/database/import/current', { signal }),
    upload,
    async prepare(uploadId, options = {}) {
      const started = await jsonRequest('/v7/database/import/prepare', {
        body: { uploadId },
        method: 'POST',
        signal: options.signal,
      });
      options.onStatus?.(started);
      return watch(uploadId, options);
    },
    activate: (uploadId, confirmation, signal) => jsonRequest('/v7/database/import/activate', {
      body: { confirmation, uploadId },
      method: 'POST',
      signal,
    }),
    discard: (uploadId, signal) => jsonRequest('/v7/database/import/discard', {
      body: { uploadId },
      method: 'POST',
      signal,
    }),
    watch,
  });
}
