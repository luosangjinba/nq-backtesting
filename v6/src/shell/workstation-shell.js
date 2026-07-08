const ICONS = {
  arrowLeft: '<path d="M15 18l-6-6 6-6"/><path d="M9 12h12"/>',
  arrowRight: '<path d="M9 18l6-6-6-6"/><path d="M3 12h12"/>',
  calendar: '<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/>',
  camera: '<path d="M7 7l1.8-2h6.4L17 7h3v12H4V7z"/><circle cx="12" cy="13" r="3"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  crosshair: '<path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  fullscreen: '<path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  grip: '<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
  indicators: '<path d="M4 18V6"/><path d="M10 18V10"/><path d="M16 18V4"/><path d="M21 18H3"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  journal: '<path d="M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6"/><path d="M9 13h6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  listFilter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  minus: '<path d="M5 12h14"/>',
  moon: '<path d="M21 14.8A8 8 0 0 1 9.2 3a7 7 0 1 0 11.8 11.8z"/>',
  pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
  pencil: '<path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14 6l4 4"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  plusCircle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="M8 12h8"/>',
  ruler: '<path d="M4 17L17 4l3 3L7 20z"/><path d="M8 16l-2-2"/><path d="M11 13l-2-2"/><path d="M14 10l-2-2"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M20 13a7 7 0 1 0-2 5"/>',
  rectangle: '<rect x="5" y="6" width="14" height="12" rx="1"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 8v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  sort: '<path d="M7 4v16"/><path d="M4 7l3-3 3 3"/><path d="M17 20V4"/><path d="M14 17l3 3 3-3"/>',
  stepBack: '<path d="M19 5v14"/><path d="M15 6l-8 6 8 6"/>',
  stepForward: '<path d="M5 5v14"/><path d="M9 6l8 6-8 6"/>',
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
      <section class="session-dashboard" data-v6-session-dashboard hidden aria-label="Session dashboard">
        <header class="session-dashboard-header">
          <div>
            <strong>Testing</strong>
            <span>Replay sessions</span>
          </div>
        </header>
        <main class="session-dashboard-main">
          <section class="session-dashboard-actions" aria-label="Backtesting session">
            <button type="button" class="quick-session-card" data-v6-quick-session-open>
              ${icon('plus')}
              <span>
                <strong>Backtesting session</strong>
                <em>Start a session</em>
              </span>
            </button>
            <div class="quick-session-backdrop" data-v6-quick-session-modal hidden>
              <form class="quick-session-dialog" data-v6-session-setup-form>
                <header class="quick-session-header">
                  <strong>Create a quick session</strong>
                  <button type="button" class="quick-session-icon-button" data-v6-quick-session-close aria-label="Close quick session">${icon('close')}</button>
                </header>
                <div class="quick-session-tabs" aria-label="Session type">
                  <button type="button" class="is-active">Backtesting Session</button>
                </div>
                <label class="quick-session-field">
                  <span>Name *</span>
                  <input name="name" type="text" value="test" placeholder="Name your session" data-v6-session-setup-name>
                </label>
                <label class="quick-session-field">
                  <span>Account Balance *</span>
                  <input name="accountBalance" type="number" min="0" step="1" value="100000" data-v6-session-setup-balance>
                </label>
                <section class="quick-session-field quick-session-assets" data-v6-session-assets>
                  <header>
                    <span>Assets *</span>
                    <button type="button" disabled>Request asset</button>
                  </header>
                  <button type="button" class="asset-picker-control" data-v6-asset-picker-toggle aria-expanded="false">
                    <span data-v6-selected-asset-chips></span>
                    ${icon('chevronDown')}
                  </button>
                  <div class="asset-hidden-inputs" data-v6-selected-asset-inputs></div>
                  <div class="asset-picker-menu" data-v6-asset-picker-menu hidden>
                    <strong>Available assets</strong>
                    <button type="button" class="asset-option" data-v6-asset-option="NQ"><span>NQ <em>E-Mini NASDAQ-100 Futures</em></span><span>US Futures</span></button>
                    <button type="button" class="asset-option" data-v6-asset-option="ES"><span>ES <em>E-Mini S&amp;P 500 Futures</em></span><span>US Futures</span></button>
                  </div>
                </section>
                <label class="quick-session-field">
                  <span>Select Chart Layout (Optional) ${icon('info')}</span>
                  <button type="button" class="layout-placeholder" disabled>${icon('chevronDown')}</button>
                </label>
                <div class="quick-session-date-grid">
                  <div class="quick-session-date-fields">
                    <label class="quick-session-field">
                      <span>Initial Date *</span>
                      <input name="startTime" type="datetime-local" value="2026-06-01T09:30" data-v6-session-setup-start>
                      <small>Min: Jan 4, 2012</small>
                    </label>
                    <label class="quick-session-field">
                      <span>End Date *</span>
                      <input name="endTime" type="datetime-local" value="2026-06-05T16:00" data-v6-session-setup-end>
                      <input name="computedEndTime" type="hidden" value="2026-06-05T16:00" data-v6-session-setup-computed-end>
                      <small>Max: Jul 5, 2026</small>
                    </label>
                  </div>
                  <div class="quick-session-date-actions">
                    <button type="button" data-v6-date-offset-days="1">+1D</button>
                    <button type="button" data-v6-date-offset-days="7">+1W</button>
                    <button type="button" data-v6-date-offset-days="30">+1M</button>
                    <button type="button" disabled>Random</button>
                  </div>
                </div>
                <label class="auto-end-toggle" title="Automatically keeps the session end date updated to the most recent data available.">
                  <input name="autoUpdateEndDate" type="checkbox" data-v6-session-auto-end>
                  <span></span>
                  <strong>Auto-update end date ${icon('info')}</strong>
                </label>
                <footer class="quick-session-footer">
                  <span data-v6-session-setup-status>No bars are loaded on create.</span>
                  <button type="button" data-v6-quick-session-cancel>Cancel</button>
                  <button type="submit" data-v6-dashboard-create-session>Create session</button>
                </footer>
              </form>
            </div>
          </section>
          <section class="session-dashboard-list-section" aria-label="Recent Sessions">
            <header>
              <strong><span>Recent Sessions</span></strong>
              <button type="button" data-v6-dashboard-refresh>${icon('redo')}<span>Refresh</span></button>
            </header>
            <div class="session-dashboard-list-tools">
              <label>
                ${icon('search')}
                <input type="search" placeholder="Search Here" data-v6-dashboard-search>
              </label>
              <button type="button" data-v6-dashboard-sort aria-label="Sort recent sessions">${icon('sort')}<span data-v6-dashboard-sort-label>Newest to oldest</span>${icon('chevronDown')}</button>
            </div>
            <ul class="session-dashboard-list" data-v6-dashboard-session-list></ul>
            <p class="session-dashboard-empty" data-v6-dashboard-empty>No replay sessions yet</p>
            <footer class="session-dashboard-pager" data-v6-dashboard-pager>
              <label>Rows per page
                <select data-v6-dashboard-page-size>
                  <option value="2">2</option>
                  <option value="5" selected>5</option>
                  <option value="10">10</option>
                </select>
              </label>
              <span data-v6-dashboard-page-readout>1 of 1</span>
              <div>
                <button type="button" data-v6-dashboard-page-prev aria-label="Previous recent sessions page">${icon('arrowLeft')}</button>
                <button type="button" data-v6-dashboard-page-next aria-label="Next recent sessions page">${icon('arrowRight')}</button>
              </div>
            </footer>
          </section>
          <section class="session-dashboard-analytics" data-v6-dashboard-analytics aria-label="Analytics">
            <header>${icon('indicators')}<strong>Analytics</strong></header>
            <p>Session segment analysis placeholder for replay orders, live orders, and review statistics.</p>
          </section>
        </main>
      </section>
      <header class="top-bar" data-v6-workstation-header>
        <div class="top-tool-group top-tool-group-left" aria-label="Session and symbol tools">
          <button type="button" class="tool-button tool-button-icon" data-v6-top-back data-v6-dashboard-toggle aria-controls="v6-session-dashboard" aria-expanded="false" aria-pressed="false" aria-label="Back to session dashboard">${icon('arrowLeft')}<span class="sr-only">Back to session dashboard</span></button>
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
                <button type="button" class="layout-option is-selected" data-v6-layout-mode="single" data-v6-layout-variant="single" role="menuitem" aria-checked="true">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 5;'])}</button>
              </section>
              <section class="layout-menu-row" aria-label="Two panes">
                <span class="layout-row-index">2</span>
                <button type="button" class="layout-option" data-v6-layout-mode="twice" data-v6-layout-variant="twice-vertical" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
                <button type="button" class="layout-option" data-v6-layout-mode="twice" data-v6-layout-variant="twice-horizontal" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 3;', 'grid-column: 1 / 5; grid-row: 3 / 5;'])}</button>
              </section>
              <section class="layout-menu-row" aria-label="Three panes">
                <span class="layout-row-index">3</span>
                <button type="button" class="layout-option" data-v6-layout-mode="triple" data-v6-layout-variant="triple-columns" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 2; grid-row: 1 / 5;', 'grid-column: 2 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
                <button type="button" class="layout-option" data-v6-layout-mode="triple" data-v6-layout-variant="triple-rows" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 5; grid-row: 1 / 2;', 'grid-column: 1 / 5; grid-row: 2 / 3;', 'grid-column: 1 / 5; grid-row: 3 / 5;'])}</button>
                <button type="button" class="layout-option" data-v6-layout-mode="triple" data-v6-layout-variant="triple-right-stack" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 3;', 'grid-column: 3 / 5; grid-row: 3 / 5;'])}</button>
                <button type="button" class="layout-option" data-v6-layout-mode="triple" data-v6-layout-variant="triple-left-stack" role="menuitem" aria-checked="false">${layoutPreview(['grid-column: 1 / 3; grid-row: 1 / 3;', 'grid-column: 1 / 3; grid-row: 3 / 5;', 'grid-column: 3 / 5; grid-row: 1 / 5;'])}</button>
              </section>
              <section class="layout-sync-section" aria-label="Sync in layout">
                <div class="layout-menu-heading">Sync in layout</div>
                <label data-v6-layout-sync-row="symbol" title="Symbol changes on all charts within the layout">
                  <span>Symbol <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked data-v6-layout-sync="symbol" aria-label="Sync symbol across panes">
                </label>
                <label data-v6-layout-sync-row="interval" title="Interval changes on all charts within the layout">
                  <span>Interval <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked data-v6-layout-sync="interval" aria-label="Sync interval across panes">
                </label>
                <label data-v6-layout-sync-row="crosshair" title="Crosshair is synced across all charts within the layout">
                  <span>Crosshair <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" data-v6-layout-sync="crosshair" aria-label="Sync crosshair across panes">
                </label>
                <label data-v6-layout-sync-row="time" title="When a chart is clicked, all charts within the layout display the same point of time">
                  <span>Time <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" checked data-v6-layout-sync="time" aria-label="Sync clicked time across panes">
                </label>
                <label data-v6-layout-sync-row="date-range" title="Date range changes on all charts within the layout">
                  <span>Date range <span class="layout-info-icon">${icon('info')}</span></span>
                  <input type="checkbox" data-v6-layout-sync="dateRange" aria-label="Sync date range across panes">
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
            <span class="readiness-telemetry" data-v6-readiness-runtime-count hidden aria-hidden="true">0 services active</span>
            <span class="readiness-telemetry" data-v6-readiness-command-count hidden aria-hidden="true">Setup pending</span>
            <span class="readiness-telemetry" data-v6-readiness-gate-count hidden aria-hidden="true">Core checks pending</span>
            <ul class="readiness-gates" data-v6-readiness-gates hidden aria-hidden="true"></ul>
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
        <aside class="left-drawing-rail" data-v6-left-drawing-rail aria-label="Drawing tool rail">
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="cursor" disabled aria-label="Cursor tool" title="Cursor tool">
            ${icon('crosshair')}
            <span class="sr-only">Cursor tool</span>
          </button>
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="trend-line" disabled aria-label="Trend line tool" title="Trend line tool">
            ${icon('arrowRight')}
            <span class="sr-only">Trend line tool</span>
          </button>
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="horizontal-line" disabled aria-label="Horizontal line tool" title="Horizontal line tool">
            ${icon('minus')}
            <span class="sr-only">Horizontal line tool</span>
          </button>
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="rectangle" disabled aria-label="Rectangle tool" title="Rectangle tool">
            ${icon('rectangle')}
            <span class="sr-only">Rectangle tool</span>
          </button>
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="measure" disabled aria-label="Measure tool" title="Measure tool">
            ${icon('ruler')}
            <span class="sr-only">Measure tool</span>
          </button>
          <button type="button" class="drawing-rail-button" data-v6-left-drawing-tool="text" disabled aria-label="Text note tool" title="Text note tool">
            ${icon('pencil')}
            <span class="sr-only">Text note tool</span>
          </button>
        </aside>
        <section class="chart-surface" aria-label="Replay chart surface" data-v6-chart-surface>
          <div class="chart-pane-layer" data-v6-chart-pane-layer>
            <div class="chart-engine-host" data-v6-chart-engine-host data-v6-pane-id="main" data-v6-layout-pane-slot="1" data-v6-chart-pane-visible="true">
              <div class="symbol-readout pane-status-readout" data-v6-status-readout data-v6-pane-status-readout data-v6-pane-id="main" data-v6-pane-symbol="NQ" data-v6-pane-timeframe="1m">
                <span class="status-dot" aria-hidden="true"></span>
                <strong data-v6-status-symbol data-v6-pane-status-field>NQ</strong>
                <span data-v6-status-timeframe data-v6-pane-status-field>1m</span>
                <span data-v6-status-open data-v6-pane-status-field>O --</span>
                <span data-v6-status-high data-v6-pane-status-field>H --</span>
                <span data-v6-status-low data-v6-pane-status-field>L --</span>
                <span data-v6-status-close data-v6-pane-status-field>C --</span>
              </div>
              <div class="chart-pane-action-rail" data-v6-chart-pane-action-rail data-v6-pane-id="main">
                <button type="button" class="chart-pane-action-button chart-maximize-restore-button" data-v6-chart-maximize-restore data-v6-chart-maximize-pane-id="main" aria-label="Maximize chart" title="Maximize chart">
                  ${icon('fullscreen')}
                  <span class="sr-only" data-v6-chart-maximize-label>Maximize chart</span>
                </button>
                <button type="button" class="chart-pane-action-button chart-reset-view-button" data-v6-reset-view data-v6-reset-pane-id="main" aria-label="Reset main pane view" title="Reset chart view">
                  ${icon('redo')}
                  <span class="sr-only">Reset main pane view</span>
                </button>
              </div>
            </div>
            <div class="chart-engine-host" data-v6-chart-engine-host data-v6-pane-id="secondary" data-v6-layout-pane-slot="2" data-v6-chart-pane-visible="false" hidden aria-hidden="true">
              <div class="symbol-readout pane-status-readout" data-v6-status-readout data-v6-pane-status-readout data-v6-pane-id="secondary" data-v6-pane-symbol="NQ" data-v6-pane-timeframe="1m">
                <span class="status-dot" aria-hidden="true"></span>
                <strong data-v6-status-symbol data-v6-pane-status-field>NQ</strong>
                <span data-v6-status-timeframe data-v6-pane-status-field>1m</span>
                <span data-v6-status-open data-v6-pane-status-field>O --</span>
                <span data-v6-status-high data-v6-pane-status-field>H --</span>
                <span data-v6-status-low data-v6-pane-status-field>L --</span>
                <span data-v6-status-close data-v6-pane-status-field>C --</span>
              </div>
              <div class="chart-pane-action-rail" data-v6-chart-pane-action-rail data-v6-pane-id="secondary">
                <button type="button" class="chart-pane-action-button chart-maximize-restore-button" data-v6-chart-maximize-restore data-v6-chart-maximize-pane-id="secondary" aria-label="Maximize chart" title="Maximize chart">
                  ${icon('fullscreen')}
                  <span class="sr-only" data-v6-chart-maximize-label>Maximize chart</span>
                </button>
                <button type="button" class="chart-pane-action-button chart-reset-view-button" data-v6-reset-view data-v6-reset-pane-id="secondary" aria-label="Reset secondary pane view" title="Reset chart view">
                  ${icon('redo')}
                  <span class="sr-only">Reset secondary pane view</span>
                </button>
              </div>
            </div>
            <div class="chart-engine-host" data-v6-chart-engine-host data-v6-pane-id="tertiary" data-v6-layout-pane-slot="3" data-v6-chart-pane-visible="false" hidden aria-hidden="true">
              <div class="symbol-readout pane-status-readout" data-v6-status-readout data-v6-pane-status-readout data-v6-pane-id="tertiary" data-v6-pane-symbol="NQ" data-v6-pane-timeframe="1m">
                <span class="status-dot" aria-hidden="true"></span>
                <strong data-v6-status-symbol data-v6-pane-status-field>NQ</strong>
                <span data-v6-status-timeframe data-v6-pane-status-field>1m</span>
                <span data-v6-status-open data-v6-pane-status-field>O --</span>
                <span data-v6-status-high data-v6-pane-status-field>H --</span>
                <span data-v6-status-low data-v6-pane-status-field>L --</span>
                <span data-v6-status-close data-v6-pane-status-field>C --</span>
              </div>
              <div class="chart-pane-action-rail" data-v6-chart-pane-action-rail data-v6-pane-id="tertiary">
                <button type="button" class="chart-pane-action-button chart-maximize-restore-button" data-v6-chart-maximize-restore data-v6-chart-maximize-pane-id="tertiary" aria-label="Maximize chart" title="Maximize chart">
                  ${icon('fullscreen')}
                  <span class="sr-only" data-v6-chart-maximize-label>Maximize chart</span>
                </button>
                <button type="button" class="chart-pane-action-button chart-reset-view-button" data-v6-reset-view data-v6-reset-pane-id="tertiary" aria-label="Reset tertiary pane view" title="Reset chart view">
                  ${icon('redo')}
                  <span class="sr-only">Reset tertiary pane view</span>
                </button>
              </div>
            </div>
          </div>
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
            <details class="session-settings-panel-anchor" data-v6-session-settings-details>
              <summary class="rail-button rail-button-icon" data-v6-rail-session-settings aria-label="Session settings" aria-haspopup="dialog">
                ${icon('gear')}
                <span class="sr-only">Session settings</span>
              </summary>
              <section class="session-settings-panel" data-v6-session-settings-panel role="dialog" aria-label="Session settings panel">
                <header>
                  <strong>Session settings</strong>
                  <span>Session shell</span>
                </header>
                <div class="session-settings-panel-body">
                  <fieldset>
                    <legend>Session Info</legend>
                    <label>
                      <span>Name</span>
                      <input type="text" value="Backtesting session" disabled data-v6-session-settings-name>
                    </label>
                    <label>
                      <span>Profile</span>
                      <select disabled data-v6-session-settings-profile>
                        <option>Default profile</option>
                      </select>
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Balance & Assets</legend>
                    <label>
                      <span>Balance</span>
                      <input type="text" value="--" disabled data-v6-session-settings-balance>
                    </label>
                    <label>
                      <span>Asset</span>
                      <select disabled data-v6-session-settings-asset>
                        <option>USD</option>
                      </select>
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Spreads & Commissions</legend>
                    <label>
                      <span>Spread</span>
                      <input type="number" value="0" disabled data-v6-session-settings-spread>
                    </label>
                    <label>
                      <span>Commission</span>
                      <input type="number" value="0" disabled data-v6-session-settings-commission>
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Date Range</legend>
                    <label>
                      <span>Start</span>
                      <input type="text" value="Session start" disabled data-v6-session-settings-start>
                    </label>
                    <label>
                      <span>End</span>
                      <input type="text" value="Session end" disabled data-v6-session-settings-end>
                    </label>
                  </fieldset>
                </div>
                <footer>
                  <button type="button" disabled data-v6-session-settings-template>Template</button>
                  <button type="button" disabled data-v6-session-settings-apply>Apply</button>
                </footer>
              </section>
            </details>
          </div>
        </aside>
      </main>
      <section class="bottom-account-chrome" data-v6-bottom-account-chrome aria-label="Account and trading chrome">
        <div class="bottom-trade-actions" aria-label="Trade placeholders">
          <button type="button" class="bottom-trade-button bottom-trade-button-buy" data-v6-bottom-buy disabled aria-label="Buy placeholder">Buy</button>
          <button type="button" class="bottom-trade-button bottom-trade-button-sell" data-v6-bottom-sell disabled aria-label="Sell placeholder">Sell</button>
          <label class="bottom-quantity-field" aria-label="Quantity placeholder">
            <span>Qty</span>
            <input type="number" value="1" min="1" disabled data-v6-bottom-quantity>
          </label>
        </div>
        <div class="bottom-account-readouts" aria-label="Account readouts">
          <span data-v6-bottom-account-balance>Balance --</span>
          <span data-v6-bottom-realized-pnl>Realized --</span>
          <span data-v6-bottom-unrealized-pnl>Unrealized --</span>
          <button type="button" class="bottom-analytics-button" data-v6-bottom-analytics disabled aria-label="Analytics placeholder">Analytics</button>
        </div>
      </section>
      <div class="transport-placeholder" aria-label="Replay transport" data-v6-transport>
        <button type="button" class="transport-grip" data-v6-transport-drag-handle aria-label="Drag replay controls">${icon('grip')}</button>
        <button type="button" class="transport-icon-button" data-v6-transport-action="restart" data-v6-transport-restart disabled aria-label="Restart available after replay ends" title="Restart replay">${icon('restart')}</button>
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
            <button type="button" role="menuitemradio" data-v6-transport-period-option="1s">1s</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="5s">5s</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="10s">10s</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="15s">15s</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="30s">30s</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="1m">1m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="3m">3m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="5m">5m</button>
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
