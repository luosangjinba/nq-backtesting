const ERROR_COPY = Object.freeze({
  'provider-unavailable': 'Market data is unavailable. Check the data service and retry.',
  'provider-request-failed': 'Market data could not be loaded. Retry the chart update.',
  'provider-timeout': 'Market data took too long to respond. Retry the chart update.',
  'workspace-publication-failed': 'The chart update could not be published. Retry the update.',
});

const INTERNAL_CODE = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;

/** Convert stable internal failure codes into user-facing replay workspace copy. */
export function workspaceErrorCopy(value) {
  const message = String(value ?? '').trim();
  if (ERROR_COPY[message]) return ERROR_COPY[message];
  if (message === '' || INTERNAL_CODE.test(message)) {
    return 'The chart update failed. Retry the update.';
  }
  return message;
}
