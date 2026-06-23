import {
  INSTRUMENT_OPTIONS,
  TIMEFRAME_MAP,
} from '../../config.js';

function renderInstrumentOptions(selectedInstrument) {
  return INSTRUMENT_OPTIONS.map(
    (instrument) =>
      `<option value="${instrument}"${instrument === selectedInstrument ? ' selected' : ''}>${instrument}</option>`
  ).join('');
}

function renderTimeframeOptions(selectedTimeframe) {
  return Object.entries(TIMEFRAME_MAP)
    .map(
      ([value, label]) =>
        `<option value="${value}"${Number(value) === Number(selectedTimeframe) ? ' selected' : ''}>${label}</option>`
    )
    .join('');
}

function renderOverlaySyncOptions(selectedMode) {
  return [
    ['sync', 'Sync'],
    ['no-sync', 'No Sync'],
  ].map(
    ([value, label]) =>
      `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`
  ).join('');
}

export function renderComparisonWindowTemplate() {
  return `
    <section id="comparison-window" class="comparison-window" aria-label="Comparison Window">
      <header class="comparison-window-header" data-comparison-drag-handle>
        <div class="comparison-window-title-block">
          <div class="comparison-window-title">Pane 2</div>
          <div class="comparison-window-subtitle">Use top Symbol/TF controls when this pane is active</div>
        </div>
        <div class="comparison-window-actions">
          <label class="comparison-window-field comparison-window-legacy-field">
            <span>Inst</span>
            <select class="comparison-window-select" data-comparison-instrument></select>
          </label>
          <label class="comparison-window-field comparison-window-legacy-field">
            <span>TF</span>
            <select class="comparison-window-select" data-comparison-timeframe></select>
          </label>
          <label class="comparison-window-field comparison-window-legacy-field">
            <span>Drawings</span>
            <select class="comparison-window-select" data-comparison-overlay-sync></select>
          </label>
          <button class="comparison-window-btn comparison-window-legacy-action" type="button" data-comparison-reset title="Reset window position">Reset</button>
          <button class="comparison-window-btn comparison-window-close comparison-window-legacy-action" type="button" data-comparison-close title="Close Comparison Window">Close</button>
        </div>
      </header>
      <div class="comparison-window-left-handle" data-comparison-left-handle aria-label="Resize comparison window"></div>
      <div class="comparison-window-rail" data-comparison-drag-handle aria-hidden="true">
        <div class="comparison-window-rail-handle"></div>
      </div>
      <div class="comparison-window-stage" id="comparison-chart-view" data-view-id="comparison-window-1">
        <div id="comparison-chart-canvas" class="comparison-chart-canvas">
          <div id="comparison-chart-info" class="comparison-chart-info"></div>
          <div id="comparison-ohlc-legend" class="comparison-ohlc-legend"></div>
          <div id="comparison-viewport-controls"></div>
          <div class="comparison-overlay-status" data-comparison-overlay-status>Overlays waiting for comparison data</div>
          <div id="comparison-context-menu" class="pda-menu comparison-context-menu" hidden></div>
          <div class="comparison-window-placeholder" data-comparison-placeholder>
            <div class="comparison-window-placeholder-title">Comparison chart view</div>
            <div class="comparison-window-placeholder-meta" data-comparison-status>Choose a main date range to load comparison data</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function syncComparisonHeaderControls(root, descriptor) {
  const { instrument, timeframe, overlaySyncMode } = descriptor;
  const instrumentSelect = root.querySelector('[data-comparison-instrument]');
  const timeframeSelect = root.querySelector('[data-comparison-timeframe]');
  const overlaySyncSelect = root.querySelector('[data-comparison-overlay-sync]');
  if (instrumentSelect) {
    instrumentSelect.innerHTML = renderInstrumentOptions(instrument);
    instrumentSelect.value = instrument;
  }
  if (timeframeSelect) {
    timeframeSelect.innerHTML = renderTimeframeOptions(timeframe);
    timeframeSelect.value = String(timeframe);
  }
  if (overlaySyncSelect) {
    overlaySyncSelect.innerHTML = renderOverlaySyncOptions(overlaySyncMode);
    overlaySyncSelect.value = overlaySyncMode;
  }
}
