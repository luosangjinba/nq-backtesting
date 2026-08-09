import { failAnnotation } from './annotation-error.js';

const METHODS = Object.freeze(['apply', 'finalize', 'rollback', 'snapshot']);

function durableMethod(repository, method) {
  if (typeof repository?.[method] !== 'function') {
    failAnnotation(
      'ANNOTATION_DURABLE_REPOSITORY_REQUIRED',
      `Annotation Repository does not expose ${method}().`,
    );
  }
  return repository[method].bind(repository);
}

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

/** Load one optional durable initial state through the narrow Repository port. */
export async function loadAnnotationRepository(repository, input) {
  try {
    return await durableMethod(repository, 'load')(input);
  } catch (cause) {
    if (cause?.code === 'ANNOTATION_DURABLE_REPOSITORY_REQUIRED') throw cause;
    failAnnotation('ANNOTATION_REPOSITORY_LOAD_FAILED', 'Annotation Repository restore failed.', { cause });
  }
}

/** Decode one versioned import without allowing the adapter to publish it. */
export async function parseAnnotationImport(repository, input) {
  let result;
  try {
    result = await durableMethod(repository, 'parseImport')(input);
  } catch (cause) {
    if (cause?.code === 'ANNOTATION_DURABLE_REPOSITORY_REQUIRED') throw cause;
    failAnnotation('ANNOTATION_IMPORT_PARSE_FAILED', 'Annotation import payload was rejected.', { cause });
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || Object.keys(result).sort().join(',') !== 'document,opaqueState') {
    failAnnotation('ANNOTATION_IMPORT_RESULT_INVALID', 'Annotation Repository returned an invalid import.');
  }
  return result;
}

/** Encode one accepted document through the durable Repository export boundary. */
export async function exportAnnotationDocument(repository, input) {
  try {
    const value = await durableMethod(repository, 'exportDocument')(input);
    if (typeof value !== 'string' || value.length === 0) {
      failAnnotation('ANNOTATION_EXPORT_RESULT_INVALID', 'Annotation export must be a non-empty string.');
    }
    return value;
  } catch (cause) {
    if (cause?.code?.startsWith?.('ANNOTATION_')) throw cause;
    failAnnotation('ANNOTATION_EXPORT_FAILED', 'Annotation document export failed.', { cause });
  }
}
