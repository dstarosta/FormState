import * as z from 'zod/mini';

import type {
  DeepPartial,
  FieldRange,
  FormMutableState,
  FormPath,
  FormState,
  GetByGroup,
  Group,
  GroupNames,
  GroupSchemaShape,
  KeysInGroup,
  FormPathValueOrUnknown,
  FormStatePath,
  Immutable,
  ImmutableArray,
  ImmutableObject,
  ParseAsObjectResult,
  ParseResult,
  PathExpression,
  RangeResult,
  UnknownObject,
} from '../types/form-types';

import { deepEqual } from './deep-equal';
import { dotPathGet } from './dot-path';
import { generateUniqueId } from './random-id-generator';
import {
  allowEmptyString,
  getBaseType,
  getDateFormat,
  getPath,
  getPathNotation,
  getSchemaType,
  hasChangePhaseAsyncChecks,
} from './schema-visitor';
import { IS_DEVELOPMENT } from './development-helper';
import { formatErrors } from './error-formatter';
import { formatDate } from './date-formatter';

// Private functions

const isNullish = (value: unknown) => {
  return value === undefined || value === null;
};

const isNotRecordObject = (value: unknown) => {
  if (isNullish(value)) {
    return true;
  }

  const type = typeof value;

  if (type !== 'object') {
    return true;
  }

  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Error ||
    value instanceof Promise ||
    value instanceof Set ||
    value instanceof Map
  ) {
    return true;
  }

  return false;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  !isNotRecordObject(value) && !Array.isArray(value);

const buildParseResult = <T extends z.ZodMiniObject>(
  schema: T,
  parsedData: z.infer<T>,
  resultError: z.core.$ZodError<object> | undefined,
  asSchemaData: boolean,
  errorMessageSeparator: string
): ParseResult<T> | ParseAsObjectResult<T> => {
  const zodErrors = formatErrors<z.infer<T>>(resultError, errorMessageSeparator);

  const errors = {
    ...zodErrors,
    get: (expression: (data: z.infer<T>) => unknown) =>
      zodErrors[getPath(parsedData, expression).join('.')],
    getAll: () => allErrors(zodErrors, errorMessageSeparator),
    getKeys: () => truthyKeys(zodErrors),
  };

  const success = Object.keys(zodErrors).length === 0;

  if (asSchemaData) {
    return {
      data: schema.toObject(parsedData),
      success,
      errors,
    } satisfies ParseAsObjectResult<T>;
  }

  return {
    data: parsedData,
    success,
    errors,
  } satisfies ParseResult<T>;
};

// Internal functions

export const cleanEmpty = <T>(
  schema: z.ZodMiniType,
  obj: T | T[] | null,
  field: string = '',
  parentKey: string = ''
): DeepPartial<T> | DeepPartial<T>[] => {
  let path: string | undefined;
  const getFieldPath = () => (path ??= parentKey ? `${parentKey}.${field}` : field);

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanEmpty(schema, item, '0', getFieldPath())) as DeepPartial<T>[];
  }

  if (isNotRecordObject(obj)) {
    if (obj instanceof Date) {
      return formatDate(obj, getDateFormat(schema, getFieldPath())) as DeepPartial<T>;
    }

    return obj as DeepPartial<T>;
  }

  const innerObj: UnknownObject = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as UnknownObject)[key];

      if (typeof value === 'function' || value instanceof Promise) {
        continue;
      }

      let valuePath: string | undefined;

      const getValuePath = () => {
        if (valuePath !== undefined) {
          return valuePath;
        }

        const parent = getFieldPath();

        valuePath = parent ? `${parent}.${key}` : key;

        return valuePath;
      };

      if (isNotRecordObject(value) && typeof value !== 'symbol' && typeof value !== 'string') {
        if (value instanceof Date) {
          innerObj[key] = formatDate(value, getDateFormat(schema, getValuePath()));
        } else if (value !== undefined) {
          innerObj[key] = value;
        }

        continue;
      }

      const cleanedValue = cleanEmpty(schema, value, key, getFieldPath());

      if (
        isRecordObject(cleanedValue) &&
        Object.keys(cleanedValue).filter(
          (innerKey) => typeof (cleanedValue as UnknownObject)[innerKey] !== 'symbol'
        ).length === 0
      ) {
        continue;
      }

      const isEmptyString = typeof cleanedValue === 'string' && cleanedValue === '';
      const hasEmptyStringSchema =
        getSchemaType(schema, getValuePath()) === 'string' &&
        allowEmptyString(schema, getValuePath());

      if (typeof cleanedValue !== 'symbol' && (!isEmptyString || hasEmptyStringSchema)) {
        innerObj[key] = cleanedValue;
      }
    }
  }

  return innerObj as DeepPartial<T>;
};

