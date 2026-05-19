import type { FormClassValue } from '../types/form-types';

// Internal functions

const collectClassNames = (value: FormClassValue, out: string[]) => {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    out.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value as FormClassValue[]) {
      collectClassNames(item, out);
    }
    return;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key in obj) {
      if (obj[key]) {
        out.push(key);
      }
    }
  }
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
  const parts: string[] = [];

  for (const value of values) {
    collectClassNames(value, parts);
  }

  return parts.join(' ');
};
