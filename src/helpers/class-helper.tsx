import type { FormClassValue } from '../types/form-types';

// Internal functions

export const combineClasses = (value: FormClassValue): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    let result = '';

    for (const item of value) {
      const part = combineClasses(item as FormClassValue);

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
