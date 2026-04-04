import * as z from 'zod/mini';
import { deepEqual } from 'fast-equals';

import type {
  FormDateFormat,
  FormDateOptions,
  FormStringOptions,
  FormTypeOptions,
  SchemaDataObject,
  ZodValidationError,
} from './types/form-types';

import { isValidDate, parseDate } from './helpers/date-formatter';
import { cleanEmpty } from './helpers/state-manager';

const EMPTY_STRING = '' as const;
const Z_EMPTY_STRING = z.literal(EMPTY_STRING);

const ALWAYS_VALIDATE = () => true;

/**
 * Converts an inferred schema instance into an object without empty literal unions.
 */
(z.ZodMiniObject.prototype as Record<string, unknown>)['toObject'] = function <
  T extends z.ZodMiniObject,
>(this: T, data: z.infer<T>) {
  return cleanEmpty(this, data) as SchemaDataObject<z.infer<T>>;
};

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
 * Zod negative number validation function.
 */
export const negative = z.negative;

/**
 * Zod non-negative number validation function.
 */
export const nonnegative = z.nonnegative;

/**
 * Zod non-positive number validation function.
 */
export const nonpositive = z.nonpositive;

/**
 * Zod positive number validation function.
 */
export const positive = z.positive;

/**
 * Zod "includes" string validation function.
 */
export const includes = z.includes;

/**
 * Zod "starts with" string validation function.
 */
export const startsWith = z.startsWith;

/**
 * Zod "ends with" string validation function.
 */
export const endsWith = z.endsWith;

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
 * Zod describe function.
 */
export const describe = z.describe;

/**
 * Zod refine function.
 */
export const refine = z.refine;

/**
 * Zod superRefine function.
 */
export const superRefine = z.superRefine;

/**
 * Zod prefault value.
 */
export const prefault = z.prefault;

// Exported functions with reserved names.

/**
 * Zod default value.
 */
const _default = z._default;

/**
 * Zod catch value.
 */
const _catch = z.catch;

// eslint-disable-next-line unicorn/no-named-default
export { _catch as catch, _default as default };

/**
 * Advanced Zod methods - not recommended for direct schema use
 * because the library might not support them.
 */
export const advanced = {
  // Primitive/special types
  bigint: z.bigint,
  literal: z.literal,
  enum: z.enum,
  any: z.any,
  unknown: z.unknown,
  never: z.never,
  void: z.void,
  null: z.null,
  undefined: z.undefined,
  union: z.union,
  discriminatedUnion: z.discriminatedUnion,
  intersection: z.intersection,
  tuple: z.tuple,
  partialRecord: z.record,
  record: z.record,
  map: z.map,
  set: z.set,
  promise: z.promise,
  function: z.function,
  json: z.json,

  // Optionality/nullability
  optional: z.optional,
  nonoptional: z.nonoptional,
  nullable: z.nullable,
  nullish: z.nullish,

  // Input preprocessing & coercion
  catchall: z.catchall,
  coerce: z.coerce,
  instanceof: z.instanceof,
  lazy: z.lazy,
  overwrite: z.overwrite,
  pipe: z.pipe,
  transform: z.transform,
};

/**
 * Zod schema for a control with a boolean value that can optionally be an empty string.
 *
 * @param options - Options for the boolean schema.
 * @param options.required - Indicates whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.checks - Optional Zod checks.
 * @returns A Zod schema with preprocessing for boolean values.
 */
