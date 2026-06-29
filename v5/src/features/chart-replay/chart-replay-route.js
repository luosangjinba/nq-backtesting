export function createChartReplayRoute() {
  return {
    id: 'chart',
    render({ params = {} } = {}) {
      const sessionId = params.sessionId || 'No session selected';
      const section = document.createElement('section');
      section.className = 'panel chart-panel';
      section.dataset.route = 'chart';
      section.dataset.sessionId = params.sessionId || '';
      section.innerHTML = `
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Replay</div>
            <h2>Chart Replay Shell</h2>
          </div>
          <span class="runtime-badge">Chart Route</span>
        </div>
        <div class="chart-placeholder" role="img" aria-label="Chart runtime placeholder">
          <span>Chart runtime starts in Step 361</span>
        </div>
        <p>Session: <strong>${sessionId}</strong></p>
        <p>Chart, bars, and replay runtime are intentionally absent in Step 360.</p>
      `;
      return section;
    },
  };
}
