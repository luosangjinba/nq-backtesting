import { failSemanticPackage } from './semantic-package-error.js';
import { exactRecord, portableValue } from './portable-value.js';

const TYPE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const VERSION = /^\d+\.\d+\.\d+$/;

class SemanticTypeDefinitionValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

/** Define one pure Semantic type policy without granting owner handles. */
export function defineSemanticType(value = {}) {
  const fields = Object.hasOwn(value, 'revise')
    ? [
      'construct', 'definitionId', 'definitionVersion', 'displayMetadata', 'inspect',
      'project', 'revise', 'typeId', 'version',
    ]
    : [
      'construct', 'definitionId', 'definitionVersion', 'displayMetadata', 'inspect',
      'project', 'typeId', 'version',
    ];
  exactRecord(
    value,
    fields,
    'SEMANTIC_TYPE_DEFINITION_INVALID',
    'Semantic type definition',
  );
  if (typeof value.typeId !== 'string' || !TYPE_ID.test(value.typeId)
    || typeof value.version !== 'string' || !VERSION.test(value.version)
    || typeof value.definitionId !== 'string' || !TYPE_ID.test(value.definitionId)
    || typeof value.definitionVersion !== 'string' || !VERSION.test(value.definitionVersion)
    || typeof value.construct !== 'function' || typeof value.project !== 'function'
    || typeof value.inspect !== 'function'
    || (Object.hasOwn(value, 'revise') && typeof value.revise !== 'function')) {
    failSemanticPackage(
      'SEMANTIC_TYPE_DEFINITION_INVALID',
      'Semantic type definition identity or policies are invalid.',
    );
  }
  const displayMetadata = portableValue(value.displayMetadata, 'displayMetadata');
  return new SemanticTypeDefinitionValue(Object.freeze({
    ...value,
    displayMetadata,
    revise: value.revise ?? null,
  }));
}

export function readSemanticTypeDefinition(candidate) {
  if (!(candidate instanceof SemanticTypeDefinitionValue)) {
    failSemanticPackage(
      'SEMANTIC_TYPE_DEFINITION_REQUIRED',
      'A branded Semantic type definition is required.',
    );
  }
  return candidate.read();
}
