import { renderChartSettingsPopover } from './chart-settings-template.js';
import { renderReplayFloatingControls } from './replay-floating-controls.js';

export function renderChartReplayTemplate({ activePaneId }) {
  return `
        <div class="panel-heading chart-route-heading">
          <div class="chart-route-title">
            <div class="eyebrow">Replay workstation</div>
            <h2>FX Session Replay</h2>
          </div>
          <div class="panel-heading-actions chart-route-actions" data-route-navigation aria-label="Route navigation">
            <button type="button" class="route-back-button" data-route-link="setup" title="Back to sessions">Sessions</button>
            <span class="runtime-badge">Historical Review</span>
          </div>
        </div>
        <div class="replay-workstation-toolbar" data-replay-workstation-toolbar>
          <label class="display-timeframe-controls" data-display-timeframe-controls aria-label="Active chart timeframe">
            <span>TF</span>
            <select data-display-timeframe-select disabled>
              <option value="1" data-display-timeframe="1">1m</option>
              <option value="2" data-display-timeframe="2">2m</option>
              <option value="3" data-display-timeframe="3">3m</option>
              <option value="4" data-display-timeframe="4">4m</option>
              <option value="5" data-display-timeframe="5">5m</option>
              <option value="10" data-display-timeframe="10">10m</option>
              <option value="15" data-display-timeframe="15">15m</option>
              <option value="30" data-display-timeframe="30">30m</option>
              <option value="60" data-display-timeframe="60">1H</option>
              <option value="120" data-display-timeframe="120">2H</option>
              <option value="180" data-display-timeframe="180">3H</option>
              <option value="240" data-display-timeframe="240">4H</option>
              <option value="1440" data-display-timeframe="1440">1D</option>
              <option value="10080" data-display-timeframe="10080">1W</option>
              <option value="43200" data-display-timeframe="43200">1M</option>
            </select>
          </label>
          <div class="chart-navigation-controls" data-chart-navigation-controls aria-label="Jump to time">
            <button type="button" data-chart-go-to-open disabled>Go to</button>
            <button type="button" data-layout-open data-layout-state="ready" data-layout-mode="single" aria-expanded="false" title="Chart layout">Layout</button>
            <button type="button" data-chart-settings-open title="Chart settings" aria-label="Chart settings">Settings</button>
          </div>
        </div>
        <div class="chart-layout-popover" data-layout-popover hidden>
          <div class="chart-layout-panel" role="dialog" aria-modal="false" aria-label="Chart layout">
            <div class="chart-layout-header">
              <strong>Layout</strong>
              <button type="button" data-layout-close aria-label="Close layout">&times;</button>
            </div>
            <div class="chart-layout-modes" aria-label="Pane layout">
              <button type="button" data-layout-mode-option="single">Single</button>
              <button type="button" data-layout-mode-option="twice">Twice</button>
              <button type="button" data-layout-mode-option="triple">Triple</button>
            </div>
            <div class="chart-layout-sync" aria-label="Layout sync options">
              <label><input type="checkbox" data-layout-sync="symbol" disabled> Symbol</label>
              <label><input type="checkbox" data-layout-sync="interval"> Interval</label>
              <label><input type="checkbox" data-layout-sync="crosshair"> Crosshair</label>
              <label><input type="checkbox" data-layout-sync="time"> Time</label>
              <label><input type="checkbox" data-layout-sync="dateRange"> Date range</label>
            </div>
          </div>
        </div>
        ${renderChartSettingsPopover()}
        <div class="chart-pane-shell" data-layout-pane-shell data-layout-mode="single" data-active-pane-id="${activePaneId}" data-pane-count="1">
          <div class="chart-pane is-active" data-layout-pane data-pane-id="${activePaneId}" data-pane-role="primary" data-has-chart-host="true" data-active-pane="true" role="button" tabindex="0" aria-label="Primary chart pane">
            <div class="chart-viewport" data-chart-pane-id="${activePaneId}" data-active-pane="true" data-pane-role="primary-chart" aria-label="Active chart pane">
              <div class="chart-host" data-chart-host data-chart-pane-id="${activePaneId}" data-active-pane="true">
                <span>Starting chart...</span>
              </div>
              <div class="chart-ohlc-overlay" data-chart-ohlc-overlay hidden>
                <span data-chart-market-status aria-label="Open market status"></span>
                <span data-chart-ohlc-symbol>NQ</span>
                <span data-chart-ohlc-timeframe>1m</span>
                <span class="chart-ohlc-legend" data-chart-ohlc-legend aria-label="Current bar OHLC"></span>
              </div>
              <div class="replay-truncate-pick-line" data-replay-truncate-pick-line hidden></div>
              <div class="chart-toolbar" data-chart-toolbar aria-label="Chart navigation">
                <button type="button" data-chart-reset-view title="Reset view" aria-label="Reset view" disabled>&#8634;</button>
              </div>
              ${renderReplayFloatingControls()}
              <div class="chart-go-to-popover" data-chart-go-to-popover hidden>
                <div class="chart-go-to-panel" role="dialog" aria-modal="false" aria-label="Go to time">
                  <div class="chart-go-to-header">
                    <strong>Go to</strong>
                    <button type="button" data-chart-go-to-cancel aria-label="Close go to">&times;</button>
                  </div>
                  <label>
                    Date and time
                    <input type="datetime-local" data-chart-go-to-input>
                  </label>
                  <div class="chart-go-to-actions">
                    <button type="button" data-chart-go-to-cancel>Cancel</button>
                    <button type="button" data-chart-go-to disabled>Go</button>
                    <button type="button" data-chart-jump-cursor-popover disabled>Jump to replay cursor</button>
                    <button type="button" data-replay-reset disabled>Reset replay</button>
                  </div>
                </div>
              </div>
              <div class="replay-truncate-error-popover" data-replay-truncate-error hidden>
                <div class="replay-truncate-error-panel" role="dialog" aria-modal="false" aria-label="Replay truncate warning">
                  <div class="replay-truncate-error-header">
                    <strong data-replay-truncate-error-title>Cannot truncate replay</strong>
                    <button type="button" data-replay-truncate-error-close aria-label="Close replay truncate warning">&times;</button>
                  </div>
                  <p data-replay-truncate-error-message></p>
                  <div class="replay-truncate-error-actions">
                    <button type="button" data-replay-truncate-error-close>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="replay-footer" data-replay-footer>
          <div class="session-chip">Session <strong data-session-id-label></strong></div>
          <div class="replay-status-grid" data-replay-status>
            <span>Start <strong data-replay-start>--</strong></span>
            <span>Cursor <strong data-replay-cursor>--</strong></span>
            <span>End <strong data-replay-end>--</strong></span>
            <span>Revealed <strong data-replay-revealed-count>0</strong></span>
            <span>Playback <strong data-replay-playback>Paused</strong></span>
            <span>State <strong data-replay-state>Idle</strong></span>
            <span data-status-ohlc-row>OHLC <strong data-status-ohlc>--</strong></span>
            <span data-status-change-row>Change <strong data-status-change>--</strong></span>
            <span data-crosshair-row>Inspect <strong data-crosshair-inspection-readout>--</strong></span>
            <span data-countdown-row hidden>Countdown <strong data-bar-countdown>--</strong></span>
          </div>
          <p data-replay-load-status>Waiting for replay session.</p>
        </div>
      `;
}
