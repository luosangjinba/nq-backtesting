const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/u;

function safeText(value, fallback) {
  return typeof value === 'string' && value.length > 0
    ? value.slice(0, 320) : fallback;
}
/** Stable, portable failure for the Validation Campaign vertical slice. */
export class ValidationCampaignError extends Error {
  constructor(code, message, {
    campaignId = null,
    caseId = null,
    details = null,
    operation = 'domain',
    sourceId = null,
  } = {}) {
    super(safeText(message, 'Validation Campaign operation failed.'));
    this.name = 'ValidationCampaignError';
    this.code = SAFE_ID.test(code ?? '') ? code : 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT';
    this.operation = SAFE_ID.test(operation ?? '') ? operation : 'domain';
    this.campaignId = SAFE_ID.test(campaignId ?? '') ? campaignId : null;
    this.caseId = SAFE_ID.test(caseId ?? '') ? caseId : null;
    this.sourceId = SAFE_ID.test(sourceId ?? '') ? sourceId : null;
    this.details = details;
  }
}

export function failValidation(code, message, context) {
  throw new ValidationCampaignError(code, message, context);
}