export const diffedState = <T extends z.ZodMiniObject>(
  state: FormMutableState<z.infer<T>>,
  prevState: FormMutableState<z.infer<T>>
) => {
  if (state === prevState) {
    return prevState;
  }

  if (deepEqual(state, prevState)) {
    return prevState;
  }

  return state;
};

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Promise ||
    value instanceof Set ||
    value instanceof Map ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }

  return Object.freeze(value);
};

const truthyKeys = (obj: Record<string, unknown>): string[] =>
  Object.entries(obj)
    .filter((entry) => Boolean(entry[1]))
    .map((entry) => entry[0]);

const allErrors = (
  errors: Record<string, string | undefined>,
  errorMessageSeparator: string
): string[] =>
  Object.values(errors)
    .filter((error): error is string => typeof error === 'string' && error.trim().length > 0)
    .flatMap((error) => error.split(errorMessageSeparator));

const toPathKey = <T extends object>(data: T, expression: PathExpression<T>): string =>
  getPath(data, expression).join('.');

const toPathNotation = <T extends object>(data: T, expression: PathExpression<T>): string =>
  getPathNotation(getPath(data, expression) as Parameters<typeof getPathNotation>[0]);

const errorGetters = <T extends object>(
  errors: Record<string, string | undefined>,
  data: T,
  errorMessageSeparator: string
) => ({
  get: (expression: PathExpression<T>) => errors[toPathKey(data, expression)],
  getManual: (key: string) => errors[key],
  getAll: () => allErrors(errors, errorMessageSeparator),
  getKeys: () => truthyKeys(errors),
});

const touchedGetters = <T extends object>(touched: Record<string, unknown>, data: T) => ({
  get: (expression: PathExpression<T>) => Boolean(touched[toPathKey(data, expression)]),
  getKeys: () => truthyKeys(touched),
});

const dirtyGetters = (dirty: Record<string, unknown>) => ({
  get: (key: `#${string}`) => Boolean(dirty[key]),
  getKeys: () => truthyKeys(dirty),
});

const requiredGetters = <T extends object>(required: Record<string, unknown>, data: T) => ({
  get: (expression: PathExpression<T>) => Boolean(required[toPathKey(data, expression)]),
  getKeys: () => truthyKeys(required),
});

const rangeOf = <T extends object>(
  ranges: Record<string, { min: FieldRange; max: FieldRange } | undefined>,
  data: T,
  nameOrPath: PropertyKey | PathExpression<T>,
  bound: 'min' | 'max'
): number | Date => {
  const path =
    typeof nameOrPath === 'function' ? toPathNotation(data, nameOrPath) : String(nameOrPath);

  const value = ranges[path]?.[bound];

  if (value === undefined) {
    throw new TypeError(`No ${bound} range value is defined for path '${path}'.`);
  }

  return value;
};

const rangeGetters = <T extends object>(
  ranges: Record<string, { min: FieldRange; max: FieldRange } | undefined>,
  data: T
) => ({
  get: (expression: PathExpression<T>) =>
    ranges[toPathNotation(data, expression)] as RangeResult<number | Date> | undefined,
  getMin: (nameOrPath: PropertyKey | PathExpression<T>) => rangeOf(ranges, data, nameOrPath, 'min'),
  getMax: (nameOrPath: PropertyKey | PathExpression<T>) => rangeOf(ranges, data, nameOrPath, 'max'),
  getKeys: () => truthyKeys(ranges),
});

