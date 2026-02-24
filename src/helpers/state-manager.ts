import * as z from 'zod/v4';
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
} from '../form-types';

import { dotPathGet } from './dot-path';
import { generateUniqueId } from './random-id-generator';
import { getBaseType, getPath, getPathNotation, getSchemaType } from './schema-visitor';

// Private methods

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

// Internal methods

export const cleanEmpty = <T>(
  schema: z.ZodType,
  obj?: T | null,
  field: string = '',
  parentKey: string = ''
): DeepPartial<T> => {
  const path = parentKey ? `${parentKey}.${field}` : field;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanEmpty(schema, item, '0', path) as unknown) as DeepPartial<T>;
  }

  if (isNotRecordObject(obj)) {
    return obj as DeepPartial<T>;
  }

  const innerObj: UnknownObject = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as UnknownObject)[key];

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

export const getFieldError = <T extends z.ZodObject>(
  errors: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => errors[path.join('.') as keyof z.infer<T>];

export const wasFieldTouched = <T extends z.ZodObject>(
  touched: Record<keyof z.infer<T>, boolean>,
  path: FormStatePath<z.infer<T>>
) => Boolean(touched[path.join('.') as keyof z.infer<T>]);

export const getFieldMaxLength = <T extends z.ZodObject>(
  maxLengths: Record<keyof z.infer<T>, number | undefined>,
  path: FormStatePath<z.infer<T>>
) => maxLengths[getPathNotation(path) as keyof z.infer<T>];

export const getFieldRange = <T extends z.ZodObject>(
  ranges: Record<keyof z.infer<T>, { min: FieldRange; max: FieldRange; format: string }>,
  path: FormStatePath<z.infer<T>>
) => ranges[getPathNotation(path) as keyof z.infer<T>];

export const getFieldPattern = <T extends z.ZodObject>(
  patterns: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => patterns[getPathNotation(path) as keyof z.infer<T>] ?? '';

export const getFieldDescription = <T extends z.ZodObject>(
  descriptions: Record<keyof z.infer<T>, string | undefined>,
  path: FormStatePath<z.infer<T>>
) => descriptions[getPathNotation(path) as keyof z.infer<T>] ?? '';

export const diffedState = <T extends z.ZodObject>(
  newState: FormMutableState<z.infer<T>>,
  prevState: FormMutableState<z.infer<T>>
) => {
  if (deepEqual(newState, prevState)) {
    return prevState;
  }

  return newState;
};

export const freezeObject = (obj: object) => {
  const isDevelopment =
    typeof process === 'object' &&
    process.env &&
    process.env['NODE_ENV']?.toLowerCase() === 'development';

  return isDevelopment ? Object.freeze(obj) : obj;
};

// Public methods

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
 * method to initialize an object schema recursively.
 *
 * @typeParam T schema type.
 * @param schema - The form schema.
 * @returns A new instance of the initial state.
 */
export function createState<T extends z.ZodObject>(schema: T): z.infer<T> {
  type State = z.infer<T>;

  const shape = schema.shape as Record<keyof State, z.ZodType>;
  const result = {} as State;

  for (const key in shape) {
    if (Object.prototype.hasOwnProperty.call(shape, key)) {
      const typedKey = key as keyof State;
      const value = shape[typedKey];
      const baseType = getBaseType(value);

      if (value instanceof z.ZodCatch) {
        result[typedKey] = value.catch.bind(value) as State[typeof typedKey];
      } else if (value instanceof z.ZodDefault) {
        result[typedKey] = value.def.defaultValue as State[typeof typedKey];
      } else if (value instanceof z.ZodObject) {
        result[typedKey] = createState(value) as State[typeof typedKey];
      } else if (
        baseType instanceof z.ZodString ||
        (value instanceof z.ZodUnion && value.options.some((opt) => opt instanceof z.ZodString))
      ) {
        result[typedKey] = '' as State[typeof typedKey];
      } else if (baseType instanceof z.ZodArray) {
        result[typedKey] = [] as State[typeof typedKey];
      } else if (baseType instanceof z.ZodSymbol) {
        result[typedKey] = createSymbol() as State[typeof typedKey];
      } else if (
        value instanceof z.ZodBoolean ||
        (value instanceof z.ZodNonOptional && baseType instanceof z.ZodBoolean)
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
 * @typeParam T schema type.
 * @param schema - The form schema.
 * @param data - The data instance that needs to be enriched to meet the schema requirements.
 * @returns A new instance of the initial state that meets the schema requirements.
 */
export function createInitialState<T extends z.ZodObject>(
  schema: T,
  data: DeepPartial<z.infer<T>> | null | undefined
) {
  const defaultState = createState(schema);

  if (!isNullish(data)) {
    const result = defaultState as Record<string | number | symbol, unknown>;

    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        const shape = schema.shape as Record<keyof z.infer<T>, z.ZodType>;
        const fieldSchema = shape[key];

        const baseSchema = getBaseType(fieldSchema);

        const incomingValue = data[key as keyof typeof data];

        if (isNullish(incomingValue) || incomingValue === '' || typeof incomingValue === 'symbol') {
          continue;
        }

        if (baseSchema instanceof z.ZodObject) {
          result[key] = createInitialState(
            baseSchema,
            incomingValue as DeepPartial<z.infer<typeof baseSchema>>
          );
        } else if (baseSchema instanceof z.ZodArray) {
          // Defensive check for a null/undefined array that is unlikely to happen due to `createState(schema)`.
          /* v8 ignore if -- @preserve */
          if (!Array.isArray(incomingValue)) {
            continue;
          }

          const elementSchema = baseSchema.element;

          result[key] =
            elementSchema instanceof z.ZodObject
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
 * @typeParam T schema type.
 * @param schema - The form schema.
 * @param data - The strongly typed state data.
 * @returns The child data or the field value that is assigned to the provided name or path.
 */
export function getState<T extends z.ZodObject, P extends FormPath<T>>(
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
 * @typeParam T schema type.
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
 * @typeParam T schema type.
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
 * @typeParam T schema type.
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
