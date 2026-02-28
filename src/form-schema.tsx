import * as z from 'zod/mini';

import type { FormDateFormat, ZodDeepType } from './types/form-types';

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
export type infer<T extends z.ZodMiniType> = z.infer<T>;

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
 * Zod regular expression validation function.
 */
export const regex = z.regex;

/**
 * Zod minimum length validation function.
 */
export const minLength = z.minLength;

/**
 * Zod maximum length validation function.
 */
export const maxLength = z.maxLength;

/**
 * Zod  length validation function.
 */
export const length = z.length;

/**
 * Zod minimum value validation function.
 */
export const minimum = z.minimum;

/**
 * Zod maximum length validation function.
 */
export const maximum = z.maximum;

/**
 * Zod greater than validation function.
 */
export const gt = z.gt;

/**
 * Zod greater than or equal validation function.
 */
export const gte = z.gte;

/**
 * Zod less than validation function.
 */
export const lt = z.lt;

/**
 * Zod less than or equal validation function.
 */
export const lte = z.lte;

/**
 * Zod describe function.
 */
export const describe = z.describe;

/**
 * Zod trim function.
 */
export const trim = z.trim;

/**
 * Zod toUpperCase function.
 */
export const toLowerCase = z.toLowerCase;

/**
 * Zod toUpperCase function.
 */
export const toUpperCase = z.toUpperCase;

/**
 * Zod optional property function.
 */
export const optional = z.optional;

/**
 * Zod non-optional property function.
 */
export const nonoptional = z.nonoptional;

// Exported functions with reserved names.

/**
 * Zod enum.
 */
const _enum = z.enum;
/**
 * Zod catch value.
 */
const _catch = z.catch;
/**
 * Zod default value.
 */
const _default = z._default;

// eslint-disable-next-line unicorn/no-named-default
export { _enum as enum, _catch as catch, _default as default };

/**
 * Advanced Zod transformations - not for direct schema use.
 */
export const advanced = {
  /**
   * Zod literal value.
   */
  literal: z.literal,
  /**
   * Zod nullable value.
   */
  nullable: z.nullable,
  /**
   * Zod nullish value.
   */
  nullish: z.nullish,
  /**
   * Zod pipe.
   */
  pipe: z.pipe,
  /**
   * Zod transformation.
   */
  transform: z.transform,
  /**
   * Zod union.
   */
  union: z.union,
};

/**
 * Zod schema for a control with a boolean value that can optionally be an empty string.
 *
 * @param zodBoolean - The Zod boolean schema.
 * @param options - Options for the boolean schema.
 * @param options.required - Indicates whether a value is required.
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for boolean values.
 */
export function formBoolean(
  zodBoolean: ZodDeepType<z.ZodMiniBoolean<boolean>>,
  options?: { required: boolean; error?: string }
) {
  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'boolean',
          received: 'string',
          message: options.error,
          input: value,
        } as z.core.$ZodRawIssue);
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return String(value as unknown).toLowerCase() !== 'false' && Boolean(value);
    }),
    options?.required ? zodBoolean : z.union([zodBoolean, Z_EMPTY_STRING])
  );
}

/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options - Options for the date schema.
 * @param options.required - Whether a value is required.
 * @param options.error - Optional custom error message for required validation.
 * @param options.dateFormat - Optional date format string (default: 'yyyy-MM-dd').
 * @param options.dateFormatError - Optional custom error for invalid dates.
 * @returns A Zod schema with preprocessing for date values.
 */
export function formDate(
  zodDate: ZodDeepType<z.ZodMiniDate<Date>>,
  options?: {
    required: boolean;
    error?: string;
    dateFormat?: FormDateFormat;
    dateFormatError?: string;
  }
) {
  const dateFormat = options?.dateFormat || 'yyyy-MM-dd';

  const zodDateWithMeta = zodDate.check(z.meta({ format: dateFormat }));

  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'date',
          received: 'string',
          message: options.error,
          input: value,
        } as z.core.$ZodRawIssue);
      }

      if (!value) {
        return EMPTY_STRING;
      }

      const dateValue =
        value instanceof Date ? value : parseDate(String(value as unknown), dateFormat);

      if (!isValidDate(dateValue)) {
        ctx.issues.push({
          code: 'custom',
          message:
            options?.dateFormatError ??
            'Invalid input: "' + (value as Date | string).toString() + '".',
          input: value,
        } as z.core.$ZodRawIssue);

        return typeof value === 'string' ? value : EMPTY_STRING;
      }

      return dateValue;
    }),
    options?.required
      ? z.union([zodDateWithMeta, z.string().check(z.minLength(1, options?.error))])
      : z.union([zodDateWithMeta, z.string()])
  );
}