const stringGetters = <T extends object, F extends boolean>(
  slice: Record<string, string | undefined>,
  data: T,
  emptyFallback: F
) => ({
  get: (expression: PathExpression<T>) => {
    const value = slice[toPathNotation(data, expression)];
    return (emptyFallback ? (value ?? '') : value) as F extends true ? string : string | undefined;
  },
  getKeys: () => truthyKeys(slice),
});

export const freezeObject = <T extends object>(obj: T) => {
  return IS_DEVELOPMENT ? (deepFreeze(obj) as Immutable<T>) : (obj as Immutable<T>);
};

export const createImmutableData = <T extends z.ZodMiniObject>(data: z.infer<T>) =>
  freezeObject({
    ...data,
  });

export const createImmutableErrors = <T extends z.ZodMiniObject>(
  errors: Record<keyof z.infer<T> | '', string | undefined>,
  data: z.infer<T>,
  errorMessageSeparator: string
) =>
  freezeObject({
    ...errors,
    ...errorGetters(errors, data, errorMessageSeparator),
  });

export const createImmutableDirty = <T extends z.ZodMiniObject>(
  dirty: Record<keyof z.infer<T>, boolean>
) =>
  freezeObject({
    ...dirty,
    ...dirtyGetters(dirty),
  });

export const createImmutableTouched = <T extends z.ZodMiniObject>(
  touched: Record<keyof z.infer<T>, boolean>,
  data: z.infer<T>
) =>
  freezeObject({
    ...touched,
    ...touchedGetters(touched, data),
  });

export const createImmutableRanges = <T extends z.ZodMiniObject>(
  ranges: Record<
    keyof z.infer<T>,
    {
      type: string;
      format: string;
      min: FieldRange;
      max: FieldRange;
    }
  >,
  data: z.infer<T>
) =>
  freezeObject({
    ...ranges,
    ...rangeGetters(ranges, data),
  }) as FormState<z.infer<T>>['ranges'];

export const createImmutablePatterns = <T extends z.ZodMiniObject>(
  patterns: Record<keyof z.infer<T>, string | undefined>,
  data: z.infer<T>
) =>
  freezeObject({
    ...patterns,
    ...stringGetters(patterns, data, false),
  });

export const createImmutableDescriptions = <T extends z.ZodMiniObject>(
  descriptions: Record<keyof z.infer<T> | '', string | undefined>,
  data: z.infer<T>
) =>
  freezeObject({
    ...descriptions,
    ...stringGetters(descriptions, data, true),
  });

export const createImmutableRequired = <T extends z.ZodMiniObject>(
  required: Record<keyof z.infer<T>, boolean>,
  data: z.infer<T>
) =>
  freezeObject({
    ...required,
    ...requiredGetters(required, data),
  });

const pickByKeys = <V>(
  source: Record<string, V>,
  keys: ReadonlySet<string>,
  includeRootKey: boolean
): Record<string, V> => {
  const result: Record<string, V> = {};

  for (const key of Object.keys(source)) {
    const rootSegment = key.split('.', 1)[0] ?? key;

    if (keys.has(rootSegment) || (includeRootKey && key === '')) {
      result[key] = source[key] as V;
    }
  }

  return result;
};

export const groupFieldNames = (groups: Record<string, string>, name: string): string[] => {
  const fieldNames = Object.keys(groups).filter((field) => groups[field] === name);

  if (fieldNames.length === 0) {
    throw new TypeError(`No fields are assigned to the group '${name}'.`);
  }

  return fieldNames;
};

