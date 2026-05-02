import type { FormDateFormat } from '../types/form-types';
import { isValidDate, formatDate, parseDate } from './date-formatter';

const EMPTY_STRING = '';

// Private functions

const isValidNumberString = (value: string) => {
  return value && !/[a-z]/i.test(value);
};

// Public functions

/**
 * Converts an integer in a form string notation to the `number` type.
 *
 * @param value - A stringified value.
 * @returns The converted value.
 */
export const toInt = (value: string) => {
  if (!isValidNumberString(value)) {
    return EMPTY_STRING;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && Number.isInteger(parsedValue) ? parsedValue : EMPTY_STRING;
};

/**
 * Converts a floating point number in a form string notation to the `number` type.
 *
 * @param value - A stringified value.
 * @returns The converted value.
 */
export const toFloat = (value: string) => {
  if (!isValidNumberString(value)) {
    return EMPTY_STRING;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : EMPTY_STRING;
};

/**
 * Converts a date in a form string notation to the `Date` type.
 *
 * @param value - A stringified value.
 * @param options - Options for the date conversion.
 * @param options.dateFormat - The date format of the stringified value (ex: 'yyyy-MM-dd').
 * @param options.asUTC - Indicates whether to create a `Date` instance using Universal Coordinated
 *                        Time (UTC).
 * @returns The converted value.
 */
export const toDate = (
  value: string,
  options?: {
    dateFormat?: FormDateFormat;
    asUTC?: boolean;
  }
) => {
  const { dateFormat = 'yyyy-MM-dd', asUTC = false } = options ?? {};
  const parsedValue = parseDate(value, dateFormat, asUTC);

  return isValidDate(parsedValue) ? parsedValue : EMPTY_STRING;
};

/**
 * Converts a boolean in a form string notation to the `boolean` type.
 *
 * @param value - A stringified value.
 * @param options - Options for the boolean conversion.
 * @param options.strict - Indicates whether to only use the values "true" and "false" to return a boolean;
 *                         otherwise, return an empty `string`.
 *                         The non-strict mode allows values like "yes"/"no", "on/off" and "checked/unchecked"
 *                         as well.
 * @returns The converted value.
 */
export const toBoolean = (value: string, options?: { strict?: boolean }) => {
  const parsedValue = value.toLowerCase();

  if (options?.strict) {
    if (parsedValue === 'true') {
      return true;
    } else if (parsedValue === 'false') {
      return false;
    } else {
      return EMPTY_STRING;
    }
  }

  switch (parsedValue) {
    case 'true':
    case 'checked':
    case 'on':
    case 'yes': {
      return true;
    }
    case 'false':
    case 'unchecked':
    case 'off':
    case 'no': {
      return false;
    }
    default: {
      return EMPTY_STRING;
    }
  }
};

/**
 * Converts literal string values in a form string notation to the literal type.
 *
 * @param value - A stringified value.
 * @param validValues - An array of available values including an empty string.
 *                      An empty array of values would cause an empty string as the
 *                      return value.
 * @returns The converted value.
 */
export const toLiteral = <T extends string>(value: string, validValues: readonly T[]) => {
  const parsedValue = validValues.includes(value as T) ? value : EMPTY_STRING;

  return parsedValue as T;
};

/**
 * Converts any input form type into a form string notation.
 *
 * @param value - A typed value.
 * @param options - Options for the string conversion.
 * @param options.dateFormat - The resulting date format in the form string notation (only applied to `Date` values).
 * @param options.emptyStringAsFalse - Indicates the input value is an optional `boolean` and an empty string
 *                                     should be converted to 'false'. Only set it to `true` when setting optional
 *                                     booleans in the form action handler.
 * @returns The converted value.
 */
export const toString = (
  value: boolean | string | number | Date | null | undefined,
  options?: { dateFormat?: FormDateFormat; emptyStringAsFalse?: boolean }
) => {
  const { dateFormat = 'yyyy-MM-dd', emptyStringAsFalse = false } = options ?? {};

  if (emptyStringAsFalse && value === '') {
    return 'false';
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date && isValidDate(value)) {
    return formatDate(value, dateFormat);
  }

  return EMPTY_STRING;
};

/**
 * Returns the value represented by an optional `boolean | ''` type.
 *
 * If the `value` is an empty string literal, the `defaultValue`
 * argument is returned (default: `false`).
 *
 * @param value - The provided value.
 * @param defaultValue - The default value.
 * @returns The `boolean` value.
 */
export const asBoolean = (value: boolean | '', defaultValue: boolean = false) =>
  typeof value === 'boolean' ? value : defaultValue;

/**
 * Returns the value represented by an optional `number | ''` type.
 *
 * If the `value` is an empty string literal, the `defaultValue`
 * argument is returned (default: 0).
 *
 * @param value - The provided value.
 * @param defaultValue - The default value.
 * @returns The `number` value.
 */
export const asNumber = (value: number | '', defaultValue: number = 0) =>
  typeof value === 'number' ? value : defaultValue;
