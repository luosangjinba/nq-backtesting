export function createWorkstationShellMarkup() {
  return `
    <section class="workstation-shell" data-v6-workstation-shell>
      <header class="top-bar" data-v6-workstation-header>
        <div class="top-tool-group top-tool-group-left" aria-label="Market tools">
          <button type="button" class="icon-tool" data-v6-top-back disabled aria-label="Back">Back</button>
          <button type="button" class="icon-tool" data-v6-top-forward disabled aria-label="Forward">Fwd</button>
          <button type="button" class="icon-tool" data-v6-top-search disabled aria-label="Search symbol">Search</button>
          <h1>FX Session Replay</h1>
          <span class="top-symbol" data-v6-top-symbol>NQ</span>
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
          <button type="button" data-v6-top-layout disabled>Layout</button>
          <button type="button" data-v6-top-indicators disabled>Indicators</button>
          <button type="button" class="icon-tool" data-v6-top-undo disabled aria-label="Undo">Undo</button>
          <button type="button" class="icon-tool" data-v6-top-redo disabled aria-label="Redo">Redo</button>
        </div>
        <div class="top-actions" aria-label="V6 route actions">
          <button type="button" data-v6-sessions-toggle aria-controls="v6-sessions-panel" aria-expanded="false" aria-pressed="false">Sessions</button>
          <button type="button" data-v6-replay-workflow-toggle aria-controls="v6-replay-workflow-panel" aria-expanded="false" aria-pressed="false">Replay</button>
          <button type="button" data-v6-journal-toggle aria-controls="v6-journal-panel" aria-expanded="false" aria-pressed="false">Journal</button>
          <button type="button" data-v6-settings-toggle aria-controls="v6-settings-panel" aria-expanded="false" aria-pressed="false">Settings</button>
        </div>
        <div class="top-tool-group top-tool-group-right" aria-label="Account and utility tools">
          <span class="profile-chip" data-v6-top-profile>test</span>
          <button type="button" data-v6-top-account disabled>ETH</button>
          <button type="button" data-v6-top-instrument disabled>NQ-2018</button>
          <button type="button" data-v6-top-editor disabled>Editor</button>
          <button type="button" class="icon-tool" data-v6-top-theme disabled aria-label="Theme">Theme</button>
          <button type="button" class="icon-tool" data-v6-top-fullscreen disabled aria-label="Fullscreen">Full</button>
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
      <section id="v6-settings-panel" class="settings-panel" data-v6-settings-panel hidden>
        <div class="panel-copy">
          <strong>Workspace Settings</strong>
          <span>Adjust display preferences for this workstation.</span>
        </div>
        <label>
          <span>Theme</span>
          <select data-v6-settings-field="theme" aria-label="Theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label>
          <span>Timezone</span>
          <select data-v6-settings-field="displayTimezone" aria-label="Timezone">
            <option value="exchange">Exchange</option>
            <option value="local">Local</option>
            <option value="utc">UTC</option>
          </select>
        </label>
        <label>
          <input type="checkbox" data-v6-settings-field="chartGrid" checked>
          <span>Grid</span>
        </label>
        <label>
          <input type="checkbox" data-v6-settings-field="showWatermark" checked>
          <span>Watermark</span>
        </label>
        <div class="panel-actions">
          <button type="button" data-v6-settings-close aria-label="Close Workspace Settings panel">Close</button>
        </div>
      </section>

      <main class="workstation-main" data-v6-workstation-main>
        <section class="chart-toolbar" aria-label="Chart controls placeholder">
          <div class="symbol-readout" data-v6-status-readout>
            <span class="status-dot" aria-hidden="true"></span>
            <strong data-v6-status-symbol>NQ</strong>
            <span data-v6-status-timeframe>1m</span>
            <span data-v6-status-open>O --</span>
            <span data-v6-status-high>H --</span>
            <span data-v6-status-low>L --</span>
            <span data-v6-status-close>C --</span>
          </div>
          <div class="toolbar-actions">
            <label>
              <span>TF</span>
              <span class="toolbar-readonly-value" data-v6-display-timeframe-readout>1m</span>
            </label>
            <button type="button" disabled>Go to</button>
            <button type="button" disabled>Layout</button>
          </div>
        </section>

        <section class="chart-surface" aria-label="Replay chart surface" data-v6-chart-surface>
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
          <div class="transport-placeholder" aria-label="Replay transport" data-v6-transport>
            <button type="button" aria-label="Step back" disabled>|&lt;</button>
            <button type="button" aria-label="Play replay" data-v6-transport-action="play-toggle" aria-pressed="false">Play</button>
            <button type="button" aria-label="Step forward" data-v6-transport-action="next">&gt;|</button>
            <div class="transport-speed" aria-label="Replay speed">
              <button type="button" data-v6-transport-speed="0.5" aria-pressed="false">0.5x</button>
              <button type="button" data-v6-transport-speed="1" aria-pressed="true" class="is-active">1x</button>
              <button type="button" data-v6-transport-speed="2" aria-pressed="false">2x</button>
              <button type="button" data-v6-transport-speed="4" aria-pressed="false">4x</button>
            </div>
            <span>1m</span>
          </div>
        </section>
        <aside class="right-utility-rail" data-v6-right-utility-rail aria-label="Right utility rail">
          <button type="button" class="rail-button rail-button-icon" data-v6-rail-object-tree disabled aria-label="Show object tree">
            <span aria-hidden="true">Layers</span>
          </button>
          <div class="rail-main-actions">
            <button type="button" class="rail-button" data-v6-rail-order disabled aria-label="Order">
              <span aria-hidden="true">+</span>
              <span>Order</span>
            </button>
            <details class="rail-popover-anchor" data-v6-rail-goto-details>
              <summary class="rail-button" data-v6-rail-goto aria-label="Go to key time">
                <span aria-hidden="true">-&gt;</span>
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
              <span aria-hidden="true">Cal</span>
              <span>News</span>
            </button>
            <button type="button" class="rail-button" data-v6-rail-journal disabled aria-label="Journal">
              <span aria-hidden="true">Doc</span>
              <span>Journal</span>
            </button>
          </div>
          <div class="rail-bottom-actions">
            <button type="button" class="rail-button rail-button-icon" data-v6-rail-watch disabled aria-label="Watch tool">
              <span aria-hidden="true">*</span>
            </button>
            <button type="button" class="rail-button rail-button-icon" data-v6-rail-session-settings disabled aria-label="Session settings">
              <span aria-hidden="true">Set</span>
            </button>
          </div>
        </aside>
      </main>

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