export const createGroupBundle = <T extends z.ZodMiniObject>(
  groups: Record<string, string>,
  slices: {
    data: Record<string, unknown>;
    errors: Record<string, string | undefined>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    required: Record<string, boolean>;
    ranges: Record<string, { type: string; format: string; min: FieldRange; max: FieldRange }>;
    patterns: Record<string, string | undefined>;
    descriptions: Record<string, string | undefined>;
  },
  errorMessageSeparator: string = '|'
): GetByGroup<T> => {
  type Bundle<G extends GroupNames<GroupSchemaShape<T>>> = Group<T, G>;
  type State = FormMutableState<z.infer<T>>;

  return <G extends GroupNames<GroupSchemaShape<T>>>(name: G): Bundle<G> => {
    type K = KeysInGroup<GroupSchemaShape<T>, G> & keyof z.infer<T>;

    const keys = new Set(groupFieldNames(groups, name));

    const data = pickByKeys(slices.data, keys, false);
    const errors = pickByKeys(slices.errors, keys, false);
    const touched = pickByKeys(slices.touched, keys, false);
    const dirty = pickByKeys(slices.dirty, keys, false);
    const required = pickByKeys(slices.required, keys, false);
    const ranges = pickByKeys(slices.ranges, keys, false) as Record<
      string,
      { type: string; format: string; min: FieldRange; max: FieldRange }
    >;
    const patterns = pickByKeys(slices.patterns, keys, false);
    const descriptions = pickByKeys(slices.descriptions, keys, false);

    const expressionData = data as z.infer<T>;

    return freezeObject({
      data: data as Pick<State['data'], K>,
      errors: {
        ...(errors as Pick<State['errors'], K & string>),
        ...errorGetters(errors, expressionData, errorMessageSeparator),
      },
      touched: {
        ...(touched as Pick<State['touched'], K>),
        ...touchedGetters(touched, expressionData),
      },
      dirty: {
        ...(dirty as Pick<State['dirty'], K>),
        ...dirtyGetters(dirty),
      },
      required: {
        ...(required as Pick<State['required'], K>),
        ...requiredGetters(required, expressionData),
      },
      ranges: {
        ...(ranges as Pick<State['ranges'], K>),
        ...rangeGetters(ranges, expressionData),
      },
      patterns: {
        ...(patterns as Pick<State['patterns'], K>),
        ...stringGetters(patterns, expressionData, false),
      },
      descriptions: {
        ...(descriptions as Pick<State['descriptions'], K & string>),
        ...stringGetters(descriptions, expressionData, true),
      },
      dirtyGroup: Object.values(dirty).some(Boolean),
      touchedGroup: Object.values(touched).some(Boolean),
      validGroup: truthyKeys(errors).length === 0,
    });
  };
};

// Returns a shallow copy of `data` containing only the group's root-level fields.
export const pickGroupData = <T extends object>(
  groups: Record<string, string>,
  name: string,
  data: T
): Partial<T> => {
  const result: Partial<T> = {};

  for (const field of groupFieldNames(groups, name)) {
    result[field as keyof T] = data[field as keyof T];
  }

  return result;
};

export const touchErroredFields = <T extends Record<string, unknown>, K extends keyof T>(
  touched: Record<K, boolean>,
  errors: Record<string, string | undefined>,
  data: T
): Record<K, boolean> => {
  const next = { ...touched } as Record<string, boolean>;

  for (const key of Object.keys(errors)) {
    const topSegment = key.split('.', 1)[0];

    if (!topSegment || !(topSegment in data)) {
      continue;
    }

    next[key] = true;
  }

  return next as Record<K, boolean>;
};

export const mergeAsyncErrors = <T extends Record<string, string | undefined>>(
  prevAsyncErrors: T,
  freshErrors: Record<string, string | undefined>,
  activePaths: readonly string[]
): T => {
  const activePathSet = new Set<string>(activePaths);
  const result: Record<string, string | undefined> = {};

  for (const key in prevAsyncErrors) {
    if (
      Object.prototype.hasOwnProperty.call(prevAsyncErrors, key) &&
      !activePathSet.has(key) &&
      prevAsyncErrors[key]
    ) {
      result[key] = prevAsyncErrors[key];
    }
  }

  for (const key of activePathSet) {
    const error = freshErrors[key];

    if (error) {
      result[key] = error;
    }
  }

  return result as T;
};

