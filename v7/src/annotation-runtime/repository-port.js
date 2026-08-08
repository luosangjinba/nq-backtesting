import { failAnnotation } from './annotation-error.js';

const METHODS = Object.freeze(['apply', 'finalize', 'rollback', 'snapshot']);

/** Validate the narrow R13.3 fake Repository port without selecting an adapter. */
export function requireAnnotationRepository(candidate) {
  if (!candidate || typeof candidate !== 'object' || typeof candidate.prepare !== 'function') {
    failAnnotation(
      'ANNOTATION_REPOSITORY_INVALID',
      'Annotation Runtime requires a Repository prepare() port.',
    );
  }
  return candidate;
}

/** Prepare and validate one reversible fake Repository transaction. */
export async function prepareAnnotationRepository(repository, input) {
  let preparation;
  try {
    preparation = await repository.prepare(input);
  } catch (cause) {
    failAnnotation(
      'ANNOTATION_REPOSITORY_PREPARE_FAILED',
      'Annotation Repository could not prepare the candidate.',
      { cause },
    );
  }
  if (!preparation || typeof preparation !== 'object'
    || METHODS.some((method) => typeof preparation[method] !== 'function')) {
    failAnnotation(
      'ANNOTATION_REPOSITORY_PREPARATION_INVALID',
      'Annotation Repository returned an invalid preparation.',
    );
  }
  return preparation;
}
