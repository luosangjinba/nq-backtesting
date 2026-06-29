export function createSessionSetupRoute() {
  return {
    id: 'setup',
    render() {
      const section = document.createElement('section');
      section.className = 'panel setup-panel';
      section.dataset.route = 'setup';
      section.innerHTML = `
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Session</div>
            <h2>Create Replay Session</h2>
          </div>
          <span class="runtime-badge">Setup Route</span>
        </div>
        <div class="form-grid" aria-label="Session setup placeholder">
          <label>
            Instrument
            <select disabled>
              <option>NQ</option>
            </select>
          </label>
          <label>
            Timeframe
            <select disabled>
              <option>1M</option>
            </select>
          </label>
          <label>
            Start
            <input disabled value="Pending Step 360">
          </label>
          <label>
            End
            <input disabled value="Pending Step 360">
          </label>
        </div>
        <p>Session creation UI is reserved for Step 360. No bars are loaded here.</p>
      `;
      return section;
    },
  };
}