export const composeErrors = <T extends Record<string, string | undefined>>(
  parseErrors: T,
  asyncErrors: T,
  manualErrors: Record<string, string>
): T => ({ ...parseErrors, ...asyncErrors, ...manualErrors });

export const pruneAsyncErrors = <T extends Record<string, string | undefined>>(
  prevAsyncErrors: T,
  isStale: (key: string) => boolean
): T => {
  let next: Record<string, string | undefined> | null = null;

  for (const key in prevAsyncErrors) {
    if (Object.prototype.hasOwnProperty.call(prevAsyncErrors, key) && isStale(key)) {
      if (next === null) {
        next = { ...prevAsyncErrors };
      }
      delete next[key];
    }
  }

  return (next ?? prevAsyncErrors) as T;
};

export const difference = <T extends object>(obj1: T, obj2: Record<string, unknown>) => {
  const result: Partial<T> = {};

  for (const key in obj1) {
    if (
      Object.prototype.hasOwnProperty.call(obj1, key) &&
      (!(key in obj2) || obj1[key] !== obj2[key])
    ) {
      result[key] = obj1[key];
    }
  }

  return result as T;
};

export function mutateArrayState<T extends z.ZodMiniObject>(
  schema: T,
  data: z.infer<T>,
  nameOrPath: FormPath<T>,
  mutator: (draft: unknown[]) => void
): { name: keyof z.infer<T> | FormStatePath<z.infer<T>>; value: unknown[] } {
  const name = typeof nameOrPath === 'function' ? getPath(data, nameOrPath) : nameOrPath;
  const pathState = getState(schema, data, nameOrPath);

  if (!Array.isArray(pathState)) {
    throw new TypeError('The "nameOrPath" argument does not refer to an array type.');
  }

  const value = updateState(pathState as ImmutableArray<unknown>, mutator);

  return { name, value };
}

export function safeSyncParse<T extends z.ZodMiniType>(
  schema: T,
  data: unknown
): { result: ReturnType<T['safeParse']> | null; asyncPending: boolean } {
  if (!hasChangePhaseAsyncChecks(schema)) {
    return {
      result: schema.safeParse(data) as ReturnType<T['safeParse']>,
      asyncPending: false,
    };
  }

  return { result: null, asyncPending: true };
}

// Public functions

/**
 * Creates a unique symbol instance based on UUID v4.
 *
 * @returns The symbol.
 */
export function createSymbol() {
  return Symbol.for(generateUniqueId());
}

/**
 * Gets strongly typed child data or field value based on the provided name or path
 * in a disconnected form state data.
 *
 * @example
 * const note1Type = getState(formSchema, data, (path) => path.notes[0].type.name)
 *
 * @typeParam T - schema type.
 * @param schema - The form schema.
 * @param data - The strongly typed state data.
 * @returns The child data or the field value that is assigned to the provided name or path.
 */
export function getState<T extends z.ZodMiniObject, P extends FormPath<T>>(
  // @ts-expect-error: Used for type inference
  schema: T,
  data: z.infer<T>,
  nameOrPath: P
) {
  const path = typeof nameOrPath === 'function' ? getPath(data, nameOrPath) : nameOrPath;
  const pathNotation = Array.isArray(path) ? path.join('.') : String(path);

  return dotPathGet(data, pathNotation) as FormPathValueOrUnknown<T, P>;
}

/**
 * Parses an arbitrary object into the form state, returning `data` as a `SchemaDataObject`
 * on success — internal-only fields (like `z.symbol()`) and empty form values stripped,
 * ready for API use.
 *
 * @example
 * const { success, data } = parseState(schema, obj, true)
 *
 * @param schema - The form schema.
 * @param obj - Data object to parse.
 * @param asSchemaData - Must be `true`.
 * @param errorMessageSeparator - Sets the default error message separator when multiple errors occur
 *                                for the same state property (default: "|").
 * @returns `ParseAsObjectResult` with `data` as `SchemaDataObject` and `errors` on failure.
 */
export function parseState<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData: true,
  errorMessageSeparator?: string
): ParseAsObjectResult<T>;

