import type { FormClassValue } from '../types/form-types';

// Public functions

/**
 * Resolves a clsx-style {@link FormClassValue} into a space-separated class name string.
 *
 * Strings are returned as-is, arrays are flattened recursively, and object keys are included
 * when their value is truthy. `false`, `null`, and `undefined` are filtered out.
 *
 * @param value - A `string`, a clsx-style `object`, an array of either, or a falsy value.
 * @returns A `string` of space-separated class names, or an empty string if nothing resolved.
 */
export const classNames = (value: FormClassValue): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    let result = '';

    for (const item of value) {
      const part = classNames(item as FormClassValue);

      if (part) {
        result += result ? ` ${part}` : part;
      }
    }

    return result;
  }

  if (typeof value === 'object') {
    let result = '';

    for (const key in value as Record<string, boolean | null | undefined>) {
      if ((value as Record<string, boolean | null | undefined>)[key]) {
        result += result ? ` ${key}` : key;
      }
    }

    return result;
  }

  return '';
};