/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options - Options for the number schema.
 * @param options.required - Whether a value is required.
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for number values.
 */
export function formNumber(
  zodNumber: ZodDeepType<z.ZodMiniNumber<number>>,
  options?: { required: boolean; error?: string }
) {
  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          message: options.error,
          input: value,
        } as z.core.$ZodRawIssue);
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return Number(value);
    }),
    options?.required ? zodNumber : z.union([zodNumber, Z_EMPTY_STRING])
  );
}

/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param zodString - The Zod string schema.
 * @param options - Options for the string schema.
 * @param options.required - Whether a value is required.
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod string schema with required or optional validation.
 */
export function formString(
  zodString: ZodDeepType<z.ZodMiniString<string>>,
  options?: { required: boolean; error?: string }
) {
  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'string',
          message: options.error,
          input: value,
        } as z.core.$ZodRawIssue);
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return value as string;
    }),
    options?.required
      ? zodString.check(z.minLength(1, options.error))
      : z.union([zodString, Z_EMPTY_STRING])
  );
}

/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @typeParam T - Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 * @param options.required - Whether a non-empty value is required.
 * @param options.error - Optional custom error message for value validation.
 * @returns A Zod string schema that only allows the provided values.
 */
export function formValues<const T extends readonly [string, ...string[]]>(
  values: T,
  options: { required: true; error?: string }
): z.ZodMiniPipe<
  z.ZodMiniTransform,
  z.ZodMiniEnum<{
    [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: {
      [ik in (T | readonly [...T])[number]]: ik;
    }[k];
  }>
>;

/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @typeParam T - Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 * @param options.required - Whether a non-empty value is required.
 * @param options.error - Optional custom error message for value validation.
 * @returns A Zod string schema that only allows the provided values.
 */
export function formValues<const T extends readonly [string, ...string[]]>(
  values: T,
  options?: { required?: false; error?: string }
): z.ZodMiniPipe<
  z.ZodMiniTransform,
  | z.ZodMiniEnum<{
      [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: {
        [ik in (T | readonly [...T])[number]]: ik;
      }[k];
    }>
  | z.ZodMiniLiteral<''>
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

  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (options?.required && options.error && (value === undefined || value === EMPTY_STRING)) {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'string',
          message: options.error,
          input: value,
        } as z.core.$ZodRawIssue);
      }
      if (!value) {
        return EMPTY_STRING;
      }
      return value;
    }),
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
 * @param options - Options for the array schema.
 * @param options.required - Whether a value is required.
 * @param options.error - Optional custom error message for required validation.
 * @param options.lengthError - Optional custom error message for min/max validation.
 * @throws If elementSchema is already a ZodArray.
 * @returns A Zod array schema.
 */
export function formArray<T extends z.ZodMiniType>(
  elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T,
  options?: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    error?: string;
    lengthError?: string;
  }
) {
  let schema = z.array(elementSchema, options?.error);

  const checks: z.core.$ZodCheck[] = [];

  if (typeof options?.minLength === 'number' && Number.isInteger(options.minLength)) {
    checks.push(z.minLength(options.minLength, options?.lengthError));
  }

  if (typeof options?.maxLength === 'number' && Number.isInteger(options.maxLength)) {
    checks.push(z.maxLength(options.maxLength, options?.lengthError));
  }

  if (checks.length > 0) {
    schema = schema.check(...(checks as z.core.$ZodCheck<z.output<typeof elementSchema>[]>[]));
  }

  return options?.required ? schema : z.optional(schema);
}
