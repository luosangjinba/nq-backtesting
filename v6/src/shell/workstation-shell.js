const ICONS = {
  arrowLeft: '<path d="M15 18l-6-6 6-6"/><path d="M9 12h12"/>',
  arrowRight: '<path d="M9 18l6-6-6-6"/><path d="M3 12h12"/>',
  calendar: '<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/>',
  camera: '<path d="M7 7l1.8-2h6.4L17 7h3v12H4V7z"/><circle cx="12" cy="13" r="3"/>',
  fullscreen: '<path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  grip: '<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
  indicators: '<path d="M4 18V6"/><path d="M10 18V10"/><path d="M16 18V4"/><path d="M21 18H3"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  journal: '<path d="M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6"/><path d="M9 13h6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  moon: '<path d="M21 14.8A8 8 0 0 1 9.2 3a7 7 0 1 0 11.8 11.8z"/>',
  pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  plusCircle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M8 12h8"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M20 13a7 7 0 1 0-2 5"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  stepBack: '<path d="M19 5v14"/><path d="M15 6l-8 6 8 6"/>',
  stepForward: '<path d="M5 5v14"/><path d="M9 6l8 6-8 6"/>',
  truncate: '<path d="M19 5v14"/><path d="M5 12h11"/><path d="M9 8l-4 4 4 4"/>',
  undo: '<path d="M3 7v6h6"/><path d="M4 13a7 7 0 1 1 2 5"/>',
};

