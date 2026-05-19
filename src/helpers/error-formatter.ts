import * as z from 'zod/mini';
import { deepEqual } from 'fast-equals';

// Private functions

const isGenericMessage = (message: string) => message === 'Invalid input';

// Internal functions

export const isSchemaValid = (
  validated: boolean,
  errors: Record<string, string | undefined>,
  manualErrors: Record<string, string>
): boolean | null => {
  if (!validated) {
    return null;
  }

  const manualEntries = Object.entries(manualErrors);
  const errorEntries = Object.entries(errors);

  return errorEntries.every((error) => manualEntries.some((manual) => deepEqual(manual, error)));
};

export const normalizeManualError = (error: string | null | undefined): string | null =>
  error == null ? null : error.trim() || 'Error';

export const formatErrors = <T extends object>(
  error: z.core.$ZodError<object> | undefined,
  errorMessageSeparator: string
) => {
  const errors = {} as Record<keyof T | '', string | undefined>;

  if (!error) {
    return errors;
  }

  const processIssue = (issue: z.core.$ZodIssue) => {
    const path = issue.path.map(String).join('.') as keyof T | '';

    const addError = (message: string) => {
      const errorValue = errors[path];

      errors[path] =
        typeof errorValue === 'string' && errorValue.trim().length > 0
          ? `${errorValue}${errorMessageSeparator}${message}`
          : message;
    };

    if (issue.code === 'invalid_union' && Array.isArray(issue.errors)) {
      const flatErrors = issue.errors
        .flat()
        .sort(
          (error1, error2) =>
            Number(isGenericMessage(error1.message)) - Number(isGenericMessage(error2.message))
        );

      const flatIssue = flatErrors.find(
        (flatError): flatError is z.core.$ZodIssue & { message: string } =>
          Boolean(flatError.message)
      );

      if (flatIssue) {
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