/**
 * Parses an arbitrary object into the form state.
 *
 * @example
 * const { success, data, errors } = parseState(schema, obj)
 *
 * @param schema - The form schema.
 * @param obj - Data object to parse.
 * @param asSchemaData - Must be `false` or omitted (default: `false`).
 * @param errorMessageSeparator - Sets the default error message separator when multiple errors occur
 *                                for the same state property (default: "|").
 * @returns `ParseResult` with form state `data` and `errors` on failure.
 */
export function parseState<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData?: false,
  errorMessageSeparator?: string
): ParseResult<T>;

export function parseState<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData: boolean = false,
  errorMessageSeparator: string = '|'
): ParseResult<T> | ParseAsObjectResult<T> {
  if (isNullish(obj)) {
    throw new TypeError('The "data" argument cannot be null or undefined.');
  }

  const parsedData = createState(schema, obj as DeepPartial<z.infer<T>>);
  const result = schema.safeParse(parsedData);

  return buildParseResult(schema, parsedData, result.error, asSchemaData, errorMessageSeparator);
}

/**
 * Parses an arbitrary object into the form state, returning `data` as a `SchemaDataObject`
 * on success — internal-only fields (like `z.symbol()`) and empty form values stripped,
 * ready for API use. Use this variant when the schema contains async checks
 * (e.g. `z.validateAsync`).
 *
 * @example
 * const { success, data } = await parseStateAsync(schema, obj, true)
 *
 * @param schema - The form schema.
 * @param obj - Data object to parse.
 * @param asSchemaData - Must be `true`.
 * @param errorMessageSeparator - Sets the default error message separator when multiple errors occur
 *                                for the same state property (default: "|").
 * @returns A promise resolving to `ParseAsObjectResult` with `data` as `SchemaDataObject` and `errors` on failure.
 */
export function parseStateAsync<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData: true,
  errorMessageSeparator?: string
): Promise<ParseAsObjectResult<T>>;

/**
 * Parses an arbitrary object into the form state. Use this variant when the schema
 * contains async checks (e.g. `z.validateAsync`).
 *
 * @example
 * const { success, data, errors } = await parseStateAsync(schema, obj)
 *
 * @param schema - The form schema.
 * @param obj - Data object to parse.
 * @param asSchemaData - Must be `false` or omitted (default: `false`).
 * @param errorMessageSeparator - Sets the default error message separator when multiple errors occur
 *                                for the same state property (default: "|").
 * @returns A promise resolving to `ParseResult` with form state `data` and `errors` on failure.
 */
export function parseStateAsync<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData?: false,
  errorMessageSeparator?: string
): Promise<ParseResult<T>>;

export async function parseStateAsync<T extends z.ZodMiniObject>(
  schema: T,
  obj: object,
  asSchemaData: boolean = false,
  errorMessageSeparator: string = '|'
): Promise<ParseResult<T> | ParseAsObjectResult<T>> {
  if (isNullish(obj)) {
    throw new TypeError('The "data" argument cannot be null or undefined.');
  }

  const parsedData = createState(schema, obj as DeepPartial<z.infer<T>>);
  const result = await schema.safeParseAsync(parsedData);

  return buildParseResult(schema, parsedData, result.error, asSchemaData, errorMessageSeparator);
}

/**
 * Creates strongly typed initial state for a schema.
 *
 * @example
 * const data = createState(schema)
 * const data = createState(schema, { name: 'John', info: { age: 24 } })
 *
 * @typeParam T - schema type.
 * @param schema - The form schema.
 * @param data - Optional partial data to merge into the initial state.
 * @returns A new instance of the initial state.
 */
