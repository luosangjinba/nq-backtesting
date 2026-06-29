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
        <div class="replay-controls" data-replay-controls>
          <button type="button" data-replay-next disabled>Next</button>
          <button type="button" data-replay-play disabled>Play</button>
          <button type="button" data-replay-pause disabled>Pause</button>
        </div>
        <div class="chart-host" data-chart-host>
          <span>Starting chart...</span>
        </div>
        <p>Session: <strong>${sessionId}</strong></p>
        <p data-replay-load-status>Waiting for replay session.</p>
      `;
      const status = section.querySelector('[data-replay-load-status]');
      const nextButton = section.querySelector('[data-replay-next]');
      let commandInFlight = false;
      let replayLoaded = false;

      function setControlsDisabled(disabled) {
        nextButton.disabled = disabled || !replayLoaded || !params.sessionId;
      }

      async function runReplayCommand(action) {
        if (commandInFlight || !params.sessionId) return null;
        commandInFlight = true;
        setControlsDisabled(true);
        try {
          return await action();
        } finally {
          commandInFlight = false;
          setControlsDisabled(false);
        }
      }

      nextButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand('replay.next', {
          sessionId: params.sessionId,
        }));
        if (!state) return;
        status.textContent = state.advanced
          ? `Loaded ${state.displayBars.length} bars.`
          : `Replay stopped: ${state.reason || 'no next bar'}.`;
      });

      if (params.sessionId) {
        setTimeout(async () => {
          status.textContent = 'Loading replay start...';
          setControlsDisabled(true);
          try {
            const state = await dispatchCommand('replay.loadInitialSession', {
              sessionId: params.sessionId,
            });
            replayLoaded = true;
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
          } catch (error) {
            status.textContent = error?.message || String(error);
          } finally {
            setControlsDisabled(false);
          }
        }, 0);
      }
      return section;
    },
  };
}