export function formBoolean(options?: FormTypeOptions) {
  const zodBoolean = options?.error ? z.boolean({ error: options.error }) : z.boolean();

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
 * @returns A Zod schema with preprocessing for date values.
 */
export function formDate(): z.ZodMiniPipe<
  z.ZodMiniTransform<string | Date>,
  z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>
>;

/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options.checks - Zod checks.
 * @returns A Zod schema with preprocessing for date values.
 */
export function formDate(
  ...checks: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<string | Date>,
  z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>
>;

/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options - Options for the date schema.
 * @param options.required - Whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.dateFormat - Optional date format string (default: 'yyyy-MM-dd').
 * @param options.dateFormatError - Optional custom error for invalid dates.
 * @param options.checks - Optional Zod checks.
 * @returns A Zod schema with preprocessing for date values.
 */
export function formDate(
  options: FormDateOptions,
  ...checks: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<string | Date>,
  z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>
>;

export function formDate(
  first?: FormDateOptions | z.core.CheckFn<Date> | z.core.$ZodCheck<Date>,
  ...rest: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[]
) {
  let options: {
    required?: boolean;
    dateFormat?: FormDateFormat;
    error?: string;
    dateFormatError?: string;
  };
  let checks: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[] = [];

  if (first === undefined) {
    options = {};
  } else if (
    typeof first === 'object' &&
    ('required' in first || 'dateFormat' in first || 'error' in first || 'dateFormatError' in first)
  ) {
    options = first;
    checks = rest;
  } else {
    options = {};
    checks = [first, ...rest];
  }

  let zodDate = options.error ? z.date({ error: options.error }) : z.date();

  if (checks.length > 0) {
    zodDate = zodDate.check(...checks);
  }

  const dateFormat = options.dateFormat || 'yyyy-MM-dd';

  const zodDateWithMeta = zodDate.with(z.meta({ format: dateFormat }));

  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (options.required && options.error && (value === undefined || value === EMPTY_STRING)) {
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
            options.dateFormatError ??
            'Invalid input: "' + (value as Date | string).toString() + '".',
          input: value,
        } as z.core.$ZodRawIssue);

        return typeof value === 'string' ? value : EMPTY_STRING;
      }

      return dateValue;
    }),
    options.required
      ? z.union([zodDateWithMeta, z.string().check(z.minLength(1, options.error))])
      : z.union([zodDateWithMeta, z.string()])
  );
}

/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @returns A Zod schema with preprocessing for number values.
 */
export function formNumber(): z.ZodMiniPipe<
  z.ZodMiniTransform<number | ''>,
  z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>
>;

/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options.checks - Zod checks.
 * @returns A Zod schema with preprocessing for number values.
 */
