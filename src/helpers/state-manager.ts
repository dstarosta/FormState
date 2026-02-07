import * as z from 'zod/v4';
import { deepEqual } from 'fast-equals';

import type {
  DeepPartial,
  FormMutableState,
  ImmutableArray,
  ImmutableObject,
  UnknownObject,
} from '../form-types';

import { getBaseType, getSchemaType } from './schema-visitor';
import { generateUniqueId } from './random-id-generator';

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

export const diffedState = <T extends z.ZodObject>(
  newState: FormMutableState<z.infer<T>>,
  prevState: FormMutableState<z.infer<T>>
) => {
  if (deepEqual(newState, prevState)) {
    return prevState;
  }

  return newState;
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
 * Creates strongly typed initial state in a nested schema.
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
