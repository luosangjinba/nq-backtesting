export function escapeHtml(value) {
  return String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
}

export function formatTime(value) {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(Number(value))) return String(value);
  const date = new Date(Number(value) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function formatDateTimeMs(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function field(label, value) {
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">${escapeHtml(label)}</div>
      <div class="inspector-field-value">${escapeHtml(value)}</div>
    </div>
  `;
}

export function controlField(label, controlHtml) {
  return `
    <label class="inspector-field inspector-control-field">
      <span class="inspector-field-label">${escapeHtml(label)}</span>
      <span class="inspector-field-value">${controlHtml}</span>
    </label>
  `;
}

export function section(title, content) {
  return `
    <section class="inspector-section">
      <div class="inspector-section-title">${escapeHtml(title)}</div>
      ${content}
    </section>
  `;
}
