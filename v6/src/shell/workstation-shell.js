export function createWorkstationShellMarkup() {
  return `
    <section class="workstation-shell" data-v6-workstation-shell>
      <header class="top-bar" data-v6-workstation-header>
        <div class="product-lockup">
          <div class="eyebrow">Replay Workstation</div>
          <h1>FX Session Replay</h1>
        </div>
        <div class="market-strip" aria-label="Active replay context">
          <span>NQ</span>
          <span>1m</span>
          <span>UTC-4</span>
        </div>
        <div class="top-actions" aria-label="V6 route actions">
          <button type="button" disabled>Sessions</button>
          <button type="button" disabled>Historical Review</button>
          <button type="button" disabled>Settings</button>
        </div>
      </header>

      <main class="workstation-main" data-v6-workstation-main>
        <section class="chart-toolbar" aria-label="Chart controls placeholder">
          <div class="symbol-readout">
            <span class="status-dot" aria-hidden="true"></span>
            <strong>NQ</strong>
            <span>1m</span>
            <span>O 30343.00</span>
            <span>H 30370.00</span>
            <span>L 30310.75</span>
            <span>C 30318.75</span>
          </div>
          <div class="toolbar-actions">
            <label>
              <span>TF</span>
              <select disabled aria-label="Timeframe">
                <option>1m</option>
              </select>
            </label>
            <button type="button" disabled>Go to</button>
            <button type="button" disabled>Layout</button>
          </div>
        </section>

        <section class="chart-surface" aria-label="Replay chart surface" data-v6-chart-surface>
          <div class="price-scale-placeholder" aria-hidden="true">
            <span>30520.00</span>
            <span>30480.00</span>
            <span>30440.00</span>
            <span>30400.00</span>
            <span>30360.00</span>
            <span>30320.00</span>
          </div>
          <div class="time-scale-placeholder" aria-hidden="true">
            <span>07:45</span>
            <span>08:00</span>
            <span>08:15</span>
            <span>08:30</span>
            <span>08:45</span>
            <span>09:00</span>
          </div>
          <div class="chart-placeholder" data-v6-chart-placeholder>
            <div>
              <strong>Chart runtime pending</strong>
              <span>V6 shell only</span>
            </div>
          </div>
          <div class="transport-placeholder" aria-label="Replay transport placeholder" data-v6-transport>
            <button type="button" disabled aria-label="Step back">|&lt;</button>
            <button type="button" disabled aria-label="Play">Play</button>
            <button type="button" disabled aria-label="Step forward">&gt;|</button>
            <span>1x</span>
            <span>1m</span>
          </div>
        </section>
      </main>

      <footer class="status-bar" data-v6-status-bar>
        <span>Session pending</span>
        <span>Start pending</span>
        <span>Cursor pending</span>
        <span>Revealed 0</span>
        <span>Playback idle</span>
        <span>Latency gate pending</span>
      </footer>
    </section>
  `;
}
