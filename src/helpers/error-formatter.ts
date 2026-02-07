import * as z from 'zod/v4';

// Private methods

const isGenericMessage = (message: string) =>
  message.startsWith('Invalid input:') ||
  message.startsWith('Too small:') ||
  message.startsWith('Too big:') ||
  message.startsWith('Expected ') ||
  message.startsWith('String must');

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
