// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import { clearSelection as clearPdaSelection, getSelectedPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { deleteAnnotation, getAnnotationById, updateAnnotation } from '../pda/pda-store.js';
import { getPdaType } from '../pda/pda-types.js';
import { timeframeToString } from '../config.js';
import { buildCePrice } from '../price-utils.js';
import { clearSegmentSelection, getSelectedSegment } from '../segment/segment-selection.js';
import {
  deleteSegment,
  getSegmentById,
  removePdaResponse,
  setSegmentIsolated,
  updatePdaResponse,
  updateSegment,
} from '../segment/segment-store.js';
import * as store from '../data/bar-store.js';

let sidebarEl = null;
let bodyEl = null;
const DEFAULT_LINE_EXTEND_BARS = 8;

function escapeHtml(value) {
  return String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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
      <div class="inspector-field-label">${escapeHtml(label)}</div>
      <div class="inspector-field-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function controlField(label, controlHtml) {
  return `
    <label class="inspector-field inspector-control-field">
      <span class="inspector-field-label">${escapeHtml(label)}</span>
      <span class="inspector-field-value">${controlHtml}</span>
    </label>
  `;
}

function section(title, content) {
  return `
    <section class="inspector-section">
      <div class="inspector-section-title">${escapeHtml(title)}</div>
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
        ${contexts.map((context) => `<span>${escapeHtml(context)}</span>`).join('')}
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

function getSegmentShowLabel(segment) {
  return segment.display?.showLabel ?? segment.showLabel ?? true;
}

function getResponseDisplayMode(response) {
  return response.displayMode || (response.selected === false ? 'normal' : 'highlight');
}

function getCeInfo(annotation) {
  if (annotation.ce && Number.isFinite(Number(annotation.ce.price))) return annotation.ce;
  return buildCePrice(annotation.topPrice ?? annotation.priceHigh, annotation.bottomPrice ?? annotation.priceLow);
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
        `<textarea class="inspector-textarea" data-inspector-action="note" rows="4" placeholder="Add note">${escapeHtml(annotation.note || '')}</textarea>`
      ),
      `<button class="inspector-danger" data-inspector-action="delete" type="button">Delete PDA</button>`,
    ].join('')
  );
}

function renderArchiveActions() {
  return section(
    'Archive',
    [
      `<button class="inspector-secondary" data-inspector-action="export-review" type="button">Export Review JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="import-review" type="button">Import Review JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="export-pda" type="button">Export PDA JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="import-pda" type="button">Import PDA JSON</button>`,
      `<button class="inspector-secondary" data-inspector-action="clear-saved" type="button">Clear Saved PDA</button>`,
      `<input class="inspector-file-input" data-inspector-action="import-review-file" type="file" accept="application/json,.json" />`,
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
  const ce = getCeInfo(annotation);
  return section(
    'Range',
    [
      field('Top', formatNumber(annotation.topPrice ?? annotation.priceHigh)),
      field('Bottom', formatNumber(annotation.bottomPrice ?? annotation.priceLow)),
      field('CE', ce ? `${formatNumber(ce.price)} (${ce.rounding || 'nearest'} tick)` : '—'),
      field('Raw CE', ce ? formatNumber(ce.raw) : '—'),
      field('Start', formatTime(annotation.startTimeTimestamp ?? annotation.startTime)),
      field('End', formatTime(annotation.endTimeTimestamp ?? annotation.endTime)),
      field('Direction', annotation.direction || '—'),
      controlField(
        'CE Visible',
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
          <span>${escapeHtml(index + 1)}</span>
          <span>${escapeHtml(formatTime(point.canonicalTimestamp ?? point.timestamp ?? point.anchorTime))}</span>
          <span>${escapeHtml(formatNumber(point.price))}</span>
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
      field('ID', annotation.id),
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

function formatTags(tags = []) {
  return Array.isArray(tags) && tags.length ? tags.join(', ') : '';
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function renderSegmentPoint(title, point) {
  return section(
    title,
    [
      field('Kind', point?.kind || '—'),
      field('Time', formatTime(point?.timestamp ?? point?.time)),
      field('Price', formatNumber(point?.price)),
    ].join('')
  );
}

function renderPdaResponses(segment) {
  const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
  const rows = responses
    .map((response, index) => {
      const annotation = getAnnotationById(response.pdaId);
      const pdaType = annotation ? getPdaType(annotation.type) : null;
      const label = pdaType?.label || response.pdaType?.toUpperCase() || 'PDA';
      return `
        <div class="inspector-response-row">
          <span>${escapeHtml(index + 1)}</span>
          <span>${escapeHtml(label)}</span>
          <select class="inspector-input inspector-mini-select" data-inspector-action="segment-response-relation" data-pda-id="${escapeHtml(response.pdaId)}">
            ${['respected', 'swept', 'approached', 'rejected', 'delivered-through']
              .map(
                (relation) =>
                  `<option value="${relation}" ${response.relation === relation ? 'selected' : ''}>${relation}</option>`
              )
              .join('')}
          </select>
          <select class="inspector-input inspector-mini-select" data-inspector-action="segment-response-display-mode" data-pda-id="${escapeHtml(response.pdaId)}">
            ${['highlight', 'normal', 'hidden']
              .map(
                (mode) =>
                  `<option value="${mode}" ${getResponseDisplayMode(response) === mode ? 'selected' : ''}>${mode}</option>`
              )
              .join('')}
          </select>
          <input class="inspector-input" data-inspector-action="segment-response-note" data-pda-id="${escapeHtml(response.pdaId)}" type="text" value="${escapeHtml(response.note || '')}" placeholder="Response note" />
          <button class="inspector-mini-btn" data-inspector-action="segment-response-remove" data-pda-id="${escapeHtml(response.pdaId)}" type="button">Remove</button>
        </div>
      `;
    })
    .join('');

  return section(
    'PDA Responses',
    rows ? `<div class="inspector-point-list">${rows}</div>` : '<div class="inspector-empty">No linked PDA</div>'
  );
}

function renderSegment(segment) {
  const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
  const common = section(
    'Market Segment',
    [
      field('Selected', `● ${segment.timeframe || '1H'} ${String(segment.direction || 'flat').toUpperCase()} LEG`),
      field('Direction', segment.direction || '—'),
      field('Timeframe', segment.timeframe || '1H'),
      field('Source', segment.source || 'manual'),
      field('ID', segment.id),
      field('PDA Responses', responses.length),
      field('Created', formatDateTimeMs(segment.createdAt)),
      field('Updated', formatDateTimeMs(segment.updatedAt)),
    ].join('')
  );
  const edit = section(
    'Review Notes',
    [
      controlField(
        'Narrative',
        `<textarea class="inspector-textarea" data-inspector-action="segment-narrative" rows="5" placeholder="Why did this leg move this way?">${escapeHtml(segment.narrative || '')}</textarea>`
      ),
      controlField(
        'Tags',
        `<input class="inspector-input" data-inspector-action="segment-tags" type="text" value="${escapeHtml(formatTags(segment.tags))}" placeholder="accumulation, expansion" />`
      ),
    ].join('')
  );
  const display = section(
    'Display',
    `
      <label class="inspector-toggle">
        <input data-inspector-action="segment-toggle-label" type="checkbox" ${getSegmentShowLabel(segment) ? 'checked' : ''} />
        <span>Show segment label</span>
      </label>
      <label class="inspector-toggle">
        <input data-inspector-action="segment-toggle-isolate" type="checkbox" ${segment.display?.isolate ? 'checked' : ''} />
        <span>Isolate segment</span>
      </label>
      ${controlField(
        'Segment in isolate',
        `<select class="inspector-input" data-inspector-action="segment-isolate-display-mode">
          ${['highlight', 'normal', 'hidden']
            .map(
              (mode) =>
                `<option value="${mode}" ${(segment.display?.isolateDisplayMode || 'highlight') === mode ? 'selected' : ''}>${mode}</option>`
            )
            .join('')}
        </select>`
      )}
      <button class="inspector-danger" data-inspector-action="segment-delete" type="button">Delete Segment</button>
    `
  );

  bodyEl.innerHTML =
    common +
    renderSegmentPoint('Start', segment.start) +
    renderSegmentPoint('End', segment.end) +
    renderPdaResponses(segment) +
    edit +
    display;
}

function renderEmpty() {
  bodyEl.innerHTML = `
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
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
  const pdaSelection = getSelectedPda();
  if (pdaSelection) {
    const annotation = getAnnotationById(pdaSelection.id);
    if (annotation) {
      renderAnnotation(annotation);
      return;
    }
  }

  const segmentSelection = getSelectedSegment();
  if (segmentSelection) {
    const segment = getSegmentById(segmentSelection.id);
    if (segment) {
      renderSegment(segment);
      return;
    }
  }

  renderEmpty();
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

function getCurrentSegment() {
  const selection = getSelectedSegment();
  return selection ? getSegmentById(selection.id) : null;
}

function handleInspectorChange(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'import-pda-file') {
    importPdaArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'import-review-file') {
    importReviewArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'segment-toggle-label') {
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          showLabel: e.target.checked,
        },
      });
      return;
    }

    if (action === 'segment-toggle-isolate') {
      setSegmentIsolated(segment.id, e.target.checked);
      return;
    }

    if (action === 'segment-isolate-display-mode') {
      updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolateDisplayMode: e.target.value,
        },
      });
      return;
    }

    if (action === 'segment-narrative') {
      updateSegment(segment.id, { narrative: e.target.value });
      return;
    }

    if (action === 'segment-tags') {
      updateSegment(segment.id, { tags: parseTags(e.target.value) });
      return;
    }

    if (action === 'segment-response-relation') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, { relation: e.target.value });
      return;
    }

    if (action === 'segment-response-display-mode') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, {
        displayMode: e.target.value,
        selected: e.target.value === 'highlight',
      });
      return;
    }

    if (action === 'segment-response-note') {
      updatePdaResponse(segment.id, e.target.dataset.pdaId, { note: e.target.value });
      return;
    }
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

  if (action === 'export-review') {
    exportReviewArchive();
    return;
  }

  if (action === 'import-pda') {
    bodyEl?.querySelector('[data-inspector-action="import-pda-file"]')?.click();
    return;
  }

  if (action === 'import-review') {
    bodyEl?.querySelector('[data-inspector-action="import-review-file"]')?.click();
    return;
  }

  if (action === 'clear-saved') {
    clearSavedAnnotations();
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'segment-delete') {
      deleteSegment(segment.id);
      clearSegmentSelection();
      renderEmpty();
      return;
    }

    if (action === 'segment-response-remove') {
      removePdaResponse(segment.id, e.target.dataset.pdaId);
      return;
    }
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'delete') {
    deleteAnnotation(annotation.id);
    clearPdaSelection();
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
    clearPdaSelection();
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
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('bars:cleared', () => {
    clearPdaSelection();
    clearSegmentSelection();
    renderEmpty();
  });
}
