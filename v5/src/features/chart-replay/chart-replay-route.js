import { dispatchCommand } from '../../runtime/commands.js';

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
        <div class="chart-host" data-chart-host>
          <span>Starting chart...</span>
        </div>
        <p>Session: <strong>${sessionId}</strong></p>
        <p data-replay-load-status>Waiting for replay session.</p>
      `;
      const status = section.querySelector('[data-replay-load-status]');
      if (params.sessionId) {
        setTimeout(async () => {
          status.textContent = 'Loading replay start...';
          try {
            const state = await dispatchCommand('replay.loadInitialSession', {
              sessionId: params.sessionId,
            });
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
          } catch (error) {
            status.textContent = error?.message || String(error);
          }
        }, 0);
      }
      return section;
    },
  };
}
