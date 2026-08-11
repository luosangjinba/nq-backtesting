import {
  createBuiltInPluginPlan,
  listBuiltInPluginStatuses,
  readBuiltInPluginPlan,
} from '../plugin-contract/public.js';
import { failManualWorkflow } from './workflow-error.js';

const TOOL_FIELDS = Object.freeze([
  'evidenceRequirement', 'id', 'label', 'packageId', 'packageVersion',
  'semanticContributionId', 'typeId', 'typeVersion', 'version',
]);
const REQUIREMENT_FIELDS = Object.freeze([
  'followingBars', 'maximumArtifactReferences', 'precedingBars', 'schemaVersion',
]);

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failManualWorkflow(code, `${label} fields must be exact.`);
  }
}

function requireEvidenceRequirement(value) {
  exactRecord(
    value,
    REQUIREMENT_FIELDS,
    'MANUAL_WORKFLOW_TOOL_BINDING_INVALID',
    'Semantic construction evidence requirement',
  );
  if (value.schemaVersion !== 1
    || !Number.isSafeInteger(value.precedingBars) || value.precedingBars < 0 || value.precedingBars > 32
    || !Number.isSafeInteger(value.followingBars) || value.followingBars < 0 || value.followingBars > 32
    || !Number.isSafeInteger(value.maximumArtifactReferences)
    || value.maximumArtifactReferences < 0 || value.maximumArtifactReferences > 32) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_TOOL_BINDING_INVALID',
      'Semantic construction evidence requirement is invalid.',
    );
  }
  return Object.freeze({ ...value });
}

function requireInnerTool(value) {
  exactRecord(value, TOOL_FIELDS, 'MANUAL_WORKFLOW_TOOL_BINDING_INVALID', 'Semantic construction tool');
  for (const field of [
    'id', 'label', 'packageId', 'packageVersion', 'semanticContributionId',
    'typeId', 'typeVersion', 'version',
  ]) {
    if (typeof value[field] !== 'string' || value[field].length === 0) {
      failManualWorkflow(
        'MANUAL_WORKFLOW_TOOL_BINDING_INVALID',
        `Semantic construction tool ${field} is invalid.`,
      );
    }
  }
  return Object.freeze({ ...value, evidenceRequirement: requireEvidenceRequirement(value.evidenceRequirement) });
}

function activeTypeKeys(values) {
  if (!Array.isArray(values)) {
    failManualWorkflow('MANUAL_WORKFLOW_TOOL_BINDING_INVALID', 'Active Semantic types are invalid.');
  }
  return new Set(values.map((value) => (
    `${value.packageId}@${value.packageVersion}:${value.typeId}@${value.version}`
  )));
}

function bindTool({ inner, manifest, status, typeKeys, contribution }) {
  if (inner.packageId !== manifest.packageId
    || inner.packageVersion !== manifest.packageVersion
    || inner.version !== contribution.version) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_TOOL_BINDING_MISMATCH',
      `Tool ${contribution.id} outer and inner package identity differs.`,
    );
  }
  const semanticContribution = manifest.contributions.find(({ id }) => (
    id === inner.semanticContributionId
  ));
  if (semanticContribution?.kind !== 'semantic-type'
    || semanticContribution.version !== inner.typeVersion) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_TOOL_BINDING_MISMATCH',
      `Tool ${contribution.id} has no matching Semantic contribution.`,
    );
  }
  const typeKey = `${inner.packageId}@${inner.packageVersion}:${inner.typeId}@${inner.typeVersion}`;
  if (!typeKeys.has(typeKey)) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_TOOL_TYPE_INACTIVE',
      `Tool ${contribution.id} targets an inactive Semantic type.`,
    );
  }
  return Object.freeze({
    description: manifest.display.description,
    displayName: contribution.displayName,
    distribution: manifest.distribution,
    evidenceRequirement: inner.evidenceRequirement,
    id: contribution.id,
    inspectorParameters: semanticContribution.parameters,
    label: inner.label,
    moduleId: manifest.module.id,
    packageId: manifest.packageId,
    packageName: manifest.display.name,
    packageVersion: manifest.packageVersion,
    semanticContributionId: inner.semanticContributionId,
    state: status.state,
    typeId: inner.typeId,
    typeVersion: inner.typeVersion,
    version: contribution.version,
  });
}

/** Compile the trusted P0a plan and expose package-neutral active Semantic tools. */
export function createProductionSemanticToolCatalog({ manifests, moduleDescriptors } = {}) {
  const plan = createBuiltInPluginPlan({
    hostApiVersion: '1.0.0',
    hostCapabilities: [
      { id: 'annotation.evidence.bundle', version: '1.0.0' },
      { id: 'annotation.geometry.rectangle', version: '1.0.0' },
      { id: 'annotation.geometry.segment', version: '1.0.0' },
    ],
    manifests,
    moduleDescriptors,
  });
  const planned = readBuiltInPluginPlan(plan);

  return Object.freeze({
    list({ hostSnapshot, semanticTools, semanticTypes } = {}) {
      if (!Array.isArray(semanticTools)) {
        failManualWorkflow('MANUAL_WORKFLOW_TOOL_BINDING_INVALID', 'Semantic tool list is invalid.');
      }
      const normalizedTools = semanticTools.map(requireInnerTool);
      const innerById = new Map(normalizedTools.map((tool) => [tool.id, tool]));
      if (innerById.size !== semanticTools.length) {
        failManualWorkflow('MANUAL_WORKFLOW_TOOL_DUPLICATE', 'Semantic tool ids must be unique.');
      }
      const statusByPackage = new Map(
        listBuiltInPluginStatuses(plan, hostSnapshot).map((status) => [status.packageId, status]),
      );
      const typeKeys = activeTypeKeys(semanticTypes);
      return Object.freeze(planned.packages.flatMap(({ manifest }) => (
        manifest.contributions.filter(({ kind }) => kind === 'tool').map((contribution) => {
          const inner = innerById.get(contribution.id);
          const status = statusByPackage.get(manifest.packageId);
          if (!inner || !status) {
            failManualWorkflow(
              'MANUAL_WORKFLOW_TOOL_BINDING_MISSING',
              `Tool ${contribution.id} is missing its active trusted binding.`,
            );
          }
          return bindTool({ contribution, inner, manifest, status, typeKeys });
        })
      )).sort((left, right) => left.id.localeCompare(right.id)));
    },
    plan,
  });
}
