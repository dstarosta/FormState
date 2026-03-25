import * as z from 'zod/mini';
import { deepEqual } from 'fast-equals';

import type {
  DeepPartial,
  FieldRange,
  FormMutableState,
  FormPath,
  FormPathValueOrUnknown,
  FormStatePath,
  ImmutableArray,
  ImmutableObject,
  UnknownObject,
} from '../types/form-types';

import { dotPathGet } from './dot-path';
import { generateUniqueId } from './random-id-generator';
import {
  allowEmptyString,
  getBaseType,
  getPath,
  getPathNotation,
  getSchemaType,
} from './schema-visitor';
import { IS_DEVELOPMENT } from './development-helper';

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

// Internal functions

export const cleanEmpty = <T>(
  schema: z.ZodMiniType,
  obj?: T | T[] | null,
  field: string = '',
  parentKey: string = ''
): DeepPartial<T> | DeepPartial<T>[] => {
  const path = parentKey ? `${parentKey}.${field}` : field;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanEmpty(schema, item, '0', path)) as DeepPartial<T>[];
  }

  if (isNotRecordObject(obj)) {
    return obj as DeepPartial<T>;
  }

  const innerObj: UnknownObject = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as UnknownObject)[key];

      if (typeof value === 'function') {
        continue;
      }

      if (isNotRecordObject(value) && typeof value !== 'symbol' && typeof value !== 'string') {
        if (value !== undefined) {
          innerObj[key] = value;
        }

        continue;
      }

      const cleanedValue = cleanEmpty(schema, value, key, path);

      if (
        isRecordObject(cleanedValue) &&
        Object.keys(cleanedValue).filter(
          (innerKey) => typeof (cleanedValue as UnknownObject)[innerKey] !== 'symbol'
        ).length === 0
      ) {
        continue;
      }

      const valuePath = path ? `${path}.${key}` : key;

      const isEmptyString = typeof cleanedValue === 'string' && cleanedValue === '';
      const hasEmptyStringSchema =
        getSchemaType(schema, valuePath) === 'string' && allowEmptyString(schema, valuePath);

      if (typeof cleanedValue !== 'symbol' && (!isEmptyString || hasEmptyStringSchema)) {
        innerObj[key] = cleanedValue;
      }
    }
  }

  return innerObj as DeepPartial<T>;
};

export const getFieldError = <T extends z.ZodMiniObject>(
  errors: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => errors[path.join('.')];

export const wasFieldTouched = <T extends z.ZodMiniObject>(
  touched: Record<keyof z.infer<T>, boolean>,
  path: FormStatePath<z.infer<T>>
) => Boolean(touched[path.join('.')]);

export const getFieldMaxLength = <T extends z.ZodMiniObject>(
  maxLengths: Record<keyof z.infer<T>, number | undefined>,
  path: FormStatePath<z.infer<T>>
) => maxLengths[getPathNotation(path)];

export const getFieldRange = <T extends z.ZodMiniObject>(
  ranges: Record<keyof z.infer<T>, { min: FieldRange; max: FieldRange; format: string }>,
  path: FormStatePath<z.infer<T>>
) => ranges[getPathNotation(path)];

export const getFieldPattern = <T extends z.ZodMiniObject>(
  patterns: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => patterns[getPathNotation(path)] ?? '';

export const getFieldDescription = <T extends z.ZodMiniObject>(
  descriptions: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => descriptions[getPathNotation(path)] ?? '';

export const diffedState = <T extends z.ZodMiniObject>(
  state: FormMutableState<z.infer<T>>,
  prevState: FormMutableState<z.infer<T>>
) => {
  if (deepEqual(state, prevState)) {
    return prevState;
  }

  return state;
};

export const freezeObject = (obj: object) => {
  return IS_DEVELOPMENT ? Object.freeze(obj) : obj;
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
 * Creates strongly typed initial state for a schema.
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
        } as z.core.$ZodCatchCtx) as State[typeof key];
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
        result[key] = [] as State[typeof key];
      } else if (baseType instanceof z.ZodMiniSymbol) {
        result[key] = createSymbol() as State[typeof key];
      } else if (
        value instanceof z.ZodMiniBoolean ||
        (value instanceof z.ZodMiniNonOptional && baseType instanceof z.ZodMiniBoolean)
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
        // Defensive check for a null/undefined array that is unlikely to happen due to `createState(schema)`.
        /* v8 ignore if -- @preserve */
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
 * Gets strongly typed child data or field value based on the provided name or path.
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
 * Updates an immutable array state in a nested schema.
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
 * Updates an object state in a nested schema.
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

/**
 * Updates an immutable array or object state in a nested schema.
 *
 * @typeParam T - schema type.
 * @param state - The state array or object property.
 * @param updater - The updater function.
 * @returns A new immutable array or object containing the modified state.
 */
export function updateState<T>(
  state: ImmutableArray<T> | ImmutableObject<T> | undefined,
  updater: (draft: T[] | T) => void
) {
  if (Array.isArray(state)) {
    const draft = [...(state as T[])];
    updater(draft);

    return draft;
  } else if (typeof state === 'object' && !isNullish(state)) {
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    const draft = { ...state } as T;
    updater(draft);

    return draft;
  }

  throw new TypeError('No valid state was provided.');
}
