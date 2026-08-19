/**
 * Owner: validation-campaign-ui.
 * Purpose: expose the DOM-only R14.1 Validation Campaign route and Replay
 * capture adapter without owning business truth.
 * Inputs: the Campaign runtime plus download, raw-context, and error callbacks.
 * Outputs: start/stop/mount lifecycle and removable Replay Pane attachments.
 * Side effects: mutates only Campaign-owned DOM and invokes injected callbacks.
 * Lifecycle: create, start, mount/attach, unmount/stop, dispose.
 * Errors: rejects incomplete ports, invalid roots, and use outside lifecycle.
 * Concurrency/cancellation: async button work is runtime-fenced; stop/dispose
 * removes subscriptions, dialogs, route DOM, and Pane attachments.
 */
export { createValidationCampaignUi } from './validation-campaign-ui.js';
