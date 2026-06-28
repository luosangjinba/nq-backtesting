export const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
export const MAINTENANCE_REQUEST_HEADER = 'data-maintenance';

export function resolveApiBase(location = window.location) {
  const hostname = location.hostname || '127.0.0.1';
  const isLocalDev = hostname === '127.0.0.1' || hostname === 'localhost';
  if (!isLocalDev) {
    return '';
  }
  const protocol = location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}:8766`;
}

export function getMaintenanceApiUrl(location = window.location) {
  return `${resolveApiBase(location)}/v4/data_maintenance/run`;
}

export async function parseMaintenanceResponse(response) {
  const text = await response.text();
  if (!text) return { data: {}, rawText: '' };
  try {
    return { data: JSON.parse(text), rawText: text };
  } catch (error) {
    return {
      data: {
        ok: false,
        returncode: response.status,
        error: `Response was not JSON: ${error.message}`,
        parseError: `Response was not JSON: ${error.message}`,
        output: text,
      },
      rawText: text,
    };
  }
}

export function formatRequestFailure(payload, details = {}) {
  return [
    `> ${payload?.action || 'unknown'}`,
    '',
    'Request failed',
    '--------------',
    `URL: ${details.url || getMaintenanceApiUrl()}`,
    `HTTP status: ${details.status || 'no response'}`,
    details.error ? `Error: ${details.error}` : '',
    details.body ? `Response body:\n${details.body}` : '',
  ].filter(Boolean).join('\n');
}

export async function runMaintenanceRequest(payload, options) {
  const {
    append,
    formatResult,
    renderEnvironmentStatus,
    setState,
    setValue,
    apiUrl = getMaintenanceApiUrl(),
    timeoutMs = REQUEST_TIMEOUT_MS,
    origin = window.location.origin,
  } = options;

  setState('running', 'warn');
  append(`> ${payload.action}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-V4-Maintenance-Request': MAINTENANCE_REQUEST_HEADER,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const { data, rawText } = await parseMaintenanceResponse(response);
    const header = `returncode=${data.returncode ?? response.status} ok=${Boolean(data.ok)}`;
    if (Array.isArray(data.environment)) {
      renderEnvironmentStatus(data.environment);
      if (payload.action === 'environment_write') setValue('envValue', '');
    }
    append(formatResult(payload, data, response.status, header, apiUrl));
    setState(data.ok ? 'ok' : 'failed', data.ok ? 'ok' : 'fail');
    if (!response.ok && !rawText) {
      append(formatRequestFailure(payload, { url: apiUrl, status: response.status, error: response.statusText }));
    }
    return data;
  } catch (error) {
    append(error.name === 'AbortError'
      ? formatRequestFailure(payload, {
          url: apiUrl,
          status: 'timeout',
          error: `request timed out after ${Math.round(timeoutMs / 1000)} seconds. The backend may still be finishing the action; use Status/Verify or restart the API if it stays busy.`,
        })
      : formatRequestFailure(payload, {
          url: apiUrl,
          status: 'network/fetch error',
          error: `${error.name || 'Error'}: ${error.message}. Check that the API is reachable from this browser and that V4_ALLOWED_WEB_ORIGINS includes ${origin}.`,
        }));
    setState('failed', 'fail');
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
