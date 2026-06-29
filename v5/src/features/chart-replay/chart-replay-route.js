export function createChartReplayRoute() {
  return {
    id: 'chart',
    render() {
      const section = document.createElement('section');
      section.className = 'panel chart-panel';
      section.dataset.route = 'chart';
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
        <p>Chart, bars, and replay runtime are intentionally absent in Step 358.</p>
      `;
      return section;
    },
  };
}