function icon(name) {
  return `<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

function layoutPreview(cells) {
  return `<span class="layout-preview" aria-hidden="true">${cells.map((cell) => `<span style="${cell}"></span>`).join('')}</span>`;
}

export function createWorkstationShellMarkup() {
  return `
    <section class="workstation-shell" data-v6-workstation-shell>
      <header class="top-bar" data-v6-workstation-header>
        <div class="top-tool-group top-tool-group-left" aria-label="Session and symbol tools">
          <button type="button" class="tool-button tool-button-icon" data-v6-top-back data-v6-sessions-toggle aria-controls="v6-sessions-panel" aria-expanded="false" aria-pressed="false" aria-label="Back to session dashboard">${icon('arrowLeft')}<span class="sr-only">Back to session dashboard</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-search-symbol disabled aria-label="Search symbol">${icon('search')}<span class="sr-only">Search symbol</span></button>
          <h1>FX Session Replay</h1>
          <span class="top-symbol" data-v6-top-symbol>NQ</span>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-compare disabled aria-label="Add comparison symbol">${icon('plusCircle')}<span class="sr-only">Add comparison symbol</span></button>
        </div>
        <div class="top-tool-group top-tool-group-main" aria-label="Chart tools">
          <div class="timeframe-menu-anchor">
            <button type="button" class="interval-command" data-v6-top-interval data-v6-display-timeframe-toggle aria-haspopup="true" aria-expanded="false" aria-controls="v6-timeframe-menu" aria-label="Interval menu">
              <span data-v6-display-timeframe-label>1m</span>
            </button>
            <div id="v6-timeframe-menu" class="timeframe-menu" data-v6-display-timeframe-menu hidden role="menu" aria-label="Interval menu">
              <button type="button" class="timeframe-custom" data-v6-display-timeframe-custom disabled role="menuitem">Add custom interval...</button>
              <section class="timeframe-menu-section" aria-label="Seconds">
                <div class="timeframe-menu-heading">Seconds</div>
                <button type="button" disabled role="menuitem">1 second</button>
                <button type="button" disabled role="menuitem">5 seconds</button>
                <button type="button" disabled role="menuitem">10 seconds</button>
                <button type="button" disabled role="menuitem">15 seconds</button>
                <button type="button" disabled role="menuitem">30 seconds</button>
              </section>
              <section class="timeframe-menu-section" aria-label="Minutes">
                <div class="timeframe-menu-heading">Minutes</div>
                <button type="button" data-v6-display-timeframe-option="1" role="menuitemradio" aria-checked="true">1 minute</button>
                <button type="button" data-v6-display-timeframe-option="5" role="menuitemradio" aria-checked="false">5 minutes</button>
                <button type="button" data-v6-display-timeframe-option="15" role="menuitemradio" aria-checked="false">15 minutes</button>
                <button type="button" disabled role="menuitem">30 minutes</button>
                <button type="button" disabled role="menuitem">45 minutes</button>
              </section>
              <section class="timeframe-menu-section" aria-label="Hours">
                <div class="timeframe-menu-heading">Hours</div>
                <button type="button" disabled role="menuitem">1 hour</button>
                <button type="button" disabled role="menuitem">2 hours</button>
                <button type="button" disabled role="menuitem">4 hours</button>
                <button type="button" disabled role="menuitem">12 hours</button>
              </section>
              <section class="timeframe-menu-section" aria-label="Days">
                <div class="timeframe-menu-heading">Days</div>
                <button type="button" disabled role="menuitem">1 day</button>
                <button type="button" disabled role="menuitem">1 week</button>
                <button type="button" disabled role="menuitem">1 month</button>
                <button type="button" disabled role="menuitem">12 months</button>
              </section>
            </div>
          </div>
          <button type="button" class="tool-button tool-button-text" data-v6-top-indicators disabled aria-label="Indicators">${icon('indicators')}<span>Indicators</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-undo disabled aria-label="Undo">${icon('undo')}<span class="sr-only">Undo</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-redo disabled aria-label="Redo">${icon('redo')}<span class="sr-only">Redo</span></button>
        </div>
        <div class="top-session-group" aria-label="Session identity">
          <span class="profile-chip" data-v6-top-profile data-v6-session-name>test</span>
        </div>
        <div class="top-tool-group top-tool-group-right" aria-label="Account and utility tools">
          <button type="button" data-v6-top-account data-v6-top-session-hours disabled aria-label="Trading hours">ETH</button>
          <details class="layout-menu-anchor" data-v6-layout-menu-details>
            <summary class="tool-button tool-button-icon" data-v6-top-page-layout aria-label="Page layout" aria-haspopup="true">${icon('grid')}<span class="sr-only">Page layout</span></summary>
            <div class="layout-menu" data-v6-layout-menu role="menu" aria-label="Page layout">
              <section class="layout-menu-row" aria-label="One pane">
                <span class="layout-row-index">1</span>
                <button type="button" class="layout-option is-selected" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 5;'])}</button>
              </section>
              <section class="layout-menu-row" aria-label="Two panes">
                <span class="layout-row-index">2</span>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 3;', 'grid-column: 1 / 5; grid-row: 3 / 5;'])}</button>
              </section>
              <section class="layout-menu-row" aria-label="Three panes">
                <span class="layout-row-index">3</span>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 2; grid-row: 1 / 5;', 'grid-column: 2 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 2;', 'grid-column: 1 / 5; grid-row: 2 / 3;', 'grid-column: 1 / 5; grid-row: 3 / 5;'])}</button>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 3;', 'grid-column: 3 / 5; grid-row: 3 / 5;'])}</button>
                <button type="button" class="layout-option" disabled role="menuitem">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 3;', 'grid-column: 1 / 3; grid-row: 3 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
              </section>
              <section class="layout-sync-section" aria-label="Sync in layout">
                <div class="layout-menu-heading">Sync in layout</div>
                <label data-v6-layout-sync-row="symbol" title="Symbol changes on all charts within the layout">
                  <span>Symbol <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked disabled aria-label="Sync symbol across panes">
                </label>
                <label data-v6-layout-sync-row="interval" title="Interval changes on all charts within the layout">
                  <span>Interval <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked disabled aria-label="Sync interval across panes">
                </label>
                <label data-v6-layout-sync-row="crosshair" title="Crosshair is synced across all charts within the layout">
                  <span>Crosshair <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" disabled aria-label="Sync crosshair across panes">
                </label>
                <label data-v6-layout-sync-row="time" title="When a chart is clicked, all charts within the layout display the same point of time">
                  <span>Time <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked disabled aria-label="Sync clicked time across panes">
                </label>
                <label data-v6-layout-sync-row="date-range" title="Date range changes on all charts within the layout">
                  <span>Date range <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" disabled aria-label="Sync date range across panes">
                </label>
              </section>
            </div>
          </details>
          <span class="layout-name" data-v6-top-layout-name>NQ-2018</span>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-search disabled aria-label="Search">${icon('search')}<span class="sr-only">Search</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-settings-toggle aria-controls="v6-settings-panel" aria-expanded="false" aria-pressed="false" aria-label="Settings">${icon('gear')}<span class="sr-only">Settings</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-screenshot disabled aria-label="Screenshot">${icon('camera')}<span class="sr-only">Screenshot</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-theme disabled aria-label="Theme">${icon('moon')}<span class="sr-only">Theme</span></button>
          <button type="button" class="tool-button tool-button-icon" data-v6-top-fullscreen disabled aria-label="Fullscreen">${icon('fullscreen')}<span class="sr-only">Fullscreen</span></button>
        </div>
        <div class="top-workflow-hooks" aria-label="Workflow panels">
          <button type="button" data-v6-replay-workflow-toggle aria-controls="v6-replay-workflow-panel" aria-expanded="false" aria-pressed="false">Replay</button>
          <button type="button" data-v6-journal-toggle aria-controls="v6-journal-panel" aria-expanded="false" aria-pressed="false">Journal</button>
        </div>
        <div class="top-context">
          <div class="readiness-surface" data-v6-readiness-surface aria-label="V6 workflow readiness" aria-live="polite">
            <span class="readiness-state" data-v6-readiness-state>System starting</span>
            <span class="readiness-detail" data-v6-readiness-missing>Commands pending</span>
            <span class="readiness-telemetry" data-v6-readiness-runtime-count>0 services active</span>
            <span class="readiness-telemetry" data-v6-readiness-command-count>Setup pending</span>
            <span class="readiness-telemetry" data-v6-readiness-gate-count>Core checks pending</span>
            <ul class="readiness-gates" data-v6-readiness-gates></ul>
          </div>
        </div>
      </header>
      <section id="v6-journal-panel" class="journal-panel" data-v6-journal-panel hidden>
        <div class="panel-copy">
          <strong>Trade Journal</strong>
          <span>Review replay notes and saved outcomes.</span>
        </div>
        <div class="panel-metrics journal-summary">
          <span data-v6-journal-count>0 journal entries</span>
          <span data-v6-journal-pnl>Net P/L pending</span>
          <span data-v6-journal-snapshot>No saved journal</span>
        </div>
        <div class="panel-actions journal-actions">
          <button type="button" data-v6-journal-refresh>Update</button>
          <button type="button" data-v6-journal-add>Add note</button>
          <button type="button" data-v6-journal-save>Save journal</button>
          <button type="button" data-v6-journal-load>Load journal</button>
          <button type="button" data-v6-journal-close aria-label="Close Trade Journal panel">Close</button>
        </div>
        <ul class="journal-list" data-v6-journal-list></ul>
      </section>
      <section id="v6-replay-workflow-panel" class="replay-workflow-panel" data-v6-replay-workflow-panel hidden>
        <div class="panel-copy">
          <strong>Replay Control</strong>
          <span>Manage replay state without changing chart ownership.</span>
        </div>
        <div class="panel-metrics replay-workflow-summary">
          <span data-v6-replay-workflow-state>No replay loaded</span>
          <span data-v6-replay-workflow-wall>No replay wall loaded</span>
        </div>
        <div class="panel-actions replay-workflow-actions">
          <button type="button" data-v6-replay-workflow-refresh>Update</button>
          <button type="button" data-v6-replay-workflow-pause>Pause</button>
          <button type="button" data-v6-replay-workflow-reset>Reset</button>
          <button type="button" data-v6-replay-workflow-close aria-label="Close Replay Control panel">Close</button>
        </div>
      </section>
      <section id="v6-sessions-panel" class="sessions-panel" data-v6-sessions-panel hidden>
        <div class="panel-copy sessions-panel-header">
          <strong>Replay Sessions</strong>
          <span data-v6-sessions-active>No active replay session</span>
        </div>
        <div class="panel-metrics">
          <span data-v6-sessions-count>0 replay sessions</span>
        </div>
        <div class="panel-actions sessions-panel-actions">
          <button type="button" data-v6-sessions-create>New session</button>
          <button type="button" data-v6-sessions-refresh>Update</button>
          <button type="button" data-v6-sessions-close aria-label="Close Replay Sessions panel">Close</button>
        </div>
        <ul class="sessions-list" data-v6-sessions-list></ul>
      </section>
      <section id="v6-settings-panel" class="settings-panel" data-v6-settings-panel hidden role="dialog" aria-modal="true" aria-label="Settings">
        <div class="settings-modal">
          <header class="settings-modal-header">
            <strong>Settings</strong>
            <button type="button" class="settings-close-button" data-v6-settings-close aria-label="Close Settings panel">×</button>
          </header>
          <div class="settings-modal-body">
            <nav class="settings-tab-rail" aria-label="Settings sections">
              <button type="button" class="is-active" disabled>${icon('indicators')}<span>Symbol</span></button>
              <button type="button" disabled>${icon('journal')}<span>Status line</span></button>
              <button type="button" disabled>${icon('arrowRight')}<span>Scales and lines</span></button>
              <button type="button" disabled>${icon('camera')}<span>Canvas</span></button>
            </nav>
            <div class="settings-modal-content">
              <section class="settings-field-group" aria-label="Candles">
                <div class="settings-group-heading">Candles</div>
                <label class="settings-check-row">
                  <input type="checkbox" data-v6-settings-field="showWatermark" checked>
                  <span>Color bars based on previous close</span>
                </label>
                <label class="settings-swatch-row">
                  <input type="checkbox" checked disabled>
                  <span>Body</span>
                  <span class="color-swatch swatch-up"></span>
                  <span class="color-swatch swatch-down"></span>
                </label>
                <label class="settings-swatch-row">
                  <input type="checkbox" checked disabled>
                  <span>Borders</span>
                  <span class="color-swatch swatch-border-up"></span>
                  <span class="color-swatch swatch-border-down"></span>
                </label>
                <label class="settings-swatch-row">
                  <input type="checkbox" checked disabled>
                  <span>Wick</span>
                  <span class="color-swatch swatch-wick-up"></span>
                  <span class="color-swatch swatch-wick-down"></span>
                </label>
              </section>
              <section class="settings-field-group" aria-label="Data modification">
                <div class="settings-group-heading">Data modification</div>
                <label class="settings-select-row">
                  <span>Precision</span>
                  <select disabled aria-label="Precision">
                    <option>Default</option>
                  </select>
                </label>
                <label class="settings-select-row">
                  <span>Timezone</span>
                  <select data-v6-settings-field="displayTimezone" aria-label="Timezone">
                    <option value="exchange">(UTC-4) New York</option>
                    <option value="local">Local</option>
                    <option value="utc">UTC</option>
                  </select>
                </label>
                <label class="settings-check-row settings-hidden-runtime-field">
                  <input type="checkbox" data-v6-settings-field="chartGrid" checked>
                  <span>Grid</span>
                </label>
                <label class="settings-select-row settings-hidden-runtime-field">
                  <span>Theme</span>
                  <select data-v6-settings-field="theme" aria-label="Theme">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
              </section>
            </div>
          </div>
          <footer class="settings-modal-footer">
            <button type="button" class="settings-template-button" disabled>Template</button>
            <div class="settings-footer-actions">
              <button type="button" data-v6-settings-close-secondary>Cancel</button>
              <button type="button" class="settings-ok-button" data-v6-settings-ok>Ok</button>
            </div>
          </footer>
        </div>
      </section>

      <main class="workstation-main" data-v6-workstation-main>
        <section class="chart-surface" aria-label="Replay chart surface" data-v6-chart-surface>
          <div class="symbol-readout pane-status-readout" data-v6-status-readout>
            <span class="status-dot" aria-hidden="true"></span>
            <strong data-v6-status-symbol>NQ</strong>
            <span data-v6-status-timeframe>1m</span>
            <span data-v6-status-open>O --</span>
            <span data-v6-status-high>H --</span>
            <span data-v6-status-low>L --</span>
            <span data-v6-status-close>C --</span>
          </div>
          <div class="chart-engine-host" data-v6-chart-engine-host data-v6-pane-id="default"></div>
          <div class="chart-fallback" data-v6-chart-fallback aria-hidden="true">
            <div class="price-scale-placeholder">
              <span>30520.00</span>
              <span>30480.00</span>
              <span>30440.00</span>
              <span>30400.00</span>
              <span>30360.00</span>
              <span>30320.00</span>
            </div>
            <div class="time-scale-placeholder">
              <span>07:45</span>
              <span>08:00</span>
              <span>08:15</span>
              <span>08:30</span>
              <span>08:45</span>
              <span>09:00</span>
            </div>
            <div class="static-chart-visual">
              <span class="candle up"></span>
              <span class="candle down"></span>
              <span class="candle up"></span>
              <span class="candle down tall"></span>
              <span class="candle down"></span>
              <span class="candle up tall"></span>
              <span class="candle up"></span>
              <span class="candle down"></span>
              <span class="candle down tall"></span>
              <span class="candle up"></span>
              <span class="candle down"></span>
              <span class="candle up tall"></span>
              <span class="candle down"></span>
              <span class="candle up"></span>
              <span class="candle up tall"></span>
              <span class="candle down"></span>
              <span class="candle down"></span>
              <span class="candle up"></span>
              <span class="candle down tall"></span>
              <span class="candle up"></span>
              <span class="candle up tall"></span>
              <span class="candle down"></span>
              <span class="candle up"></span>
              <span class="candle down"></span>
            </div>
          </div>
          <div class="chart-placeholder" data-v6-chart-placeholder>
            <strong data-v6-status-title>NQ 1m</strong>
            <span data-v6-status-price>--</span>
          </div>
        </section>
        <aside class="right-utility-rail" data-v6-right-utility-rail aria-label="Right utility rail">
          <button type="button" class="rail-button rail-button-icon" data-v6-rail-object-tree disabled aria-label="Show object tree">
            ${icon('layers')}
            <span class="sr-only">Show object tree</span>
          </button>
          <div class="rail-main-actions">
            <button type="button" class="rail-button" data-v6-rail-order disabled aria-label="Order">
              ${icon('plusCircle')}
              <span>Order</span>
            </button>
            <details class="rail-popover-anchor" data-v6-rail-goto-details>
              <summary class="rail-button" data-v6-rail-goto aria-label="Go to key time">
                ${icon('arrowRight')}
                <span>Go to</span>
              </summary>
              <div class="rail-popover" data-v6-rail-goto-menu role="menu" aria-label="Go to key time">
                <button type="button" disabled role="menuitem">Next Day Open <kbd>Y</kbd></button>
                <button type="button" disabled role="menuitem">Next Session <kbd>Z</kbd></button>
                <button type="button" disabled role="menuitem">Asian Session <kbd>I</kbd></button>
                <button type="button" disabled role="menuitem">London Session <kbd>L</kbd></button>
                <button type="button" disabled role="menuitem">New York Session <kbd>N</kbd></button>
                <button type="button" disabled role="menuitem">Custom Settings</button>
              </div>
            </details>
            <button type="button" class="rail-button" data-v6-rail-news disabled aria-label="News and calendar events">
              ${icon('calendar')}
              <span>News</span>
            </button>
            <button type="button" class="rail-button" data-v6-rail-journal disabled aria-label="Journal">
              ${icon('journal')}
              <span>Journal</span>
            </button>
          </div>
          <div class="rail-bottom-actions">
            <button type="button" class="rail-button rail-button-icon" data-v6-rail-watch disabled aria-label="Watch tool">
              ${icon('spark')}
              <span class="sr-only">Watch tool</span>
            </button>
            <button type="button" class="rail-button rail-button-icon" data-v6-rail-session-settings disabled aria-label="Session settings">
              ${icon('gear')}
              <span class="sr-only">Session settings</span>
            </button>
          </div>
        </aside>
      </main>
      <div class="transport-placeholder" aria-label="Replay transport" data-v6-transport>
        <button type="button" class="transport-grip" data-v6-transport-drag-handle aria-label="Drag replay controls">${icon('grip')}</button>
        <button type="button" class="transport-icon-button" data-v6-transport-truncate disabled aria-label="Truncate replay after current bar">${icon('truncate')}</button>
        <label class="transport-speed-slider" aria-label="Replay speed">
          <input type="range" min="0.5" max="4" step="0.5" value="1" data-v6-transport-speed-slider>
        </label>
        <button type="button" class="transport-icon-button" data-v6-transport-step-back disabled aria-label="Previous replay bar">${icon('stepBack')}</button>
        <button type="button" class="transport-icon-button" aria-label="Play replay" data-v6-transport-action="play-toggle" aria-pressed="false">
          ${icon('play')}
          <span class="sr-only" data-v6-transport-play-label>Play replay</span>
        </button>
        <details class="transport-period-menu-anchor" data-v6-transport-period-details>
          <summary class="transport-period-trigger" data-v6-transport-period-toggle aria-label="Replay step period">
            <span data-v6-transport-period-label>1m</span>
          </summary>
          <div class="transport-period-menu" data-v6-transport-period-menu role="menu" aria-label="Replay step period">
            <button type="button" disabled role="menuitem">1s</button>
            <button type="button" disabled role="menuitem">5s</button>
            <button type="button" disabled role="menuitem">10s</button>
            <button type="button" disabled role="menuitem">15s</button>
            <button type="button" disabled role="menuitem">30s</button>
            <button type="button" disabled role="menuitem">1m</button>
            <button type="button" disabled role="menuitem">3m</button>
            <button type="button" disabled role="menuitem">5m</button>
          </div>
        </details>
        <button type="button" class="transport-icon-button" aria-label="Next replay bar" data-v6-transport-action="next">${icon('stepForward')}</button>
        <label class="transport-sync-toggle" aria-label="Sync replay period with active chart">
          <input type="checkbox" data-v6-transport-period-sync>
          <span></span>
        </label>
      </div>

      <footer class="status-bar" data-v6-status-bar>
        <span data-v6-footer-session>Session pending</span>
        <span data-v6-footer-start>Start pending</span>
        <span data-v6-footer-cursor>Cursor pending</span>
        <span data-v6-footer-end>End pending</span>
        <span data-v6-footer-revealed>Revealed 0/--</span>
        <span data-v6-footer-playback>Playback idle</span>
        <span data-v6-footer-no-future>No future pending</span>
      </footer>
    </section>
  `;
}
