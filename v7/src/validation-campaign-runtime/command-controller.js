import { runAnalysis, freezeCohort, verifySource } from './analysis-command-controller.js';
import { archiveCampaign, createCampaign } from './campaign-command-controller.js';
import {
  commitObservation,
  finalizeCase,
  recordOutcome,
  supersedeCase,
} from './case-command-controller.js';
import { exactCase, validateCommandShape } from './command-contract.js';

const COMMANDS = Object.freeze({
  'archive-campaign': archiveCampaign,
  'commit-case-observation': (state, command, signal) => (
    commitObservation(state, command, false, signal)
  ),
  'create-campaign': createCampaign,
  'finalize-case': finalizeCase,
  'freeze-cohort': freezeCohort,
  'record-case-outcome': recordOutcome,
  'run-analysis': runAnalysis,
  'save-incomplete-case': (state, command, signal) => (
    commitObservation(state, command, true, signal)
  ),
  'supersede-case': supersedeCase,
  'verify-source': verifySource,
});

export async function executeValidationCampaignCommand(state, command, signal) {
  validateCommandShape(command);
  const handler = COMMANDS[command.kind];
  if (!handler) throw new TypeError(`Validation Campaign command ${command.kind} is unsupported.`);
  return handler(state, command, signal);
}

export { exactCase };
