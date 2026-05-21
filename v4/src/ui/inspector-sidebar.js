// Hideable right-side inspector for selected chart objects. First pass supports PDA.

import * as bus from '../event-bus.js';
import { clearSelection, getSelectedPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { deleteAnnotation, getAnnotationById, updateAnnotation } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import { timeframeToString } from '../config.js';
import * as store from '../data/bar-store.js';

let sidebarEl = null;
let bodyEl = null;
const DEFAULT_LINE_EXTEND_BARS = 8;

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

function controlField(label, controlHtml) {
  return `
    <label class="inspector-field inspector-control-field">
      <span class="inspector-field-label">${label}</span>
      <span class="inspector-field-value">${controlHtml}</span>
    </label>
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

function getExtendBars(annotation) {
  const pdaType = getPdaType(annotation.type);
  const fallback = pdaType?.shape === 'liquidity-line' ? DEFAULT_LINE_EXTEND_BARS : 0;
  const value = annotation.display?.extendBars ?? annotation.extendBars ?? fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function getShowLabel(annotation) {
  return annotation.display?.showLabel ?? annotation.showLabel ?? true;
}

function getPointSetReference(type, points) {
  const prices = points.map((point) => Number(point.price)).filter(Number.isFinite);
  if (!prices.length) return null;
  return type === 'eqh' ? Math.max(...prices) : Math.min(...prices);
}

function getPointSetContext(annotation, points) {
  const pdaType = getPdaType(annotation.type);
  return `${timeframeToString(store.getCurrentTimeframe())} ${pdaType?.label || annotation.type.toUpperCase()} (${points.length})`;
}

function renderEditFields(annotation) {
  return section(
    'Edit',
    [
      controlField(
        'Extend',
        `<input class="inspector-input" data-inspector-action="extend-bars" type="number" min="0" step="1" value="${getExtendBars(annotation)}" placeholder="0" />`
      ),
      controlField(
        'Note',
        `<textarea class="inspector-textarea" data-inspector-action="note" rows="4" placeholder="Add note">${annotation.note || ''}</textarea>`
      ),
      `<button class="inspector-danger" data-inspector-action="delete" type="button">Delete PDA</button>`,
    ].join('')
  );
}

function renderArchiveActions() {
  return section(
    'Archive',
    [
      `<button class="inspector-secondary" data-inspector-action="export-pda" type="button">Export PDA JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="import-pda" type="button">Import PDA JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="clear-saved" type="button">Clear Saved PDA</button>`,
      `<input class="inspector-file-input" data-inspector-action="import-pda-file" type="file" accept="application/json,.json" />`,
    ].join('')
  );
}

function renderDisplaySettings(annotation) {
  return section(
    'Display',
    `
      <label class="inspector-toggle">
        <input data-inspector-action="toggle-current-label" type="checkbox" ${getShowLabel(annotation) ? 'checked' : ''} />
        <span>Show current PDA label</span>
      </label>
    `
  );
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
      controlField(
        'CE',
        `<label class="inspector-toggle inspector-toggle-inline">
          <input data-inspector-action="toggle-ce" type="checkbox" ${getShowCe(annotation) ? 'checked' : ''} />
          <span>Show CE</span>
        </label>`
      ),
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
          <button class="inspector-mini-btn" data-inspector-action="remove-point" data-point-index="${index}" type="button">Remove</button>
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
      field('Selected', `● ${pdaType?.label || annotation.type}`),
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

  bodyEl.innerHTML =
    common + detail + renderEditFields(annotation) + renderDisplaySettings(annotation) + renderArchiveActions();
}

function renderEmpty() {
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA on the chart.
    </div>
    ${renderArchiveActions()}
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
  document.getElementById('workspace')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', closeSidebar);
  sidebarEl.addEventListener('change', handleInspectorChange);
  sidebarEl.addEventListener('click', handleInspectorClick);
  renderEmpty();
}

function getCurrentAnnotation() {
  const selection = getSelectedPda();
  return selection ? getAnnotationById(selection.id) : null;
}

function handleInspectorChange(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'import-pda-file') {
    importPdaArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'toggle-current-label') {
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showLabel: e.target.checked,
      },
    });
    return;
  }

  if (action === 'extend-bars') {
    const parsed = Number(e.target.value);
    const extendBars = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        extendBars,
      },
    });
    return;
  }

  if (action === 'note') {
    updateAnnotation(annotation.id, { note: e.target.value });
    return;
  }

  if (action === 'toggle-ce') {
    updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showCe: e.target.checked,
      },
    });
  }
}

function handleInspectorClick(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'export-pda') {
    exportPdaArchive();
    return;
  }

  if (action === 'import-pda') {
    bodyEl?.querySelector('[data-inspector-action="import-pda-file"]')?.click();
    return;
  }

  if (action === 'clear-saved') {
    clearSavedAnnotations();
    return;
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'delete') {
    deleteAnnotation(annotation.id);
    clearSelection();
    renderEmpty();
    return;
  }

  if (action === 'remove-point') {
    removePointFromSet(annotation, Number(e.target.dataset.pointIndex));
  }
}

function removePointFromSet(annotation, pointIndex) {
  if (!Array.isArray(annotation.points) || !Number.isInteger(pointIndex)) return;
  const nextPoints = annotation.points.filter((_, index) => index !== pointIndex);

  if (nextPoints.length < 2) {
    deleteAnnotation(annotation.id);
    clearSelection();
    renderEmpty();
    bus.emit('status:update', {
      text: `${getPdaType(annotation.type)?.label || annotation.type.toUpperCase()} 少于 2 个点，集合已删除`,
      isError: false,
    });
    return;
  }

  const referencePrice = getPointSetReference(annotation.type, nextPoints);
  updateAnnotation(annotation.id, {
    points: nextPoints,
    referencePrice,
    price: referencePrice,
    contexts: [getPointSetContext(annotation, nextPoints)],
  });
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
