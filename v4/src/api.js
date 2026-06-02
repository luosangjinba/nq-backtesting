// 集中式 API 服务层 — 所有后端调用经此模块

import { API_BASE } from './config.js';

export async function fetchBars(start, end, tf = 1, instrument = 'NQ') {
  const params = new URLSearchParams({ start, end, tf: String(tf), instrument });
  const res = await fetch(`${API_BASE}/v4/bars?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchPrice(timestamp) {
  const res = await fetch(`${API_BASE}/v4/price?timestamp=${timestamp}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchEconomicEvents({
  dateFrom,
  dateTo,
  currency = 'USD',
  impact = '',
  includeHolidays = true,
} = {}) {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    currency,
    include_holidays: includeHolidays ? 'true' : 'false',
  });
  if (impact) params.set('impact', impact);
  const res = await fetch(`${API_BASE}/v4/economic_events?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/v4/health`);
    return res.ok;
  } catch {
    return false;
  }
}
