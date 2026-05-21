// Hideable right-side inspector for selected chart objects. First pass supports PDA.

import * as bus from '../event-bus.js';
import { clearSelection, getSelectedPda } from '../pda/pda-selection.js';
import { getAnnotationById } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';

let sidebarEl = null;
let bodyEl = null;

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
}

function formatTime(value) {
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

function formatDateTimeMs(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function field(label, value) {
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">${label}</div>
      <div class="inspector-field-value">${value ?? '—'}</div>
    </div>
  `;
}

function section(title, content) {
  return `
    <section class="inspector-section">
      <div class="inspector-section-title">${title}</div>
      ${content}
    </section>
  `;
}

function renderContexts(annotation) {
  const contexts = Array.isArray(annotation.contexts) ? annotation.contexts : [];
  if (!contexts.length) return field('Contexts', '—');
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">Contexts</div>
      <div class="inspector-tags">
        ${contexts.map((context) => `<span>${context}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderValidation(annotation) {
  const validation = annotation.validation;
  if (!validation?.checked) return '';
  return field('Validation', validation.valid ? 'Valid swing' : validation.message || 'Warning');
}

function getSpread(points = []) {
  const prices = points.map((point) => Number(point.price)).filter(Number.isFinite);
  if (prices.length < 2) return null;
  return Math.max(...prices) - Math.min(...prices);
}

function renderPointFields(annotation) {
  return section(
    'Point',
    [
      field('Price', formatNumber(annotation.price)),
      field('Anchor', formatTime(annotation.canonicalTimestamp ?? annotation.timestamp ?? annotation.anchorTime)),
      renderValidation(annotation),
    ].join('')
  );
}

function renderRangeFields(annotation) {
  return section(
    'Range',
    [
      field('Top', formatNumber(annotation.topPrice ?? annotation.priceHigh)),
      field('Bottom', formatNumber(annotation.bottomPrice ?? annotation.priceLow)),
      field('Start', formatTime(annotation.startTimeTimestamp ?? annotation.startTime)),
      field('End', formatTime(annotation.endTimeTimestamp ?? annotation.endTime)),
      field('Direction', annotation.direction || '—'),
    ].join('')
  );
}

function renderPointSetFields(annotation) {
  const points = Array.isArray(annotation.points) ? annotation.points : [];
  const pointRows = points
    .map(
      (point, index) => `
        <div class="inspector-point-row">
          <span>${index + 1}</span>
          <span>${formatTime(point.canonicalTimestamp ?? point.timestamp ?? point.anchorTime)}</span>
          <span>${formatNumber(point.price)}</span>
        </div>
      `
    )
    .join('');

  return section(
    'Point Set',
    [
      field('Reference', formatNumber(annotation.referencePrice ?? annotation.price)),
      field('Spread', formatNumber(getSpread(points))),
      field('Points', points.length),
      `<div class="inspector-point-list">${pointRows || '<div class="inspector-empty">No points</div>'}</div>`,
    ].join('')
  );
}

function renderAnnotation(annotation) {
  const pdaType = getPdaType(annotation.type);
  const shape = pdaType?.shape || 'unknown';
  const common = section(
    'PDA',
    [
      field('Type', pdaType?.label || annotation.type),
      field('Shape', shape),
      field('Source', annotation.source || 'manual'),
      field('ID', `<span class="inspector-id">${annotation.id}</span>`),
      renderContexts(annotation),
      field('Created', formatDateTimeMs(annotation.createdAt)),
      field('Updated', formatDateTimeMs(annotation.updatedAt)),
    ].join('')
  );

  let detail = '';
  if (shape === 'liquidity-line') detail = renderPointFields(annotation);
  if (shape === 'range') detail = renderRangeFields(annotation);
  if (shape === 'point-set') detail = renderPointSetFields(annotation);

  bodyEl.innerHTML = common + detail;
}

function renderEmpty() {
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA on the chart.
    </div>
  `;
}

function openSidebar() {
  sidebarEl?.classList.add('open');
}

function closeSidebar() {
  sidebarEl?.classList.remove('open');
}

function refreshSelection() {
  const selection = getSelectedPda();
  if (!selection) {
    renderEmpty();
    return;
  }

  const annotation = getAnnotationById(selection.id);
  if (!annotation) {
    renderEmpty();
    return;
  }

  renderAnnotation(annotation);
}

function createSidebar() {
  sidebarEl = document.createElement('aside');
  sidebarEl.id = 'inspector-sidebar';
  sidebarEl.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-title">Inspector</div>
      <button class="inspector-close" type="button" title="Close inspector">X</button>
    </div>
    <div class="inspector-body"></div>
  `;
  document.getElementById('app')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', closeSidebar);
  renderEmpty();
}

export function initInspectorSidebar() {
  createSidebar();
  bus.on('pda:selected', ({ annotation }) => {
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', renderEmpty);
  bus.on('pda:changed', refreshSelection);
  bus.on('bars:cleared', () => {
    clearSelection();
    renderEmpty();
  });
}
