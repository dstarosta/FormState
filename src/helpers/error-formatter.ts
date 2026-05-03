import * as z from 'zod/mini';

// Private functions

const isGenericMessage = (message: string) => message === 'Invalid input';

// Internal functions

export const formatErrors = <T extends object>(
  error: z.core.$ZodError<object> | undefined,
  errorMessageSeparator: string
) => {
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

      const flatIssue = flatErrors.find((flatError) => Boolean(flatError.message));

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
