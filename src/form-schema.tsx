import * as z from 'zod';

import type { FormDateFormat, ZodDeepType } from './form-types.d';

import { isValidDate, parseDate } from './helpers/date-formatter';

const EMPTY_STRING = '' as const;
const Z_EMPTY_STRING = z.literal(EMPTY_STRING);

/**
 * Infers form state type from the schema.
 *
 * ```
 * const schema = z.object({
 *   name: z.formString(z.string(), {
 *     required: true,
 *     error: 'Name is required.'
 *   }),
 *   checked: z.formBoolean(z.boolean())
 * });
 *
 * const initialState: z.infer<typeof schema> = {
 *     name: '',
 *     checked: true
 * };
 * ```
 */
export type infer<T extends z.ZodType> = z.infer<T>;

/**
 * Returns a Zod string schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const string = z.string;
/**
 * Returns a Zod number schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const number = z.number;
/**
 * Returns a Zod boolean schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const boolean = z.boolean;
/**
 * Returns a Zod Date schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const date = z.date;
/**
 * Returns a Zod array schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const array = z.array;
/**
 * Returns a Zod object schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const object = z.object;
/**
 * Returns a Zod object schema that does not allow additional properties.
 * Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
export const strictObject = z.strictObject;
/**
 * Returns a Zod symbol schema for unique private properties.
 */
export const symbol = z.symbol;
/**
 * Regular expressions for common validations.
 */
export const regexes = z.regexes;
/**
 * Returns all of the Zod methods and objects.
 *
 * Note: this library does not provides no guarantees of supporting the remainder of
 * Zod types correctly.
 */
export const advanced = { ...z };

/**
 * Zod schema for a control with a boolean value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod boolean schema.
 * @param options - Options for the boolean schema:
 *   - required: Whether a value is required.
 *   - error: Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for boolean values.
 */
export function formBoolean(
  zodBoolean: ZodDeepType<z.ZodBoolean>,
  options?: { required: boolean; error?: string }
) {
  return z.preprocess(
    (value, ctx) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.addIssue({
          code: 'invalid_type',
          expected: 'boolean',
          received: 'string',
          message: options.error,
        });
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return String(value as unknown).toLowerCase() !== 'false' && Boolean(value);
    },
    options?.required ? zodBoolean : zodBoolean.or(Z_EMPTY_STRING)
  );
}

/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options - Options for the date schema:
 *   - required: Whether a value is required.
 *   - error: Optional custom error message for required validation.
 *   - dateFormat: Optional date format string (default: 'yyyy-MM-dd').
 *   - dateFormatError: Optional custom error for invalid dates.
 * @returns A Zod schema with preprocessing for date values.
 */
export function formDate(
  zodDate: ZodDeepType<z.ZodDate>,
  options?: {
    required: boolean;
    error?: string;
    dateFormat?: FormDateFormat;
    dateFormatError?: string;
  }
) {
  const dateFormat = options?.dateFormat || 'yyyy-MM-dd';

  return z.preprocess(
    (value, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.addIssue({
          code: 'invalid_type',
          expected: 'date',
          received: 'string',
          message: options.error,
        });
      }

      if (!value) {
        return EMPTY_STRING;
      }

      const dateValue =
        value instanceof Date ? value : parseDate(String(value as unknown), dateFormat);

      if (!isValidDate(dateValue)) {
        ctx.addIssue({
          code: 'custom',
          format: dateFormat,
          message:
            options?.dateFormatError ??
            'Invalid input: "' + (value as Date | string).toString() + '".',
        });

        return typeof value === 'string' ? value : EMPTY_STRING;
      }

      return dateValue;
    },
    zodDate.meta({ format: dateFormat }).or(z.string())
  );
}

/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options - Options for the number schema:
 *   - required: Whether a value is required.
 *   - error: Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for number values.
 */
export function formNumber(
  zodNumber: ZodDeepType<z.ZodNumber>,
  options?: { required: boolean; error?: string }
) {
  return z.preprocess(
    (value, ctx) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.addIssue({
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          message: options.error,
        });
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return Number(value);
    },
    options?.required ? zodNumber : zodNumber.or(Z_EMPTY_STRING)
  );
}

/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param zodString - The Zod string schema.
 * @param options - Options for the string schema:
 *   - required: Whether a value is required.
 *   - error: Optional custom error message for required validation.
 * @returns A Zod string schema with required or optional validation.
 */
export function formString(
  zodString: ZodDeepType<z.ZodString>,
  options?: { required: boolean; error?: string }
) {
  return z.preprocess(
    (value, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.addIssue({
          code: 'invalid_type',
          expected: 'string',
          message: options.error,
        });
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return value;
    },
    options?.required ? zodString.min(1, options.error) : zodString.or(Z_EMPTY_STRING)
  );
}

/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @param T Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 *   - required: Whether a non-empty value is required.
 *   - error: Optional custom error message for value validation.
 * @returns A Zod string schema that only allows the provided values.
 */
export function formValues<const T extends readonly [string, ...string[]]>(
  values: T,
  options: { required: true; error?: string }
): z.ZodPipe<
  z.ZodTransform,
  z.ZodEnum<{
    [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: {
      [ik in (T | readonly [...T])[number]]: ik;
    }[k];
  }>
>;

/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @param T Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 *   - required: Whether a non-empty value is required.
 *   - error: Optional custom error message for value validation.
 * @returns A Zod string schema that only allows the provided values.
 */
export function formValues<const T extends readonly [string, ...string[]]>(
  values: T,
  options?: { required?: false; error?: string }
): z.ZodPipe<
  z.ZodTransform,
  | z.ZodEnum<{
      [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: {
        [ik in (T | readonly [...T])[number]]: ik;
      }[k];
    }>
  | z.ZodLiteral<''>
>;

// base overload
export function formValues(
  values: readonly string[],
  options?: { required?: boolean; error?: string }
) {
  if (!values?.length) {
    throw new TypeError('At least one value is required');
  }

  if (values.some((value) => !value)) {
    throw new TypeError('Null or empty values are not allowed.');
  }

  return z.preprocess(
    (value, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.addIssue({
          code: 'invalid_type',
          expected: 'string',
          message: options.error,
        });
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return value;
    },
    options?.required
      ? z.enum(values, options?.error)
      : z.enum([...values, EMPTY_STRING] as const, options?.error)
  );
}

/**
 * Zod schema for an array form schema element of simple elements.
 *
 * Note: Use `z.array()` or `z.object()` to shape complex schemas.
 *
 * @param elementSchema - Zod schema for the array elements (do not wrap in z.array()).
 * @param options - Options for the array schema:
 *   - required: Whether a value is required.
 *   - error: Optional custom error message for required validation.
 *   - lengthError: Optional custom error message for min/max validation.
 * @throws If elementSchema is already a ZodArray.
 * @returns A Zod array schema.
 */
export function formArray<T extends z.ZodType>(
  elementSchema: T extends z.ZodObject | z.ZodArray ? never : T,
  options?: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    error?: string;
    lengthError?: string;
  }
) {
  let schema = z.array(elementSchema, options?.error);

  if (typeof options?.minLength === 'number' && Number.isInteger(options.minLength)) {
    schema = schema.min(options.minLength, options?.lengthError);
  }

  if (typeof options?.maxLength === 'number' && Number.isInteger(options.maxLength)) {
    schema = schema.max(options.maxLength, options?.lengthError);
  }

  return options?.required ? schema : schema.optional();
}
