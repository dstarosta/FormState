import * as z from 'zod';

import type { DeepPartial, StateValidationFailure, StateValidationSuccess } from '../form-types';
import { createInitialState } from './state-manager';
import { FormStateError } from './form-state-error';

// Private methods

const isGenericMessage = (message: string) =>
  message.startsWith('Invalid input:') ||
  message.startsWith('Too small:') ||
  message.startsWith('Too big:') ||
  message.startsWith('Expected ') ||
  message.startsWith('String must');

// Public methods

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
export const validateState = <T extends z.ZodObject>(
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

// Internal methods

export const formatErrors = <T extends object>(
  error?: z.ZodError<object>
): Record<keyof T, string> => {
  if (!error) {
    return {} as Record<keyof T, string>;
  }
  const errors: Record<string, string> = {};

  const processIssue = (issue: z.core.$ZodIssue, prefix: string[] = []) => {
    const pathAsStrings = issue.path.map(String);
    if (issue.code === 'invalid_union' && Array.isArray(issue.errors)) {
      const flatErrors = issue.errors.flat();

      const customErrors = flatErrors.find(
        (err) => Boolean(err.message) && !isGenericMessage(err.message)
      );

      if (customErrors && customErrors.message) {
        errors[[...prefix, ...pathAsStrings].join('.')] = customErrors.message;
        return;
      }

      const genericErrors = flatErrors.find((err) => Boolean(err.message));

      if (genericErrors && genericErrors.message) {
        errors[[...prefix, ...pathAsStrings].join('.')] = genericErrors.message;
        return;
      }
    } else if (issue.message) {
      errors[[...prefix, ...pathAsStrings].join('.')] = issue.message;
    }
  };

  for (const issue of error.issues) {
    processIssue(issue);
  }

  return errors as Record<keyof T, string>;
};