export function formNumber(
  ...checks: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<number | ''>,
  z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>
>;

/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options - Options for the number schema.
 * @param options.required - Whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.checks - Optional Zod checks.
 * @returns A Zod schema with preprocessing for number values.
 */
export function formNumber(
  options: FormTypeOptions,
  ...checks: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<number | ''>,
  z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>
>;

export function formNumber(
  first?: FormTypeOptions | z.core.CheckFn<number> | z.core.$ZodCheck<number>,
  ...rest: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[]
) {
  let options: { required?: boolean; error?: string };
  let checks: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[] = [];

  if (first === undefined) {
    options = {};
  } else if (typeof first === 'object' && ('required' in first || 'error' in first)) {
    options = first;
    checks = rest;
  } else {
    options = {};
    checks = [first, ...rest];
  }

  let zodNumber = options.error ? z.number({ error: options.error }) : z.number();

  if (checks.length > 0) {
    zodNumber = zodNumber.check(...checks);
  }

  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (options.required && options.error && (value === undefined || value === EMPTY_STRING)) {
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
    options.required ? zodNumber : z.union([zodNumber, Z_EMPTY_STRING])
  );
}

/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @returns A Zod string schema with required or optional validation.
 */
export function formString(): z.ZodMiniPipe<
  z.ZodMiniTransform<string>,
  z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>
>;

/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param options.checks - Zod checks.
 * @returns A Zod string schema with required or optional validation.
 */
export function formString(
  ...checks: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<string>,
  z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>
>;

/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param options - Options for the string schema.
 * @param options.required - Indicates whether a value is required (default: `false`).
 * @param options.allowEmpty - Indicates whether the `toObject()` method on the `data` form state
 *                             property should keep an empty string value (default: `true`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.checks - Optional Zod checks.
 * @returns A Zod string schema with required or optional validation.
 */
export function formString(
  options: FormStringOptions,
  ...checks: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[]
): z.ZodMiniPipe<
  z.ZodMiniTransform<string>,
  z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>
>;

export function formString(
  first?: FormStringOptions | z.core.CheckFn<string> | z.core.$ZodCheck<string>,
  ...rest: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[]
) {
  let options: { required?: boolean; allowEmpty?: boolean; error?: string };
  let checks: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[] = [];

  if (first === undefined) {
    options = {};
  } else if (
    typeof first === 'object' &&
    ('required' in first || 'allowEmpty' in first || 'error' in first)
  ) {
    options = first;
    checks = rest;
  } else {
    options = {};
    checks = [first, ...rest];
  }

  let zodString = options.error ? z.string({ error: options.error }) : z.string();

  if (checks.length > 0) {
    zodString = zodString.check(...checks);
  }

  return z.pipe(
    z.transform((value: unknown, ctx) => {
      if (options.required && options.error && (value === undefined || value === EMPTY_STRING)) {
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
    options.required
      ? zodString
          .check(z.minLength(1, options.error))
          .with(z.meta({ allowEmpty: options.allowEmpty !== false }))
      : z.union([
          zodString.with(z.meta({ allowEmpty: options.allowEmpty !== false })),
          Z_EMPTY_STRING,
        ])
  );
}

/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @typeParam T - Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 * @param options.required - Whether a non-empty value is required (default: `false`).
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
 * @param options.required - Whether a non-empty value is required (default: `false`).
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
  if (values.length === 0) {
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
      ? z.enum(values, options.error).with(z.meta({ allowEmpty: false }))
      : z
          .enum([...values, EMPTY_STRING] as const, options?.error)
          .with(z.meta({ allowEmpty: false }))
  );
}

/**
 * Zod schema for an array form schema element of simple elements.
 *
 * Note: Use `z.array()` or `z.object()` to shape complex schemas.
 *
 * @param elementSchema - Zod schema for the array elements (do not wrap in z.array()).
 * @param options - Options for the array schema.
 * @param options.required - Whether the array is required in the schema (default: true).
 * @param options.error - Optional custom error message for required validation.
 * @param options.lengthError - Optional custom error message for min/max validation.
 * @throws If elementSchema is already a ZodArray.
 * @returns A Zod array schema.
 */
export function formArray<T extends z.ZodMiniType>(
  elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T,
  options: {
    required: false;
    minLength?: number;
    maxLength?: number;
    error?: string;
    lengthError?: string;
  }
): z.ZodMiniOptional<z.ZodMiniArray<T>>;

/**
 * Zod schema for an array form schema element of simple elements.
 *
 * Note: Use `z.array()` or `z.object()` to shape complex schemas.
 *
 * @param elementSchema - Zod schema for the array elements (do not wrap in z.array()).
 * @param options - Options for the array schema.
 * @param options.required - Whether the array is required in the schema (default: true).
 * @param options.error - Optional custom error message for required validation.
 * @param options.lengthError - Optional custom error message for min/max validation.
 * @throws If elementSchema is already a ZodArray.
 * @returns A Zod array schema.
 */
export function formArray<T extends z.ZodMiniType>(
  elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T,
  options?: {
    required?: true;
    minLength?: number;
    maxLength?: number;
    error?: string;
    lengthError?: string;
  }
): z.ZodMiniArray<T>;

// base overload
export function formArray<T extends z.ZodMiniType>(
  elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T,
  options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    error?: string;
    lengthError?: string;
  }
) {
  let schema = z.array(elementSchema, options?.error);

  const checks: z.core.$ZodCheck[] = [];

  if (typeof options?.minLength === 'number' && Number.isInteger(options.minLength)) {
    checks.push(z.minLength(options.minLength, options.lengthError));
  }

  if (typeof options?.maxLength === 'number' && Number.isInteger(options.maxLength)) {
    checks.push(z.maxLength(options.maxLength, options.lengthError));
  }

  if (checks.length > 0) {
    schema = schema.check(...(checks as z.core.$ZodCheck<z.output<typeof elementSchema>[]>[]));
  }

  return options?.required === false ? z.optional(schema) : schema;
}

// Generic object validation

/**
 * Creates a full schema validation check.
 *
 * @param predicate - A function that accepts a schema object instance. It returns a `bool` value indicating
 *                    whether the schema object passes the rule.
 * @param params.condition - An optional function that returns a `boolean` value indicating whether to perform
 *                           the validation based on the existing schema validation errors.
 *
 *                           Validations always run by default, unlike the `refine`/`superRefine` methods.
 * @param params.path - An optional `errors` object key to store the error message with.
 * @param params.error - An optional custom error message.
 * @returns The object schema.
 */
export function validate<T>(
  predicate: (item: NoInfer<T>) => boolean,
  params?: {
    condition?: (errors: ZodValidationError[]) => boolean;
    path?: PropertyKey[] | PropertyKey;
    error?: string;
  }
): z.core.$ZodCheck<T>;

/**
 * Creates a full schema validation check.
 *
 * @param predicate - A function that accepts a schema object instance. It returns a `bool` value indicating
 *                    whether the schema object passes the rule.
 * @param error - A custom error message.
 * @returns The object schema.
 */
export function validate<T>(
  predicate: (item: NoInfer<T>) => boolean,
  error: string
): z.core.$ZodCheck<T>;

export function validate<T>(
  predicate: (item: NoInfer<T>) => boolean,
  params?:
    | {
        condition?: (errors: ZodValidationError[]) => boolean;
        path?: PropertyKey[] | PropertyKey;
        error?: string;
      }
    | string
) {
  const paramsIsError = typeof params === 'string';
  const condition = paramsIsError ? ALWAYS_VALIDATE : (params?.condition ?? ALWAYS_VALIDATE);
  const path = paramsIsError ? undefined : params?.path;
  const error = paramsIsError ? params : params?.error;

  return z.refine<T>((obj) => predicate(obj), {
    when: (payload) =>
      condition(
        payload.issues.map((issue) => ({
          ...issue,
          message:
            issue.message ||
            (typeof issue.params === 'object' &&
            issue.params !== null &&
            'message' in issue.params &&
            typeof issue.params.message === 'string'
              ? issue.params['message']
              : 'Invalid input'),
          pathNotation:
            issue.path
              ?.filter((part) => typeof part !== 'symbol')
              .map((part) => part.toString())
              .join('.') ?? '',
        }))
      ),
    path: Array.isArray(path) || path === undefined ? path : [path],
    params: error ? { message: error } : undefined,
    error,
  });
}

// Array validations

/**
 * Determines whether the specified callback function returns true for any element of an array.
 * Use with `.check()` on an array schema.
 *
 * @typeParam T - The array item type.
 * @param predicate - A function that accepts up to three arguments. The some method calls the predicate
 *                    function for each element in the array until the predicate returns a value which
 *                    is coercible to the `bool` value true, or until the end of the array.
 * @param error - An optional custom error message.
 * @returns A Zod check that can be passed to `.check()`.
 */
export function someItem<T>(
  predicate: (item: NoInfer<T>, index: number, items: NoInfer<T>[]) => boolean,
  error?: string
) {
  return z.refine<T[]>((arr) => arr.some((item, index, items) => predicate(item, index, items)), {
    when: ALWAYS_VALIDATE,
    params: error ? { message: error } : undefined,
    error,
  });
}

/**
 * Determines whether all the members of an array satisfy the specified test.
 * Use with `.check()` on an array schema.
 *
 * @typeParam T - The array item type.
 * @param predicate - A function that accepts up to three arguments. The every method calls the predicate
 *                    function for each element in the array until the predicate returns a value which is
 *                    coercible to the `bool` value false, or until the end of the array.
 * @param error - An optional custom error message.
 * @returns A Zod check that can be passed to `.check()`.
 */
export function everyItem<T>(
  predicate: (item: NoInfer<T>, index: number, items: NoInfer<T>[]) => boolean,
  error?: string
) {
  return z.refine<T[]>((arr) => arr.every((item, index, items) => predicate(item, index, items)), {
    when: ALWAYS_VALIDATE,
    params: error ? { message: error } : undefined,
    error,
  });
}

/**
 * Ensures all items in the array schema are unique.
 * Use with `.check()` on an array schema.
 *
 * @typeParam T - The array item type.
 * @param deepEquality - A `bool` value indicating whether deep equality should be used instead of reference
 *                       equality (default: `false`).
 * @param params.mapFn - An optional mapping function to compare properties of items `(item: T, index: number) => unknown`.
 * @param params.error - An optional custom error message.
 * @param params.elementPath - An optional array element path.
 *                             * Default error path: `"people[1]"`
 *                             * Element path `['email', 'value']`: `"people[1].email.value"`
 * @param params.ignoreValues - An optional array of values to ignore, typically empty string or `null` values.
 *
 *                              This only applies to array items, not their property values; use the `mapFn` parameter to compare
 *                              property values.
 * @returns A Zod check that can be passed to `.check()`.
 */
export function uniqueItems<T>(
  deepEquality: boolean = false,
  params?: {
    mapFn?: (item: T, index: number) => unknown;
    error?: string;
    elementPath?: PropertyKey[];
    ignoreValues?: unknown[];
  }
) {
  return z.superRefine<T[]>((arr, ctx) => {
    const seen: unknown[] = [];
    const ignoredValues = new Set(params?.ignoreValues);

    for (const [index, item] of arr.entries()) {
      const value = typeof params?.mapFn === 'function' ? params.mapFn(item, index) : item;

      if (
        !ignoredValues.has(value) &&
        seen.some((existing) => (deepEquality ? deepEqual(existing, value) : existing === value))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: params?.error,
          path: params?.elementPath ? [index, ...params.elementPath] : [index],
          params: {
            index,
            value,
          },
        });
        return;
      }

      seen.push(value);
    }
  });
}
