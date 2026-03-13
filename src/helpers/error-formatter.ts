import * as z from 'zod/mini';

import type {
  DeepPartial,
  StateValidationFailure,
  StateValidationSuccess,
} from '../types/form-types';
import { createInitialState } from './state-manager';
import { FormStateError } from './form-state-error';

// Private functions

const isGenericMessage = (message: string) => message === 'Invalid input';

// Public functions

/**
 * Validates whether the data is valid for the schema used by the form state.
 *
 * @param schema - The form schema.
 * @param data - The data object instance.
 * @param populateDefaults - Indicates whether to populate defaults values for uninitialized fields
 *                           such as empty strings for optional fields and symbols for strong IDs.
 *                           Those values would have been populated by the form state initializer
 *                           automatically and do not result in errors.
 * @returns The object containing the validation result as well as the validated data object
 *          instance or the form state error.
 */
export const validateState = <T extends z.ZodMiniObject>(
  schema: T,
  data: DeepPartial<z.infer<T>>,
  populateDefaults: boolean = true
) => {
  const safeData = schema.safeParse(populateDefaults ? createInitialState(schema, data) : data);

  if (!safeData.success) {
    return {
      error: new FormStateError(z.prettifyError(safeData.error), formatErrors(safeData.error)),
      success: false,
    } satisfies StateValidationFailure<T>;
  }

  return {
    data: safeData.data,
    success: true,
  } satisfies StateValidationSuccess<T>;
};

// Internal functions

export const formatErrors = <T extends object>(error?: z.core.$ZodError<object>) => {
  const errors = {} as Record<keyof T | '', string | undefined>;

  if (!error) {
    return errors;
  }

  const processIssue = (issue: z.core.$ZodIssue, prefix: string[] = []) => {
    const pathAsStrings = issue.path.map(String);
    const path = [...prefix, ...pathAsStrings].join('.') as keyof T | '';

    const addError = (message: string) => {
      const errorValue = errors[path];

      errors[path] =
        typeof errorValue === 'string' && errorValue.trim().length > 0
          ? `${errorValue}|${message}`
          : message;
    };

    if (issue.code === 'invalid_union' && Array.isArray(issue.errors)) {
      const flatErrors = issue.errors.flat();

      const flatIssue = flatErrors
        .toSorted(
          (err1, err2) =>
            Number(isGenericMessage(err1.message)) - Number(isGenericMessage(err2.message))
        )
        .find((err) => Boolean(err.message));

      if (flatIssue && flatIssue.message) {
        addError(flatIssue.message);
        return;
      }
    } else if (issue.message) {
      addError(issue.message);
    }
  };

  for (const issue of error.issues) {
    processIssue(issue);
  }

  return errors;
};
