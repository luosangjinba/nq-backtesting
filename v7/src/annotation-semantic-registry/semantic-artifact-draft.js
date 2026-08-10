import { failSemanticPackage } from './semantic-package-error.js';

export class SemanticArtifactDraftValue {
  #record;
  #registryIdentity;

  constructor(registryIdentity, record) {
    this.#registryIdentity = registryIdentity;
    this.#record = record;
    Object.freeze(this);
  }

  read(registryIdentity) {
    if (registryIdentity !== this.#registryIdentity) {
      failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_FOREIGN', 'Artifact draft belongs to another Registry.');
    }
    return this.#record;
  }
}
