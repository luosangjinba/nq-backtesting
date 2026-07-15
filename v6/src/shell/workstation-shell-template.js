import { createDisplayTimeframeMenuGroups } from '../display-timeframe/display-timeframe-capabilities.js';

const ICONS = {
  arrowLeft: '<path d="M15 18l-6-6 6-6"/><path d="M9 12h12"/>',
  arrowRight: '<path d="M9 18l6-6-6-6"/><path d="M3 12h12"/>',
  camera: '<path d="M7 7l1.8-2h6.4L17 7h3v12H4V7z"/><circle cx="12" cy="13" r="3"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  fullscreen: '<path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  grip: '<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
  indicators: '<path d="M4 18V6"/><path d="M10 18V10"/><path d="M16 18V4"/><path d="M21 18H3"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  listFilter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  minus: '<path d="M5 12h14"/>',
  pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M20 13a7 7 0 1 0-2 5"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 8v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
  sort: '<path d="M7 4v16"/><path d="M4 7l3-3 3 3"/><path d="M17 20V4"/><path d="M14 17l3 3 3-3"/>',
  stepBack: '<path d="M19 5v14"/><path d="M15 6l-8 6 8 6"/>',
  stepForward: '<path d="M5 5v14"/><path d="M9 6l8 6-8 6"/>',
};

