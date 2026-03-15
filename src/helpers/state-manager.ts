import * as z from 'zod/mini';
import { deepEqual } from 'fast-equals';

import type {
  DeepPartial,
  FieldRange,
  FormMutableState,
  FormPath,
  FormPathValue,
  FormStatePath,
  ImmutableArray,
  ImmutableObject,
  UnknownObject,
} from '../types/form-types';

import { dotPathGet } from './dot-path';
import { generateUniqueId } from './random-id-generator';
import { getBaseType, getPath, getPathNotation, getSchemaType } from './schema-visitor';
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
      const hasStringSchema = getSchemaType(schema, valuePath) === 'string';

      if (typeof cleanedValue !== 'symbol' && (!isEmptyString || hasStringSchema)) {
        innerObj[key] = cleanedValue;
      }
    }
  }

  return innerObj as DeepPartial<T>;
};

export const getFieldError = <T extends z.ZodMiniObject>(
  errors: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => errors[path.join('.') as keyof z.infer<T>];

export const wasFieldTouched = <T extends z.ZodMiniObject>(
  touched: Record<keyof z.infer<T>, boolean>,
  path: FormStatePath<z.infer<T>>
) => Boolean(touched[path.join('.') as keyof z.infer<T>]);

export const getFieldMaxLength = <T extends z.ZodMiniObject>(
  maxLengths: Record<keyof z.infer<T>, number | undefined>,
  path: FormStatePath<z.infer<T>>
) => maxLengths[getPathNotation(path) as keyof z.infer<T>];

export const getFieldRange = <T extends z.ZodMiniObject>(
  ranges: Record<keyof z.infer<T>, { min: FieldRange; max: FieldRange; format: string }>,
  path: FormStatePath<z.infer<T>>
) => ranges[getPathNotation(path) as keyof z.infer<T>];

export const getFieldPattern = <T extends z.ZodMiniObject>(
  patterns: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => patterns[getPathNotation(path) as keyof z.infer<T>] ?? '';

export const getFieldDescription = <T extends z.ZodMiniObject>(
  descriptions: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => descriptions[getPathNotation(path) as keyof z.infer<T>] ?? '';

export const diffedState = <T extends z.ZodMiniObject>(
  newState: FormMutableState<z.infer<T>>,
  prevState: FormMutableState<z.infer<T>>
) => {
  if (deepEqual(newState, prevState)) {
    return prevState;
  }

  return newState;
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
      result[key as keyof T] = obj1[key];
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
 * This only populates properties one level deep. Use the `createInitialState`
 * function to initialize an object schema recursively.
 *
 * @typeParam T - schema type.
 * @param schema - The form schema.
 * @returns A new instance of the initial state.
 */
export function createState<T extends z.ZodMiniObject>(schema: T) {
  type State = z.infer<T>;

  const shape = schema.shape as Record<keyof State, z.ZodMiniType>;
  const result = {} as State;

  for (const key in shape) {
    if (Object.prototype.hasOwnProperty.call(shape, key)) {
      const typedKey = key as keyof State;
      const value = shape[typedKey];
      const baseType = getBaseType(value);

      if (value instanceof z.ZodMiniCatch) {
        result[typedKey] = value.def.catchValue({
          value: undefined,
          issues: [],
          error: { issues: [] },
          input: undefined,
        } as z.core.$ZodCatchCtx) as State[typeof typedKey];
      } else if (value instanceof z.ZodMiniDefault) {
        result[typedKey] = value.def.defaultValue as State[typeof typedKey];
      } else if (value instanceof z.ZodMiniObject) {
        result[typedKey] = createState(value) as State[typeof typedKey];
      } else if (
        baseType instanceof z.ZodMiniString ||
        (value instanceof z.ZodMiniUnion &&
          value.def.options.some((opt) => opt instanceof z.ZodMiniString))
      ) {
        result[typedKey] = '' as State[typeof typedKey];
      } else if (baseType instanceof z.ZodMiniArray) {
        result[typedKey] = [] as State[typeof typedKey];
      } else if (baseType instanceof z.ZodMiniSymbol) {
        result[typedKey] = createSymbol() as State[typeof typedKey];
      } else if (
        value instanceof z.ZodMiniBoolean ||
        (value instanceof z.ZodMiniNonOptional && baseType instanceof z.ZodMiniBoolean)
      ) {
        result[typedKey] = false as State[typeof typedKey];
      } else {
        result[typedKey] = '' as State[typeof typedKey];
      }
    }
  }

  return result;
}

/**
 * Creates strongly typed initial state based on the provided data.
 *
 * Properties that need to be populated cannot have null or undefined
 * values.
 *
 * @typeParam T - schema type.
 * @param schema - The form schema.
 * @param data - The data instance that needs to be enriched to meet the schema requirements.
 * @returns A new instance of the initial state that meets the schema requirements.
 */
export function createInitialState<T extends z.ZodMiniObject>(
  schema: T,
  data: DeepPartial<z.infer<T>> | null | undefined
) {
  const defaultState = createState(schema);

  if (!isNullish(data)) {
    const result = defaultState as Record<string | number | symbol, unknown>;

    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        const shape = schema.shape as Record<keyof z.infer<T>, z.ZodMiniType>;
        const fieldSchema = shape[key];

        const baseSchema = getBaseType(fieldSchema);

        const incomingValue = data[key as keyof typeof data];

        if (isNullish(incomingValue) || incomingValue === '' || typeof incomingValue === 'symbol') {
          continue;
        }

        if (baseSchema instanceof z.ZodMiniObject) {
          result[key] = createInitialState(
            baseSchema,
            incomingValue as DeepPartial<z.infer<typeof baseSchema>>
          );
        } else if (baseSchema instanceof z.ZodMiniArray) {
          // Defensive check for a null/undefined array that is unlikely to happen due to `createState(schema)`.
          /* v8 ignore if -- @preserve */
          if (!Array.isArray(incomingValue)) {
            continue;
          }

          const elementSchema = baseSchema.def.element;

          result[key] =
            elementSchema instanceof z.ZodMiniObject
              ? incomingValue.map((item) => {
                  return createInitialState(
                    elementSchema,
                    item as DeepPartial<z.infer<typeof elementSchema>>
                  );
                })
              : [...incomingValue];
        } else {
          result[key] = incomingValue;
        }
      }
    }
  }

  return defaultState;
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
  schema: T,
  data: z.infer<T>,
  nameOrPath: P
) {
  if (!schema) {
    return;
  }

  const path = typeof nameOrPath === 'function' ? getPath(data, nameOrPath) : nameOrPath;
  const pathNotation = Array.isArray(path) ? path.join('.') : String(path);

  return dotPathGet<FormPathValue<T, P>>(data, pathNotation);
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
    const draft = { ...state } as T;
    updater(draft);

    return draft;
  }

  throw new TypeError('No valid state was provided.');
}