export function createState<T extends z.ZodMiniObject>(
  schema: T,
  data?: DeepPartial<z.infer<T>> | null
): z.infer<T> {
  type State = z.infer<T>;

  const shape = schema.shape as Record<keyof State, z.ZodMiniType>;
  const result = {} as State;

  for (const key in shape) {
    if (Object.prototype.hasOwnProperty.call(shape, key)) {
      const value = shape[key];
      const baseType = getBaseType(value);

      if (value instanceof z.ZodMiniCatch) {
        result[key] = value.def.catchValue({
          value: undefined,
          issues: [],
          error: { issues: [] },
          input: undefined,
        }) as State[typeof key];
      } else if (value instanceof z.ZodMiniDefault) {
        result[key] = value.def.defaultValue as State[typeof key];
      } else if (value instanceof z.ZodMiniObject) {
        result[key] = createState(value) as State[typeof key];
      } else if (
        baseType instanceof z.ZodMiniString ||
        (value instanceof z.ZodMiniUnion &&
          value.def.options.some((opt) => opt instanceof z.ZodMiniString))
      ) {
        result[key] = '' as State[typeof key];
      } else if (baseType instanceof z.ZodMiniArray) {
        if (!(value instanceof z.ZodMiniOptional) || value.def.innerType !== baseType) {
          result[key] = [] as State[typeof key];
        }
      } else if (baseType instanceof z.ZodMiniSymbol) {
        result[key] = createSymbol() as State[typeof key];
      } else if (
        (baseType instanceof z.ZodMiniBoolean && z.globalRegistry.get(baseType)?.['required']) ||
        value instanceof z.ZodMiniBoolean
      ) {
        result[key] = false as State[typeof key];
      } else {
        result[key] = '' as State[typeof key];
      }
    }
  }

  if (isNullish(data)) {
    return result;
  }

  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      const incomingValue = (data as State)[key];

      if (isNullish(incomingValue) || incomingValue === '' || typeof incomingValue === 'symbol') {
        continue;
      }

      const baseSchema = getBaseType(shape[key]);

      if (baseSchema instanceof z.ZodMiniObject) {
        result[key] = createState(
          baseSchema,
          incomingValue as DeepPartial<z.infer<typeof baseSchema>>
        ) as State[typeof key];
      } else if (baseSchema instanceof z.ZodMiniArray) {
        if (!Array.isArray(incomingValue)) {
          continue;
        }

        const elementSchema = baseSchema.def.element;

        result[key] = (
          elementSchema instanceof z.ZodMiniObject
            ? incomingValue.map((item) =>
                createState(elementSchema, item as DeepPartial<z.infer<typeof elementSchema>>)
              )
            : [...incomingValue]
        ) as State[typeof key];
      } else {
        result[key] = incomingValue;
      }
    }
  }

  return result;
}

/**
 * Updates an immutable array state in a nested schema.
 *
 * @example
 * const updatedData = updateState(data, (draft) => {
 *     draft.name = 'Mike';
 *     draft.info.age = 28;
 * });
 * const updatedTags = updateState(data.tags, (draft) => {
 *     draft.push('Important');
 * });
 *
 * @typeParam T - schema type.
 * @param state - The state array property.
 * @param updater - The updater function.
 * @returns A new array containing the modified state.
 */
export function updateState<T>(
  state: ImmutableArray<T> | undefined,
  updater: (draft: T[]) => void
): T[];

/**
 * Updates an immutable object state in a nested schema.
 *
 * The syntax uses Immer library conventions.
 *
 * @example
 * const updatedData = updateState(data, (draft) => {
 *     draft.name = 'Mike';
 *     draft.info.age = 28;
 * });
 * const updatedTags = updateState(data.tags, (draft) => {
 *     draft.push('Important');
 * });
 *
 * @typeParam T - schema type.
 * @param state - The state object property.
 * @param updater - The updater function.
 * @returns A new object containing the modified state.
 */
export function updateState<T>(
  state: ImmutableObject<T> | undefined,
  updater: (draft: T) => void
): T;

export function updateState<T>(
  state: ImmutableArray<T> | ImmutableObject<T> | undefined,
  updater: (draft: T[] | T) => void
) {
  if (Array.isArray(state)) {
    const draft = [...(state as T[])];
    updater(draft);

    return draft;
  } else if (typeof state === 'object' && !isNullish(state)) {
    const draft = Object.assign({}, state) as T;
    updater(draft);

    return draft;
  }

  throw new TypeError('No valid state was provided.');
}
