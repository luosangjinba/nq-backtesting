import { computeSegmentGroupMetrics } from '../../segment/segment-group-metrics.js';
import { getSegmentById, getSegments } from '../../segment/segment-store.js';
import {
  controlField,
  escapeHtml,
  field,
  formatDateTimeMs,
  formatNumber,
  formatTime,
  section,
} from './render-utils.js';

function formatRatio(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3) : '—';
}

function formatBoolean(value) {
  return value ? 'yes' : 'no';
}

function getSegmentTitle(segment) {
  if (!segment) return '—';
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} ${formatTime(segment.start?.timestamp ?? segment.start?.time)}`;
}

function renderSegmentOptions(selectedId = '') {
  return [
    '<option value="">None</option>',
    ...getSegments().map(
      (segment) =>
        `<option value="${escapeHtml(segment.id)}" ${segment.id === selectedId ? 'selected' : ''}>${escapeHtml(getSegmentTitle(segment))}</option>`
    ),
  ].join('');
}

function renderChildSegments(group) {
  const rows = (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map((id, index) => {
      const segment = getSegmentById(id);
      return `
        <div class="inspector-response-row">
          <span>${index + 1}</span>
          <span>${escapeHtml(getSegmentTitle(segment))}</span>
          <span>${escapeHtml(id)}</span>
        </div>
      `;
    })
    .join('');

  return section('Child Segments', rows ? `<div class="inspector-point-list">${rows}</div>` : '<div class="inspector-empty">No child segments</div>');
}

export function renderSegmentGroupPanel(group) {
  const metrics = computeSegmentGroupMetrics(group);
  const target = getSegmentById(group.targetSegmentId);
  const common = section(
    'Composite Move',
    [
      field('Selected', `Composite ${String(group.direction || 'flat').toUpperCase()}`),
      field('ID', group.id),
      field('Objective', group.objective || '—'),
      field('Outcome', group.outcome || 'pending'),
      field('Target', target ? getSegmentTitle(target) : '—'),
      field('Created', formatDateTimeMs(group.createdAt)),
      field('Updated', formatDateTimeMs(group.updatedAt)),
    ].join('')
  );

  const metricsSection = section(
    'Composite Metrics',
    [
      field('Children', metrics.childCount),
      field('Start Segment', metrics.startSegmentId || '—'),
      field('Terminal Segment', metrics.terminalSegmentId || '—'),
      field('Net Range', formatNumber(metrics.netRangePoints)),
      field('Total Path', formatNumber(metrics.totalPathPoints)),
      field('Efficiency', formatRatio(metrics.efficiency)),
      field('Max Pullback', formatNumber(metrics.maxCounterRangePoints)),
      field('Pullback Ratio', formatRatio(metrics.maxPullbackDepthRatio)),
      field(
        'Took Target Extreme',
        metrics.terminalTookTargetExtreme === null ? '—' : formatBoolean(metrics.terminalTookTargetExtreme)
      ),
    ].join('')
  );

  const edit = section(
    'Review Notes',
    [
      controlField(
        'Target Segment',
        `<select class="inspector-input" data-inspector-action="segment-group-current-target">${renderSegmentOptions(group.targetSegmentId || '')}</select>`
      ),
      controlField(
        'Objective',
        `<select class="inspector-input" data-inspector-action="segment-group-current-objective">
          ${['break-previous-extreme', 'reach-target', 'context-structure']
            .map(
              (objective) =>
                `<option value="${objective}" ${group.objective === objective ? 'selected' : ''}>${objective}</option>`
            )
            .join('')}
        </select>`
      ),
      controlField(
        'Outcome',
        `<select class="inspector-input" data-inspector-action="segment-group-current-outcome">
          ${['pending', 'completed', 'failed', 'partial']
            .map(
              (outcome) =>
                `<option value="${outcome}" ${group.outcome === outcome ? 'selected' : ''}>${outcome}</option>`
            )
            .join('')}
        </select>`
      ),
      controlField(
        'Notes',
        `<textarea class="inspector-textarea" data-inspector-action="segment-group-current-notes" rows="5" placeholder="Composite move note">${escapeHtml(group.notes || '')}</textarea>`
      ),
    ].join('')
  );

  const display = section(
    'Display',
    `
      <label class="inspector-toggle">
        <input data-inspector-action="segment-group-toggle-label" type="checkbox" ${group.display?.showLabel ?? true ? 'checked' : ''} />
        <span>Show composite label</span>
      </label>
      <button class="inspector-danger" data-inspector-action="segment-group-current-delete" type="button">Delete Composite Move</button>
    `
  );

  return common + renderChildSegments(group) + metricsSection + edit + display;
}
