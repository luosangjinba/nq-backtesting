import { dispatchCommand } from '../../runtime/commands.js';
import { subscribeEvent } from '../../runtime/events.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../../contracts/replay-contracts.js';
import { createReplayViewportDemandBridge } from './viewport-demand-wiring.js';

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
          <button type="button" data-replay-reset disabled>Reset</button>
        </div>
        <div class="display-timeframe-controls" data-display-timeframe-controls>
          <button type="button" data-display-timeframe="1" aria-pressed="false" disabled>1m</button>
          <button type="button" data-display-timeframe="5" aria-pressed="false" disabled>5m</button>
          <button type="button" data-display-timeframe="60" aria-pressed="false" disabled>1H</button>
          <button type="button" data-display-timeframe="1440" aria-pressed="false" disabled>1D</button>
        </div>
        <div class="chart-host" data-chart-host>
          <span>Starting chart...</span>
        </div>
        <p>Session: <strong data-session-id-label></strong></p>
        <div class="replay-status-grid" data-replay-status>
          <span>Start <strong data-replay-start>--</strong></span>
          <span>Cursor <strong data-replay-cursor>--</strong></span>
          <span>End <strong data-replay-end>--</strong></span>
          <span>Revealed <strong data-replay-revealed-count>0</strong></span>
          <span>Playback <strong data-replay-playback>Paused</strong></span>
          <span>State <strong data-replay-state>Idle</strong></span>
        </div>
        <p data-replay-load-status>Waiting for replay session.</p>
      `;
      const status = section.querySelector('[data-replay-load-status]');
      const sessionIdLabel = section.querySelector('[data-session-id-label]');
      const startLabel = section.querySelector('[data-replay-start]');
      const cursorLabel = section.querySelector('[data-replay-cursor]');
      const endLabel = section.querySelector('[data-replay-end]');
      const revealedCountLabel = section.querySelector('[data-replay-revealed-count]');
      const playbackLabel = section.querySelector('[data-replay-playback]');
      const stateLabel = section.querySelector('[data-replay-state]');
      const nextButton = section.querySelector('[data-replay-next]');
      const playButton = section.querySelector('[data-replay-play]');
      const pauseButton = section.querySelector('[data-replay-pause]');
      const resetButton = section.querySelector('[data-replay-reset]');
      const displayTimeframeButtons = Array.from(section.querySelectorAll('[data-display-timeframe]'));
      let commandInFlight = false;
      let replayLoaded = false;
      let playbackPlaying = false;
      let terminalReason = '';
      let displayTimeframe = null;
      const unsubscribeCallbacks = [];
      const viewportDemandBridge = createReplayViewportDemandBridge({
        getSessionId: () => params.sessionId || '',
        onLoaded: (state) => {
          status.textContent = `Loaded ${state.displayBars?.length || 0} bars.`;
          refreshReplayStatus();
        },
        onError: (error) => {
          status.textContent = error?.message || String(error);
        },
      });
      sessionIdLabel.textContent = sessionId;

      async function refreshReplayStatus() {
        if (!section.isConnected && section.parentElement === null) return;
        const [state, playback, displayContext] = await Promise.all([
          dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT).catch(() => null),
        ]);
        displayTimeframe = Number(displayContext?.displayTimeframe
          || state?.displayTimeframe
          || state?.session?.timeframe
          || 0);
        playbackPlaying = Boolean(playback?.playing);
        terminalReason = playback?.stoppedReason || terminalReason;
        startLabel.textContent = state?.startBarTimestamp || '--';
        cursorLabel.textContent = state?.cursorTimestamp || '--';
        endLabel.textContent = state?.session?.sessionEnd || '--';
        revealedCountLabel.textContent = String(state?.revealedCount || 0);
        playbackLabel.textContent = playbackPlaying ? 'Playing' : 'Paused';
        stateLabel.textContent = terminalReason || state?.status || 'Idle';
        if (terminalReason) {
          status.textContent = `Replay stopped: ${terminalReason}.`;
        }
        updateDisplayTimeframeButtons();
        setControlsDisabled();
      }

      function setControlsDisabled(disabled = false) {
        const unavailable = disabled || commandInFlight || !replayLoaded || !params.sessionId;
        nextButton.disabled = unavailable;
        playButton.disabled = unavailable || playbackPlaying;
        pauseButton.disabled = unavailable || !playbackPlaying;
        resetButton.disabled = unavailable;
        displayTimeframeButtons.forEach((button) => {
          button.disabled = unavailable;
        });
      }

      function updateDisplayTimeframeButtons() {
        displayTimeframeButtons.forEach((button) => {
          const pressed = Number(button.dataset.displayTimeframe) === displayTimeframe;
          button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });
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
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.NEXT, {
          sessionId: params.sessionId,
        }));
        if (!state) return;
        terminalReason = state.advanced ? '' : state.reason || 'stopped';
        status.textContent = state.advanced
          ? `Loaded ${state.displayBars.length} bars.`
          : `Replay stopped: ${state.reason || 'no next bar'}.`;
        await refreshReplayStatus();
      });

      playButton.addEventListener('click', async () => {
        const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PLAY, {
          sessionId: params.sessionId,
          intervalMs: 500,
        }));
        if (!playback) return;
        playbackPlaying = Boolean(playback.playing);
        terminalReason = '';
        status.textContent = playbackPlaying ? 'Playing replay.' : 'Replay paused.';
        await refreshReplayStatus();
      });

      pauseButton.addEventListener('click', async () => {
        const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PAUSE));
        if (!playback) return;
        playbackPlaying = Boolean(playback.playing);
        status.textContent = playbackPlaying ? 'Playing replay.' : 'Replay paused.';
        await refreshReplayStatus();
      });

      resetButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.RESET, {
          sessionId: params.sessionId,
        }));
        if (!state) return;
        terminalReason = '';
        status.textContent = `Loaded ${state.displayBars.length} bars.`;
        await refreshReplayStatus();
      });

      displayTimeframeButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const nextDisplayTimeframe = Number(button.dataset.displayTimeframe);
          if (!nextDisplayTimeframe || nextDisplayTimeframe === displayTimeframe) return;
          const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
            sessionId: params.sessionId,
            displayTimeframe: nextDisplayTimeframe,
          }));
          if (!state) return;
          displayTimeframe = Number(state.displayTimeframe || nextDisplayTimeframe);
          status.textContent = `Loaded ${state.displayBars?.length || 0} ${button.textContent} bars.`;
          updateDisplayTimeframeButtons();
          await refreshReplayStatus();
        });
      });

      [
        REPLAY_EVENTS.INITIAL_LOADED,
        REPLAY_EVENTS.NEXT,
        REPLAY_EVENTS.RESET,
        REPLAY_EVENTS.PLAYBACK_CHANGED,
        REPLAY_EVENTS.DISPLAY_TIMEFRAME_CHANGED,
        REPLAY_EVENTS.DISPLAY_WINDOW_LOADED,
        REPLAY_EVENTS.DISPLAY_RELOADED,
      ].forEach((eventName) => {
        const unsubscribe = subscribeEvent(eventName, () => {
          refreshReplayStatus();
        });
        unsubscribeCallbacks.push(unsubscribe);
      });
      section.dispose = () => {
        viewportDemandBridge.stop();
        while (unsubscribeCallbacks.length) {
          unsubscribeCallbacks.pop()();
        }
        dispatchCommand(REPLAY_COMMANDS.PAUSE).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      };
      viewportDemandBridge.start();

      if (params.sessionId) {
        setTimeout(async () => {
          status.textContent = 'Loading replay start...';
          setControlsDisabled(true);
          try {
            const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
              sessionId: params.sessionId,
            });
            replayLoaded = true;
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
            await refreshReplayStatus();
          } catch (error) {
            status.textContent = error?.message || String(error);
          } finally {
            setControlsDisabled(false);
          }
        }, 0);
      }
      refreshReplayStatus();
      return section;
    },
  };
}
