export function renderAppShell(root) {
  const outlet = root.querySelector('[data-app-outlet]');
  if (!outlet) {
    throw new Error('V6 app outlet is missing.');
  }

  outlet.innerHTML = `
    <section class="workstation-shell" data-v6-workstation-shell>
      <header class="top-bar">
        <div>
          <div class="eyebrow">Replay Workstation</div>
          <h1>FX Session Replay</h1>
        </div>
        <div class="top-actions" aria-label="V6 route actions">
          <button type="button" disabled>Sessions</button>
          <button type="button" disabled>Settings</button>
        </div>
      </header>
      <section class="chart-surface" aria-label="Replay chart surface">
        <div class="chart-placeholder">
          <span>Chart runtime pending</span>
        </div>
        <div class="transport-placeholder" aria-label="Replay transport placeholder">
          <button type="button" disabled>Play</button>
          <button type="button" disabled>Next</button>
          <span>1x</span>
        </div>
      </section>
      <footer class="status-bar">
        <span>Session pending</span>
        <span>Cursor pending</span>
        <span>Latency gate pending</span>
      </footer>
    </section>
  `;
}
