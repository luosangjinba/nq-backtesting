import { SMT_DIRECTIONS, SMT_TYPES } from '../../smt/smt-store.js';
import { escapeHtml, formatNumber, formatTime, section } from './render-utils.js';

function getTitle(record) {
  const direction = record.direction === SMT_DIRECTIONS.BULLISH ? 'Bullish' : 'Bearish';
  const type = record.type === SMT_TYPES.FVG ? 'FVG SMT' : 'Liquidity SMT';
  return `${direction} ${type}`;
}

function getRangeLabel(record) {
  if (record.type === SMT_TYPES.LIQUIDITY) {
    return `${formatTime(record.leftTimestamp)} - ${formatTime(record.rightTimestamp)}`;
  }
  return `${formatTime(record.fvgStartTimestamp)} - ${formatTime(record.fvgEndTimestamp)}`;
}

function renderLiquidityFacts(record) {
  if (record.type !== SMT_TYPES.LIQUIDITY) return '';
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">NQ</div>
      <div class="inspector-field-value">${formatNumber(record.primaryLeftPrice)} → ${formatNumber(record.primaryRightPrice)} · no sweep</div>
    </div>
    <div class="inspector-field">
      <div class="inspector-field-label">ES</div>
      <div class="inspector-field-value">${formatNumber(record.compareLeftPrice)} → ${formatNumber(record.compareRightPrice)} · sweep</div>
    </div>
  `;
}

function renderFvgFacts(record) {
  if (record.type !== SMT_TYPES.FVG) return '';
  return `
    <div class="inspector-field">
      <div class="inspector-field-label">ES FVG</div>
      <div class="inspector-field-value">${formatNumber(record.fvgBottom)} - ${formatNumber(record.fvgTop)}</div>
    </div>
    <div class="inspector-field">
      <div class="inspector-field-label">NQ</div>
      <div class="inspector-field-value">Follows ES FVG · no NQ FVG recorded</div>
    </div>
  `;
}

function renderRow(record) {
  return `
    <div class="inspector-evidence-row smt-record-row">
      <div class="inspector-evidence-header">
        <span>${escapeHtml(getTitle(record))}</span>
        <span>${escapeHtml(record.timeframe)}</span>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Time</div>
        <div class="inspector-field-value">${escapeHtml(getRangeLabel(record))}</div>
      </div>
      ${renderLiquidityFacts(record)}
      ${renderFvgFacts(record)}
      <label class="inspector-field inspector-control-field">
        <span class="inspector-field-label">Note</span>
        <textarea class="inspector-textarea" data-inspector-action="smt-note" data-smt-id="${escapeHtml(record.id)}" rows="2">${escapeHtml(record.note || '')}</textarea>
      </label>
      <button class="inspector-secondary" data-inspector-action="smt-locate" data-smt-id="${escapeHtml(record.id)}" type="button">Locate</button>
      <button class="inspector-danger" data-inspector-action="smt-delete" data-smt-id="${escapeHtml(record.id)}" type="button">Delete</button>
    </div>
  `;
}

export function renderSmtPanel(records = []) {
  const content = records.length
    ? `<div class="inspector-evidence-list">${records.map(renderRow).join('')}</div>`
    : '<div class="drawing-set-empty">No SMT evidence. Use chart right-click SMT actions.</div>';
  return section('SMT Evidence', content);
}
