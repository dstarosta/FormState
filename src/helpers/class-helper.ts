import type { FormClassValue } from '../types/form-types';

// Internal functions

const resolveClassNames = (value: FormClassValue) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return classNames(...(value as FormClassValue[]));
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    let result = '';

    for (const key in obj) {
      if (obj[key]) {
        result += result ? ` ${key}` : key;
      }
    }

    return result;
  }

  return '';
};

// Public functions

/**
 * Resolves a clsx-style {@link FormClassValue} into a space-separated class name string.
 *
 * Strings are returned as-is, arrays are flattened recursively, and object keys are included
 * when their value is truthy. `false`, `null`, and `undefined` are filtered out.
 *
 * @param values - A sequence of `string`, clsx-style `object`, array of either, or falsy values.
 * @returns A `string` of space-separated class names, or an empty string if nothing resolved.
 */
export const classNames = (...values: FormClassValue[]) => {
  let result = '';

  for (const value of values) {
    const part = resolveClassNames(value);

    if (part) {
      result += result ? ` ${part}` : part;
    }
  }

  return result;
};
