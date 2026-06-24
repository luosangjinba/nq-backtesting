import { API_BASE } from '../config.js';

export const WORKSPACE_REQUEST_HEADER = 'X-V4-Workspace-Request';
export const WORKSPACE_REQUEST_VALUE = 'workspace';

function getFetch(fetchImpl = null) {
  const candidate = typeof fetchImpl === 'function' ? fetchImpl : globalThis.fetch;
  return typeof candidate === 'function' ? candidate : null;
}

function encodeQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Workspace request failed with status ${response.status}`);
  }
  return payload;
}

export async function getWorkspaceDocument({ domain, instrument = null, fetchImpl = null } = {}) {
  const activeFetch = getFetch(fetchImpl);
  if (!activeFetch) throw new Error('Fetch is not available');
  const query = encodeQuery({ domain, instrument });
  const response = await activeFetch(`${API_BASE}/v4/workspace?${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return readJsonResponse(response);
}

export async function putWorkspaceDocument({
  domain,
  instrument = null,
  version = 1,
  payload = {},
  fetchImpl = null,
} = {}) {
  const activeFetch = getFetch(fetchImpl);
  if (!activeFetch) throw new Error('Fetch is not available');
  const response = await activeFetch(`${API_BASE}/v4/workspace`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [WORKSPACE_REQUEST_HEADER]: WORKSPACE_REQUEST_VALUE,
    },
    body: JSON.stringify({
      domain,
      instrument,
      version,
      payload,
    }),
  });
  return readJsonResponse(response);
}
