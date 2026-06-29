import { dispatchCommand } from '../../runtime/commands.js';
import { APP_COMMANDS } from '../../contracts/app-contracts.js';
import { SESSION_COMMANDS } from '../../contracts/session-contracts.js';
import { readSessionSetupForm } from './session-setup-model.js';

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
        <form class="session-form" data-session-setup-form>
          <div class="form-grid" aria-label="Session setup">
            <label>
              Instrument
              <select name="instrument">
                <option value="NQ">NQ</option>
                <option value="ES">ES</option>
              </select>
            </label>
            <label>
              Timeframe
              <select name="timeframe">
                <option value="1">1M</option>
                <option value="2">2M</option>
                <option value="5">5M</option>
                <option value="15">15M</option>
                <option value="60">1H</option>
              </select>
            </label>
            <label>
              Start
              <input name="sessionStart" type="datetime-local" value="2026-06-01T09:30">
            </label>
            <label>
              End
              <input name="sessionEnd" type="datetime-local" value="2026-06-05T16:00">
            </label>
          </div>
          <div class="form-actions">
            <button type="submit">Create Session</button>
            <span class="form-status" data-session-setup-status>No bars are loaded on create.</span>
          </div>
        </form>
        <p>Create stores session metadata and opens the chart route by session id.</p>
      `;
      const form = section.querySelector('[data-session-setup-form]');
      const status = section.querySelector('[data-session-setup-status]');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = 'Creating session...';
        try {
          const created = await dispatchCommand(SESSION_COMMANDS.CREATE, readSessionSetupForm(form));
          status.textContent = `Created ${created.session.id}`;
          await dispatchCommand(APP_COMMANDS.NAVIGATE, {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
        } catch (error) {
          status.textContent = error?.message || String(error);
        }
      });
      return section;
    },
  };
}
