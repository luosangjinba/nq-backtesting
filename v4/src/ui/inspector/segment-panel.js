import { getAnnotationById, getAnnotations } from '../../pda/pda-store.js';
import { getPdaType } from '../../pda/pda-types.js';
import { getBars } from '../../data/bar-store.js';
import { computeSegmentReviewMetrics } from '../../segment/segment-review-metrics.js';
import { getSegments } from '../../segment/segment-store.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
  section,
} from './render-utils.js';

function getSegmentShowLabel(segment) {
  return segment.display?.showLabel ?? segment.showLabel ?? true;
}

function getResponseDisplayMode(response) {
  return response.displayMode || (response.selected === false ? 'normal' : 'highlight');
}

function formatTags(tags = []) {
  return Array.isArray(tags) && tags.length ? tags.join(', ') : '';
}

export function parseTags(value) {
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

function formatRatio(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3) : '—';
}

function formatPercent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '—';
}

function formatRatioPercent(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '—';
}

function formatBoolean(value) {
  return value ? 'yes' : 'no';
}

function formatReactionSummary(candidate) {
  const reaction = candidate.reaction;
  if (!candidate.found) return 'missing linked PDA';
  if (!reaction) return 'not measurable';

  if (reaction.shape === 'range') {
    if (reaction.deliveredThrough) return 'range delivered through';
    if (reaction.sweptThenReversed) return 'range swept then reversed';
    if (reaction.body?.touchedCe) return 'CE touched by body';
    if (reaction.wick?.touchedCe) return 'CE touched by wick';
    if (reaction.body?.touched) return 'range touched by body';
    if (reaction.wick?.touched) return 'range touched by wick';
    return `approached ${formatNumber(reaction.approachDistancePoints)} pts`;
  }

  if (reaction.shape === 'liquidity') {
    if (reaction.sweptThenReversed) return 'swept then reversed';
    if (reaction.deliveredThrough) return 'swept and delivered through';
    if (reaction.exactEquality) return 'exact equality';
    return `approached ${formatNumber(reaction.approachDistancePoints)} pts`;
  }

  if (reaction.shape === 'fib') {
    const level = reaction.nearestLevel;
    const levelText = level ? `${formatRatio(level.value)} @ ${formatNumber(level.price)}` : '—';
    if (reaction.deliveredThrough) return `level delivered through ${levelText}`;
    if (reaction.sweptThenReversed) return `level swept then reversed ${levelText}`;
    if (reaction.bodyTouched) return `level touched by body ${levelText}`;
    if (reaction.wickTouched) return `level touched by wick ${levelText}`;
    return `nearest level ${levelText}`;
  }

  return reaction.shape || 'unknown';
}

function renderTerminalPdaCandidates(candidates = []) {
  if (!candidates.length) {
    return '<div class="inspector-empty">No linked PDA candidates</div>';
  }

  const rows = candidates
    .map(
      (candidate, index) => `
        <div class="inspector-response-row">
          <span>${escapeHtml(index + 1)}</span>
          <span>${escapeHtml(candidate.label)}</span>
          <span>${escapeHtml(formatReactionSummary(candidate))}</span>
          <span>distance ${escapeHtml(formatNumber(candidate.distancePoints))}</span>
          <span>${escapeHtml(candidate.relation)}</span>
        </div>
      `
    )
    .join('');

  return `<div class="inspector-point-list">${rows}</div>`;
}

function renderFluencyMetrics(fluency) {
  const rows = fluency?.incompleteReason
    ? [
        field('Status', fluency.incompleteReason),
        field('Bars', fluency.barCount),
        field('Start Loaded', formatBoolean(fluency.startBarLoaded)),
        field('End Loaded', formatBoolean(fluency.endBarLoaded)),
      ]
    : [
        field('Bars', fluency.barCount),
        field('Range', formatNumber(fluency.rangePoints)),
        field('Path Range', formatNumber(fluency.pathRangePoints)),
        field('Efficiency', formatRatio(fluency.directionalEfficiency)),
        field('Overlap Ratio', formatRatioPercent(fluency.overlapRatio)),
        field('Counter Closes', formatRatioPercent(fluency.counterDirectionCloseRatio)),
        field('Directional Closes', formatRatioPercent(fluency.directionalCloseRatio)),
        field('Avg Body', formatPercent(fluency.averageBodyPercent)),
        field('Max Adverse', formatPercent(fluency.maxAdverseExcursionPercent)),
        field('Points / Bar', formatNumber(fluency.pointsPerBar)),
        field('PDA Interruptions', fluency.pdaInterruptionCount),
      ];

  return section('Fluency Components', rows.join(''));
}

function renderReviewMetrics(segment) {
  const metrics = computeSegmentReviewMetrics(segment, {
    segments: getSegments(),
    bars: getBars(),
    annotations: getAnnotations(),
  });
  const comparison = metrics.previousComparison;
  const terminal = metrics.terminalBar;

  const comparisonFields = comparison.incompleteReason
    ? [
        field('Status', comparison.incompleteReason),
        field('Previous', comparison.previousSegmentId || '—'),
        field('Connected', formatBoolean(comparison.connected)),
        field('Opposite', formatBoolean(comparison.oppositeDirection)),
      ]
    : [
        field('Previous', comparison.previousSegmentId),
        field('Current Range', formatNumber(comparison.currentRangePoints)),
        field('Previous Range', formatNumber(comparison.previousRangePoints)),
        field('Extension Ratio', formatRatio(comparison.extensionRatio)),
        field('Class', comparison.extensionClass),
        field('Took Extreme', formatBoolean(comparison.tookPreviousExtreme)),
        field('Prev Extreme', formatNumber(comparison.previousExtreme)),
        field('Overshoot', formatNumber(comparison.overshootPoints)),
        field('Overshoot Ratio', formatRatio(comparison.overshootRatio)),
        field('Stopped Inside', formatPercent(comparison.stoppedAtPreviousRangePositionPercent)),
      ];

  const terminalFields = terminal.found
    ? [
        field('Terminal Time', formatTime(terminal.timestamp)),
        field('Open', formatNumber(terminal.open)),
        field('High', formatNumber(terminal.high)),
        field('Low', formatNumber(terminal.low)),
        field('Close', formatNumber(terminal.close)),
        field('Body High', formatNumber(terminal.bodyHigh)),
        field('Body Low', formatNumber(terminal.bodyLow)),
        field('Upper Wick', formatNumber(terminal.upperWickPoints)),
        field('Lower Wick', formatNumber(terminal.lowerWickPoints)),
        field('Body Points', formatNumber(terminal.bodyPoints)),
      ]
    : [field('Terminal Bar', terminal.incompleteReason)];

  return (
    section('Review Metrics', [...comparisonFields, ...terminalFields].join('')) +
    section('Terminal PDA Candidates', renderTerminalPdaCandidates(metrics.terminalPdaCandidates)) +
    renderFluencyMetrics(metrics.fluency)
  );
}

export function renderSegmentPanel(segment) {
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

  return (
    common +
    renderSegmentPoint('Start', segment.start) +
    renderSegmentPoint('End', segment.end) +
    renderPdaResponses(segment) +
    renderReviewMetrics(segment) +
    edit +
    display
  );
}