function icon(name) {
  return `<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

function layoutPreview(cells) {
  return `<span class="layout-preview" aria-hidden="true">${cells.map((cell) => `<span style="${cell}"></span>`).join('')}</span>`;
}

function renderDisplayTimeframeMenuOption(item) {
  if (item.status === 'enabled') {
    return `<button type="button" data-v6-display-timeframe-option="${item.runtimeValue}" data-v6-display-timeframe-capability="${item.id}" role="menuitemradio" aria-checked="${item.runtimeValue === 1 ? 'true' : 'false'}">${item.label}</button>`;
  }
  return `<button type="button" disabled data-v6-display-timeframe-planned="${item.id}" role="menuitem" title="${item.sourceRequirement} required">${item.label}</button>`;
}

function renderDisplayTimeframeMenuSections() {
  return createDisplayTimeframeMenuGroups().map((group) => `
              <section class="timeframe-menu-section" aria-label="${group.label}">
                <div class="timeframe-menu-heading">${group.label}</div>
                ${group.items.map(renderDisplayTimeframeMenuOption).join('\n                ')}
              </section>
  `).join('');
}

export function createWorkstationShellMarkup() {
  return `
    <section class="workstation-shell" data-v6-workstation-shell>
      <section class="session-dashboard" data-v6-session-dashboard hidden aria-label="Session dashboard">
        <header class="session-dashboard-header">
          <div>
            <span>Practice workspace</span>
            <strong>Replay sessions</strong>
            <p>Create, resume, and review historical market practice.</p>
          </div>
        </header>
        <main class="session-dashboard-main">
          <section class="session-dashboard-actions" aria-label="Backtesting session">
            <button type="button" class="quick-session-card" data-v6-quick-session-open>
              ${icon('plus')}
              <span>
                <strong>Create replay session</strong>
                <em>Choose a market and historical range</em>
              </span>
            </button>
            <div class="quick-session-backdrop" data-v6-quick-session-modal hidden>
              <form class="quick-session-dialog" data-v6-session-setup-form>
                <header class="quick-session-header">
                  <div>
                    <span>Replay workspace</span>
                    <strong>Create session</strong>
                    <p>Choose the market and historical window you want to practice.</p>
                  </div>
                  <button type="button" class="quick-session-icon-button" data-v6-quick-session-close aria-label="Close quick session">${icon('close')}</button>
                </header>
                <div class="quick-session-tabs" aria-label="Session type">
                  <button type="button" class="is-active">Historical replay</button>
                </div>
                <label class="quick-session-field">
                  <span>Name *</span>
                  <input name="name" type="text" value="test" placeholder="Name your session" data-v6-session-setup-name>
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
                    <header><strong>Available markets</strong><span>Select one or more</span></header>
                    <button type="button" class="asset-option" data-v6-asset-option="NQ"><span class="asset-option-symbol">NQ</span><span class="asset-option-name">E-mini Nasdaq-100 Futures</span><span class="asset-option-market">CME</span><i aria-hidden="true"></i></button>
                    <button type="button" class="asset-option" data-v6-asset-option="ES"><span class="asset-option-symbol">ES</span><span class="asset-option-name">E-mini S&amp;P 500 Futures</span><span class="asset-option-market">CME</span><i aria-hidden="true"></i></button>
                  </div>
                </section>
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
              <div><strong>Recent sessions</strong><span>Continue where you left off or review prior work.</span></div>
              <button type="button" data-v6-dashboard-refresh>${icon('redo')}<span>Refresh</span></button>
            </header>
            <div class="session-dashboard-list-tools">
              <label>
                ${icon('search')}
                <input type="search" placeholder="Search sessions" data-v6-dashboard-search>
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
        </main>
      </section>
      <header class="top-bar" data-v6-workstation-header>
        <div class="top-tool-group top-tool-group-left" aria-label="Session and symbol tools">
          <button type="button" class="tool-button tool-button-icon" data-v6-top-back data-v6-dashboard-toggle aria-controls="v6-session-dashboard" aria-expanded="false" aria-pressed="false" aria-label="Back to session dashboard">${icon('arrowLeft')}<span class="sr-only">Back to session dashboard</span></button>
          <h1>FX Session Replay</h1>
          <span class="top-symbol" data-v6-top-symbol>NQ</span>
        </div>
        <div class="top-tool-group top-tool-group-main" aria-label="Chart tools">
          <div class="timeframe-menu-anchor">
            <button type="button" class="interval-command" data-v6-top-interval data-v6-display-timeframe-toggle aria-haspopup="true" aria-expanded="false" aria-controls="v6-timeframe-menu" aria-label="Interval menu">
              <span data-v6-display-timeframe-label>1m</span>
            </button>
            <div id="v6-timeframe-menu" class="timeframe-menu" data-v6-display-timeframe-menu hidden role="menu" aria-label="Interval menu">
${renderDisplayTimeframeMenuSections()}
            </div>
          </div>
        </div>
        <div class="top-session-group" aria-label="Session identity">
          <span class="profile-chip" data-v6-top-profile data-v6-session-name>test</span>
        </div>
        <div class="top-tool-group top-tool-group-right" aria-label="Account and utility tools">
          <details class="rail-popover-anchor top-goto-anchor" data-v6-rail-goto-details>
            <summary class="tool-button tool-button-icon" data-v6-rail-goto aria-label="Go to key time" aria-haspopup="menu">
              ${icon('arrowRight')}<span class="sr-only">Go to key time</span>
            </summary>
            <div class="rail-popover" data-v6-rail-goto-menu role="menu" aria-label="Go to key time">
              <button type="button" data-v6-replay-navigation-action="next-day-open" role="menuitem">Next Day Open <kbd>Y</kbd></button>
              <button type="button" data-v6-replay-navigation-action="next-session" role="menuitem">Next Session <kbd>Z</kbd></button>
              <button type="button" data-v6-replay-navigation-action="asian-session" role="menuitem">Asian Session <kbd>I</kbd></button>
              <button type="button" data-v6-replay-navigation-action="london-session" role="menuitem">London Session <kbd>L</kbd></button>
              <button type="button" data-v6-replay-navigation-action="new-york-session" role="menuitem">New York Session <kbd>N</kbd></button>
              <button type="button" data-v6-replay-navigation-settings-open aria-expanded="false" aria-haspopup="dialog" role="menuitem">Custom Settings</button>
              <p class="rail-popover-status" data-v6-replay-navigation-status role="status" aria-live="polite"></p>
            </div>
          </details>
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
          <button type="button" class="tool-button tool-button-icon" data-v6-settings-toggle aria-controls="v6-settings-panel" aria-expanded="false" aria-pressed="false" aria-label="Settings">${icon('gear')}<span class="sr-only">Settings</span></button>
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
              <button type="button" class="is-active" data-v6-settings-tab="canvas" aria-selected="true">${icon('camera')}<span>Canvas</span></button>
              <button type="button" data-v6-settings-tab="symbol" aria-selected="false">${icon('indicators')}<span>Symbol</span></button>
              <button type="button" data-v6-settings-tab="status" aria-selected="false">${icon('menu')}<span>Status line</span></button>
              <button type="button" data-v6-settings-tab="scales" aria-selected="false">${icon('arrow-right')}<span>Scales and lines</span></button>
            </nav>
            <div class="settings-modal-content">
              <div data-v6-settings-tab-panel="canvas">
              <section class="settings-field-group" aria-label="Canvas">
                <div class="settings-group-heading">Chart basic styles</div>
                <label class="settings-control-row">
                  <span>Background</span>
                  <input type="color" data-v6-settings-field="chartBackgroundColor" value="#0f1721" aria-label="Chart background color">
                </label>
                <label class="settings-check-row">
                  <input type="checkbox" data-v6-settings-field="chartGrid" checked>
                  <span>Grid lines</span>
                  <input type="color" data-v6-settings-field="chartGridColor" value="#263441" aria-label="Grid line color">
                </label>
                <label class="settings-control-row">
                  <span>Crosshair</span>
                  <input type="color" data-v6-settings-field="chartCrosshairColor" value="#758696" aria-label="Crosshair color">
                </label>
              </section>
              <section class="settings-field-group" aria-label="Day separators">
                <div class="settings-group-heading">Day separators</div>
                <label class="settings-control-row">
                  <span>Show</span>
                  <select data-v6-settings-field="chartDaySeparators" aria-label="Day separators">
                    <option value="off">Hidden</option>
                    <option value="trading">Trading day · 18:00 ET</option>
                    <option value="ict">ICT day · 00:00 ET</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label class="settings-control-row">
                  <span>Trading day · 18:00 ET</span>
                  <span class="settings-inline-controls">
                    <input type="color" data-v6-settings-field="chartTradingDaySeparatorColor" value="#3b82f6" aria-label="Trading day separator color">
                    <select data-v6-settings-field="chartTradingDaySeparatorStyle" aria-label="Trading day separator style">
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </span>
                </label>
                <label class="settings-control-row">
                  <span>ICT day · 00:00 ET</span>
                  <span class="settings-inline-controls">
                    <input type="color" data-v6-settings-field="chartIctDaySeparatorColor" value="#a855f7" aria-label="ICT day separator color">
                    <select data-v6-settings-field="chartIctDaySeparatorStyle" aria-label="ICT day separator style">
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted" selected>Dotted</option>
                    </select>
                  </span>
                </label>
              </section>
              <section class="settings-field-group" aria-label="Scales">
                <div class="settings-group-heading">Scales</div>
                <label class="settings-control-row">
                  <span>Text</span>
                  <span class="settings-inline-controls">
                    <input type="color" data-v6-settings-field="chartScaleTextColor" value="#c9d6df" aria-label="Scale text color">
                    <input type="number" min="10" max="20" step="1" data-v6-settings-field="chartScaleFontSize" value="12" aria-label="Scale font size">
                  </span>
                </label>
                <label class="settings-control-row">
                  <span>Axis lines</span>
                  <input type="color" data-v6-settings-field="chartAxisBorderColor" value="#163345" aria-label="Axis border color">
                </label>
              </section>
              <section class="settings-field-group" aria-label="Canvas view">
                <div class="settings-group-heading">View and controls</div>
                <label class="settings-control-row">
                  <span>Navigation</span>
                  <select data-v6-settings-field="chartNavigationVisibility" aria-label="Chart navigation visibility">
                    <option value="hover">Visible on mouse over</option>
                    <option value="always">Always visible</option>
                    <option value="hidden">Always hidden</option>
                  </select>
                </label>
                <label class="settings-control-row">
                  <span>Top margin</span>
                  <span class="settings-number-unit"><input type="number" min="0" max="40" step="1" data-v6-settings-field="chartTopMarginPercent" value="10" aria-label="Top margin percent"><span>%</span></span>
                </label>
                <label class="settings-control-row">
                  <span>Bottom margin</span>
                  <span class="settings-number-unit"><input type="number" min="0" max="40" step="1" data-v6-settings-field="chartBottomMarginPercent" value="8" aria-label="Bottom margin percent"><span>%</span></span>
                </label>
                <label class="settings-control-row">
                  <span>Right margin</span>
                  <span class="settings-number-unit"><input type="number" min="0" max="100" step="1" data-v6-settings-field="chartRightMarginBars" value="8" aria-label="Right margin bars"><span>bars</span></span>
                </label>
                <p class="settings-scope-note">Changes apply to every chart pane only after Ok.</p>
              </section>
              </div>
              <div data-v6-settings-tab-panel="symbol" hidden>
                <section class="settings-field-group" aria-label="Candles">
                  <div class="settings-group-heading">Candles</div>
                  <label class="settings-symbol-candle-row">
                    <span class="settings-symbol-candle-spacer" aria-hidden="true"></span>
                    <span>Body</span>
                    <input type="color" data-v6-settings-field="symbolUpBodyColor" value="#36b7a8" aria-label="Up candle body color">
                    <input type="color" data-v6-settings-field="symbolDownBodyColor" value="#f25f68" aria-label="Down candle body color">
                  </label>
                  <label class="settings-check-row settings-symbol-candle-row">
                    <input type="checkbox" data-v6-settings-field="symbolBordersVisible">
                    <span>Borders</span>
                    <input type="color" data-v6-settings-field="symbolUpBorderColor" value="#36b7a8" aria-label="Up candle border color">
                    <input type="color" data-v6-settings-field="symbolDownBorderColor" value="#f25f68" aria-label="Down candle border color">
                  </label>
                  <label class="settings-symbol-candle-row">
                    <span class="settings-symbol-candle-spacer" aria-hidden="true"></span>
                    <span>Wicks</span>
                    <input type="color" data-v6-settings-field="symbolUpWickColor" value="#2a958b" aria-label="Up candle wick color">
                    <input type="color" data-v6-settings-field="symbolDownWickColor" value="#c94c58" aria-label="Down candle wick color">
                  </label>
                </section>
                <section class="settings-field-group" aria-label="Price format">
                  <div class="settings-group-heading">Data modification</div>
                  <label class="settings-control-row">
                    <span>Precision</span>
                    <select data-v6-settings-field="symbolPricePrecision" aria-label="Price precision">
                      <option value="auto">Auto</option>
                      <option value="0">0 decimals</option>
                      <option value="1">1 decimal</option>
                      <option value="2">2 decimals</option>
                      <option value="3">3 decimals</option>
                      <option value="4">4 decimals</option>
                      <option value="5">5 decimals</option>
                      <option value="6">6 decimals</option>
                    </select>
                  </label>
                  <p class="settings-scope-note">Auto uses the current series default until symbol tick metadata is available.</p>
                </section>
              </div>
              <div data-v6-settings-tab-panel="status" hidden>
                <section class="settings-field-group" aria-label="Status line content">
                  <div class="settings-group-heading">Content</div>
                  <label class="settings-control-row">
                    <span>Title</span>
                    <select data-v6-settings-field="statusTitleMode" aria-label="Status line title">
                      <option value="ticker">Ticker</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </label>
                  <label class="settings-check-row">
                    <input type="checkbox" data-v6-settings-field="statusOhlcVisible" checked>
                    <span>Chart values (OHLC)</span>
                  </label>
                  <label class="settings-check-row">
                    <input type="checkbox" data-v6-settings-field="statusBarChangeVisible" checked>
                    <span>Bar change values</span>
                  </label>
                  <p class="settings-scope-note">Market status waits for exchange-calendar truth. Volume waits for verified source provenance.</p>
                </section>
                <section class="settings-field-group" aria-label="Status line background">
                  <div class="settings-group-heading">Background</div>
                  <label class="settings-control-row">
                    <span>Color</span>
                    <input type="color" data-v6-settings-field="statusBackgroundColor" value="#0f1721" aria-label="Status line background color">
                  </label>
                  <label class="settings-control-row">
                    <span>Opacity</span>
                    <span class="settings-number-unit"><input type="number" min="0" max="100" step="5" data-v6-settings-field="statusBackgroundOpacityPercent" value="0" aria-label="Status line background opacity"><span>%</span></span>
                  </label>
                </section>
              </div>
              <div data-v6-settings-tab-panel="scales" hidden>
                <section class="settings-field-group" aria-label="Current price">
                  <div class="settings-group-heading">Current price</div>
                  <label class="settings-check-row"><input type="checkbox" data-v6-settings-field="currentPriceNameVisible" checked><span>Symbol name</span></label>
                  <label class="settings-check-row"><input type="checkbox" data-v6-settings-field="currentPriceValueVisible" checked><span>Price value</span></label>
                  <label class="settings-check-row"><input type="checkbox" data-v6-settings-field="currentPriceLineVisible" checked><span>Price line</span></label>
                  <p class="settings-scope-note">Applies to the current-price label and line on every pane.</p>
                </section>
                <section class="settings-field-group" aria-label="Time presentation">
                  <div class="settings-group-heading">Time presentation</div>
                  <label class="settings-control-row"><span>Timezone</span><select data-v6-settings-field="displayTimezone" aria-label="Display timezone"><option value="exchange">Exchange · New York</option><option value="utc">UTC</option><option value="local">Local</option></select></label>
                  <label class="settings-control-row"><span>Date format</span><select data-v6-settings-field="dateFormat" aria-label="Date format"><option value="yyyy/mm/dd">YYYY/MM/DD</option><option value="yyyy-mm-dd">YYYY-MM-DD</option><option value="dd/mm/yyyy">DD/MM/YYYY</option><option value="mm/dd/yyyy">MM/DD/YYYY</option></select></label>
                  <label class="settings-check-row"><input type="checkbox" data-v6-settings-field="showDayOfWeek" checked><span>Day of week on crosshair</span></label>
                  <label class="settings-control-row"><span>Hours format</span><select data-v6-settings-field="timeFormat" aria-label="Time hours format"><option value="24h">24-hour</option><option value="12h">12-hour</option></select></label>
                </section>
              </div>
            </div>
          </div>
          <footer class="settings-modal-footer">
            <button type="button" class="settings-template-button" data-v6-settings-reset-draft>Reset</button>
            <div class="settings-footer-actions">
              <button type="button" data-v6-settings-close-secondary>Cancel</button>
              <button type="button" class="settings-ok-button" data-v6-settings-ok>Ok</button>
            </div>
          </footer>
        </div>
      </section>

      <main class="workstation-main" data-v6-workstation-main>
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
                <span data-v6-status-change data-v6-pane-status-field>--</span>
                <span class="target-history-diagnostics-readout" data-v6-target-history-diagnostics>History idle</span>
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
                <span data-v6-status-change data-v6-pane-status-field>--</span>
                <span class="target-history-diagnostics-readout" data-v6-target-history-diagnostics>History idle</span>
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
                <span data-v6-status-change data-v6-pane-status-field>--</span>
                <span class="target-history-diagnostics-readout" data-v6-target-history-diagnostics>History idle</span>
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
        <section class="replay-navigation-settings-backdrop" data-v6-replay-navigation-settings-dialog hidden role="dialog" aria-modal="true" aria-labelledby="v6-replay-navigation-settings-title">
          <form class="replay-navigation-settings-modal" data-v6-replay-navigation-settings-form>
            <header>
              <strong id="v6-replay-navigation-settings-title">Custom Settings</strong>
              <button type="button" data-v6-replay-navigation-settings-close aria-label="Close replay navigation settings">×</button>
            </header>
            <div class="replay-navigation-settings-body">
              <p>All session anchors use New York wall-clock time.</p>
              <fieldset>
                <legend>Replay navigation sessions</legend>
                <label>
                  <span>Next Day Open</span>
                  <input type="text" inputmode="text" autocomplete="off" required data-v6-replay-navigation-setting="dayOpen">
                </label>
                <label>
                  <span>Asian Session start</span>
                  <input type="text" inputmode="text" autocomplete="off" required data-v6-replay-navigation-setting="asianSession">
                </label>
                <label>
                  <span>London Session start</span>
                  <input type="text" inputmode="text" autocomplete="off" required data-v6-replay-navigation-setting="londonSession">
                </label>
                <label>
                  <span>New York Session start</span>
                  <input type="text" inputmode="text" autocomplete="off" required data-v6-replay-navigation-setting="newYorkSession">
                </label>
              </fieldset>
              <p class="replay-navigation-settings-error" data-v6-replay-navigation-settings-error role="alert" aria-live="assertive"></p>
            </div>
            <footer>
              <button type="button" data-v6-replay-navigation-settings-reset>Reset to defaults</button>
              <span></span>
              <button type="button" data-v6-replay-navigation-settings-close>Discard</button>
              <button type="submit" class="is-primary" data-v6-replay-navigation-settings-save>Save</button>
            </footer>
          </form>
        </section>
      </main>
      <div class="transport-placeholder" aria-label="Replay transport" data-v6-transport>
        <button type="button" class="transport-grip" data-v6-transport-drag-handle aria-label="Drag replay controls">${icon('grip')}</button>
        <button type="button" class="transport-icon-button" data-v6-transport-action="restart" data-v6-transport-restart disabled aria-label="Restart available after replay ends" title="Restart replay">${icon('restart')}</button>
        <label class="transport-speed-slider" aria-label="Replay speed">
          <input type="range" min="0.5" max="4" step="0.5" value="1" data-v6-transport-speed-slider>
        </label>
        <button type="button" class="transport-icon-button" data-v6-transport-step-back disabled aria-label="Previous replay bar">${icon('stepBack')}</button>
        <button type="button" class="transport-icon-button" aria-label="Play replay" data-v6-transport-action="play-toggle" aria-pressed="false">
          <span data-v6-transport-play-icon>${icon('play')}</span>
          <span data-v6-transport-pause-icon hidden>${icon('pause')}</span>
          <span class="sr-only" data-v6-transport-play-label>Play replay</span>
        </button>
        <details class="transport-period-menu-anchor" data-v6-transport-period-details>
          <summary class="transport-period-trigger" data-v6-transport-period-toggle aria-label="Replay step period">
            <span data-v6-transport-period-label>1m</span>
          </summary>
          <div class="transport-period-menu" data-v6-transport-period-menu role="menu" aria-label="Replay step period">
            <button type="button" role="menuitemradio" data-v6-transport-period-option="1m">1m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="3m">3m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="5m">5m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="15m">15m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="30m">30m</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="1h">1h</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="2h">2h</button>
            <button type="button" role="menuitemradio" data-v6-transport-period-option="4h">4h</button>
          </div>
        </details>
        <button type="button" class="transport-icon-button" aria-label="Next replay bar" data-v6-transport-action="next">${icon('stepForward')}</button>
        <label class="transport-sync-toggle" aria-label="Sync replay period with active chart">
          <input type="checkbox" data-v6-transport-period-sync>
          <span></span>
        </label>
      </div>

      <footer class="status-bar" data-v6-status-bar aria-live="polite" aria-atomic="true">
        <span class="replay-status-primary" data-v6-replay-status>Preparing replay…</span>
        <span class="replay-status-protection" data-v6-replay-protection hidden>Future data hidden</span>
      </footer>
    </section>
  `;
}
