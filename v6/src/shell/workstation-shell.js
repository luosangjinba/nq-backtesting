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
              <select aria-label="Timeframe" data-v6-display-timeframe-select>
                <option value="1">1m</option>
                <option value="5">5m</option>
                <option value="15">15m</option>
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
          <div class="static-chart-visual" aria-hidden="true">
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
