export function renderReplayTransport(root, state) {
  root.dataset.playback = state.playing ? 'playing' : 'paused';
  root.dataset.playbackStatus = state.replayStatus;
  root.dataset.ended = String(state.replayStatus === 'ended');
  root.dataset.period = state.period;
  root.dataset.periodSync = String(state.periodSync);
  root.dataset.previousAvailable = String(state.previousAvailable);
  root.dataset.speed = String(state.speed);
  const previousButton = root.querySelector('[data-v6-transport-step-back]');
  if (previousButton) {
    previousButton.dataset.v6TransportPreviousAvailable = String(state.previousAvailable);
    if (state.previousAvailable) {
      previousButton.dataset.v6TransportAction = 'previous';
    } else {
      delete previousButton.dataset.v6TransportAction;
      previousButton.removeAttribute?.('data-v6-transport-action');
    }
    previousButton.disabled = !state.previousAvailable;
    previousButton.setAttribute('aria-disabled', String(!state.previousAvailable));
    previousButton.setAttribute('title', state.previousAvailable
      ? 'Previous replay bar'
      : 'Previous replay bar unavailable');
    previousButton.classList.toggle('is-disabled', !state.previousAvailable);
  }
  const playButton = root.querySelector('[data-v6-transport-action="play-toggle"]');
  if (playButton) {
    const ended = state.replayStatus === 'ended';
    const label = ended ? 'Replay ended' : state.playing ? 'Pause replay' : 'Play replay';
    const labelElement = playButton.querySelector?.('[data-v6-transport-play-label]');
    const playIcon = playButton.querySelector?.('[data-v6-transport-play-icon]');
    const pauseIcon = playButton.querySelector?.('[data-v6-transport-pause-icon]');
    if (labelElement) labelElement.textContent = label;
    if (playIcon) playIcon.hidden = state.playing;
    if (pauseIcon) pauseIcon.hidden = !state.playing;
    playButton.disabled = ended;
    playButton.setAttribute('aria-label', label);
    playButton.setAttribute('aria-pressed', String(state.playing));
    playButton.setAttribute('aria-disabled', String(ended));
    playButton.setAttribute('title', label);
    playButton.classList.toggle('is-active', state.playing);
    playButton.classList.toggle('is-disabled', ended);
  }
  const nextButton = root.querySelector('[data-v6-transport-action="next"]');
  if (nextButton) {
    const ended = state.replayStatus === 'ended';
    const label = ended ? 'Replay ended' : 'Next replay bar';
    nextButton.disabled = ended;
    nextButton.setAttribute('aria-label', label);
    nextButton.setAttribute('aria-disabled', String(ended));
    nextButton.setAttribute('title', label);
    nextButton.classList.toggle('is-disabled', ended);
  }
  const restartButton = root.querySelector('[data-v6-transport-action="restart"]');
  if (restartButton) {
    const available = state.replayStatus !== 'idle';
    const label = available ? 'Select Bar Replay restart point' : 'Restart available after replay loads';
    restartButton.disabled = !available;
    restartButton.setAttribute('aria-label', label);
    restartButton.setAttribute('aria-disabled', String(!available));
    restartButton.setAttribute('title', label);
    restartButton.classList.toggle('is-active', available);
    restartButton.classList.toggle('is-disabled', !available);
  }
  const speedSlider = root.querySelector('[data-v6-transport-speed-slider]');
  if (speedSlider) {
    speedSlider.value = String(state.speed);
    speedSlider.setAttribute('aria-valuetext', `${state.speed}x replay speed`);
  }
  root.querySelectorAll('[data-v6-transport-speed]').forEach((button) => {
    const selected = Number(button.dataset.v6TransportSpeed) === state.speed;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
  });
  const periodLabel = root.querySelector('[data-v6-transport-period-label]');
  if (periodLabel) periodLabel.textContent = state.period;
  const periodTrigger = root.querySelector('[data-v6-transport-period-toggle]');
  if (periodTrigger) {
    periodTrigger.setAttribute('aria-label', `Replay step period ${state.period}`);
    periodTrigger.setAttribute('title', `Replay step period ${state.period}`);
  }
  root.querySelectorAll('[data-v6-transport-period-option]').forEach((button) => {
    const selected = button.dataset.v6TransportPeriodOption === state.period;
    button.setAttribute('aria-checked', String(selected));
    button.setAttribute('tabindex', selected ? '0' : '-1');
    button.classList.toggle('is-active', selected);
  });
  const periodSync = root.querySelector('[data-v6-transport-period-sync]');
  if (periodSync) {
    periodSync.checked = state.periodSync;
    periodSync.setAttribute('aria-checked', String(state.periodSync));
    periodSync.setAttribute('title', state.periodSync ? 'Replay period follows active chart' : 'Replay period is manual');
    periodSync.parentElement?.classList?.toggle('is-active', state.periodSync);
  }
}
