import { timeframeToString } from '../../config.js';
import * as store from '../../data/bar-store.js';
import { buildCePrice } from '../../price-utils.js';
import { getExtendBarsForTimeframe, getExtendSeconds } from '../../pda/pda-extend.js';
import { normalizeFibLevels } from '../../pda/fib-levels.js';
import { formatPdaSourceBadge } from '../../pda/pda-source-format.js';
import { getPdaType } from '../../pda/pda-types.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
  section,
} from './render-utils.js';

const DEFAULT_LINE_EXTEND_BARS = 8;

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
  return getExtendBarsForTimeframe(annotation, fallback, store.getCurrentTimeframe());
}

function formatExtendBars(annotation) {
  const bars = getExtendBars(annotation);
  return Number.isInteger(bars) ? String(bars) : bars.toFixed(2).replace(/\.?0+$/, '');
}

function formatExtendDuration(annotation) {
  const seconds = getExtendSeconds(annotation, getExtendBars(annotation), store.getCurrentTimeframe());
  if (!seconds) return '0m';
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function getShowLabel(annotation) {
  if (annotation.type === 'fib') {
    return annotation.display?.showLabel ?? annotation.display?.showLabels ?? annotation.showLabel ?? true;
  }
  return annotation.display?.showLabel ?? annotation.showLabel ?? true;
}

function getCeInfo(annotation) {
  if (annotation.ce && Number.isFinite(Number(annotation.ce.price))) return annotation.ce;
  return buildCePrice(annotation.topPrice ?? annotation.priceHigh, annotation.bottomPrice ?? annotation.priceLow);
}

export function getPointSetReference(type, points) {
  const prices = points.map((point) => Number(point.price)).filter(Number.isFinite);
  if (!prices.length) return null;
  return type === 'eqh' ? Math.max(...prices) : Math.min(...prices);
}

export function getPointSetContext(annotation, points) {
  const pdaType = getPdaType(annotation.type);
  return `${timeframeToString(store.getCurrentTimeframe())} ${pdaType?.label || annotation.type.toUpperCase()} (${points.length})`;
}

function renderEditFields(annotation) {
  return section(
    'Edit',
    [
      `<button class="inspector-secondary" data-inspector-action="pda-link-active-setup" type="button">Link PDA To Active Setup</button>`,
      controlField(
        `Extend (${timeframeToString(store.getCurrentTimeframe())} bars)`,
        `<input class="inspector-input" data-inspector-action="extend-bars" type="number" min="0" step="0.25" value="${formatExtendBars(annotation)}" placeholder="0" />`
      ),
      field('Extend Duration', formatExtendDuration(annotation)),
      controlField(
        'Note',
        `<textarea class="inspector-textarea" data-inspector-action="note" rows="4" placeholder="Add note">${escapeHtml(annotation.note || '')}</textarea>`
      ),
      `<button class="inspector-danger" data-inspector-action="delete" type="button">Delete PDA</button>`,
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
  const fields = [
    field('Price', formatNumber(annotation.price)),
    field('Anchor', formatTime(annotation.canonicalTimestamp ?? annotation.timestamp ?? annotation.anchorTime)),
  ];

  if (annotation.type === 'wick-ce') {
    fields.push(
      field('Timeframe', annotation.timeframe || '—'),
      field('Wick Side', annotation.wickSide || '—'),
      field('Wick Points', formatNumber(annotation.wickPoints)),
      field('High', formatNumber(annotation.high)),
      field('Low', formatNumber(annotation.low)),
      field('Body High', formatNumber(annotation.bodyHigh)),
      field('Body Low', formatNumber(annotation.bodyLow))
    );
  } else {
    fields.push(renderValidation(annotation));
  }

  return section('Point', fields.join(''));
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

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = Number(annotation.start?.price);
  const endPrice = Number(annotation.end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;
  return endPrice - (endPrice - startPrice) * Number(levelValue);
}

function renderFibFields(annotation) {
  const levels = normalizeFibLevels(annotation.levels);
  const rows = levels
    .map(
      (level, index) => {
        const price = getFibLevelPrice(annotation, level.value);
        return `
          <label class="inspector-fib-level-row">
            <input data-inspector-action="fib-level-visible" data-fib-level-index="${index}" type="checkbox" ${level.visible !== false ? 'checked' : ''} />
            <input class="inspector-input inspector-fib-level-value" data-inspector-action="fib-level-value" data-fib-level-index="${index}" type="number" step="0.001" value="${escapeHtml(level.value)}" />
            <input class="inspector-fib-level-color" data-inspector-action="fib-level-color" data-fib-level-index="${index}" type="color" value="${escapeHtml(level.color || '#60636f')}" title="Fib level color" />
            <span class="inspector-fib-level-price">${escapeHtml(formatNumber(price))}</span>
          </label>
        `;
      }
    )
    .join('');
  const visibleCount = levels.filter((level) => level.visible !== false).length;
  const readOnlyRows = levels
    .filter((level) => level.visible !== false)
    .map(
      (level) => `
        <div class="inspector-point-row">
          <span>${escapeHtml(level.value)}</span>
          <span>${escapeHtml(formatNumber(getFibLevelPrice(annotation, level.value)))}</span>
          <span>${escapeHtml(level.color || '—')}</span>
        </div>
      `
    )
    .join('');

  return section(
    'Fib',
    [
      field('Direction', annotation.direction || '—'),
      field('Start', `${formatTime(annotation.start?.timestamp ?? annotation.start?.time)} @ ${formatNumber(annotation.start?.price)}`),
      field('End', `${formatTime(annotation.end?.timestamp ?? annotation.end?.time)} @ ${formatNumber(annotation.end?.price)}`),
      field('Visible Levels', visibleCount),
      `<div class="inspector-fib-level-grid">${rows || '<div class="inspector-empty">No levels</div>'}</div>`,
      `<button class="inspector-secondary" data-inspector-action="fib-level-reset" type="button">Reset Levels</button>`,
      `<details class="inspector-fib-level-summary">
        <summary>Visible level prices</summary>
        <div class="inspector-point-list">${readOnlyRows || '<div class="inspector-empty">No visible levels</div>'}</div>
      </details>`,
    ].join('')
  );
}

export function renderAnnotationPanel(annotation, archiveActionsHtml = '') {
  const pdaType = getPdaType(annotation.type);
  const shape = pdaType?.shape || 'unknown';
  const common = section(
    'PDA',
    [
      field('Selected', `● ${pdaType?.label || annotation.type}`),
      field('Type', pdaType?.label || annotation.type),
      field('Shape', shape),
      field('Source', annotation.source || 'manual'),
      field('Source Chart', formatPdaSourceBadge(annotation) || '—'),
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
  if (shape === 'fib-retracement') detail = renderFibFields(annotation);

  return common + detail + renderEditFields(annotation) + renderDisplaySettings(annotation) + archiveActionsHtml;
}
