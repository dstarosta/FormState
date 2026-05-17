/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import type { SyntheticEvent } from 'react';
import type * as z from 'zod/mini';

// Extending ZodMiniObject type

declare module 'zod/mini' {
  interface ZodMiniObject {
    /**
     * Converts an inferred schema instance into an object without empty literal unions.
     *
     * @example
     * const { formState } = useFormState(schema);
     * const apiData = schema.toObject(formState.data);
     *
     * @param data - Inferred schema object.
     * @returns The data object without empty literal unions.
     */
    toObject<T extends this, U extends z.infer<T>>(
      data: U | DeepPartial<U> | FormState<U>['data']
    ): SchemaDataObject<z.infer<T>>;
  }
}

// Private types

type TypeIteration = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? PathValue<T[K], R>
      : never
    : never;

type IsUnion<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

type Flatten<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type ReplaceEmptyWithUndefined<T> = T extends '' ? undefined : T;

type DateToString<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? DateToString<Item>[]
    : T extends object
      ? { [K in keyof T]: DateToString<T[K]> }
      : T;

type NormalizePrimitives<T> = DateToString<ReplaceEmptyWithUndefined<T>>;

type RangeOf<T> =
  | undefined
  | Date
  | number
  | (IsUnion<T, Date | string> extends true ? Date | string : never)
  | (IsUnion<T, number | ''> extends true ? number | '' : never);

type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;

type SelectorResults<S, Selectors extends Selector<S, unknown>[]> = {
  [K in keyof Selectors]: Selectors[K] extends Selector<S, infer R> ? R : never;
};

type FormDataSelector<S> = {
  <I extends Selector<S, unknown>, R>(
    inputSelector: I,
    resultFn: (input: ReturnType<I>) => R
  ): Selector<S, R>;
  <I extends Selector<S, unknown>[], R>(
    inputSelectors: [...I],
    resultFn: (...inputs: SelectorResults<S, I>) => R
  ): Selector<S, R>;
};

// Internal types

export type ImmutablePrimitive =
  | undefined
  | null
  | boolean
  | string
  | number
  | symbol
  | Date
  | Error
  | Function
  | RegExp
  | Promise<unknown>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export type ArrayElement<A> = A extends readonly (infer U)[] ? U : never;

export type UnknownObject = Record<string | number | symbol, unknown>;

export type FieldRange = number | Date | undefined;

export type FormStatePath<T, D extends number = 10> = [D] extends [never]
  ? []
  : T extends object
    ? T extends readonly (infer E)[]
      ? [number] | [number, ...FormStatePath<E, TypeIteration[D]>]
      : {
          [K in keyof T]-?: [K] | [K, ...FormStatePath<T[K], TypeIteration[D]>];
        }[keyof T]
    : [];

export type FormAction<T extends object> =
  | {
      type: 'touch';
      name: keyof T | FormStatePath<T>;
      options: { validate: boolean };
    }
  | {
      type: 'change';
      name: keyof T | FormStatePath<T>;
      value: unknown;
      options: {
        touch: boolean;
        validate: boolean;
      };
    }
  | {
      type: 'replace';
      data: DeepPartial<T>;
      options: {
        validate: boolean;
      };
    }
  | {
      type: 'reset';
      options: { retainData: boolean; resetTouched: boolean };
    }
  | {
      type: 'resetFields';
      names: (keyof T)[];
      options: { retainData: boolean; resetTouched: boolean };
    }
  | {
      type: 'submit';
      submittedData: SubmittedData<T>;
      options: { resetDirty: boolean; resetTouched: boolean; updateInitialData: boolean };
    }
  | { type: 'changeInitialData' }
  | { type: 'setDirty'; name: string; dirty: boolean }
  | {
      type: 'setManualError';
      name: keyof T | FormStatePath<T>;
      error: string | null;
      options: { validate: boolean };
    }
  | {
      type: 'clearManualErrors';
      options: { predicate?: ((key: string) => boolean) | undefined; validate: boolean };
    }
  | { type: 'validate' }
  | { type: 'setMode'; mode: FormMode };

export type FormMutableState<T extends object> = {
  initialData: T;
  data: T;
  submittedData: SubmittedData<T>;
  initialErrors: Record<keyof T | '', string | undefined>;
  errors: Record<keyof T | '', string | undefined>;
  mode: FormMode;
  dirty: Record<keyof T, boolean>;
  touched: Record<keyof T, boolean>;
  required: Record<keyof T, boolean>;
  ranges: Record<keyof T, { type: string; format: string; min: FieldRange; max: FieldRange }>;
  patterns: Record<keyof T, string | undefined>;
  descriptions: Record<keyof T | '', string | undefined>;
  submitCount: number;
  changed: boolean;
  replaced: boolean;
  validated: boolean;
};

export type StateCallback<T extends object> = (state: FormState<T>, status: FormStatus) => void;

export type ManualErrorState = {
  get: () => Immutable<Record<string, string>>;
  set: (value?: Readonly<Record<string, string>>) => void;
  remove: (predicate: (key: string) => boolean) => void;
};

export type FormStore = {
  getValue: (name: string) => string | undefined;
  setValue: (name: string, value: string) => void;
  subscribeToField: (name: string, listener: () => void) => () => boolean | undefined;
};

export type FormTypeOptions =
  | { required: boolean; error?: string }
  | { required?: boolean; error: string };

export type FormDateOptions =
  | { required: boolean; dateFormat?: FormDateFormat; error?: string; dateFormatError?: string }
  | { required?: boolean; dateFormat: FormDateFormat; error?: string; dateFormatError?: string }
  | { required?: boolean; dateFormat?: FormDateFormat; error: string; dateFormatError?: string }
  | { required?: boolean; dateFormat?: FormDateFormat; error?: string; dateFormatError: string };

export type FormStringOptions =
  | {
      required: boolean;
      allowEmpty?: boolean;
      error?: string;
      normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
    }
  | {
      required?: boolean;
      allowEmpty: boolean;
      error?: string;
      normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
    }
  | {
      required?: boolean;
      allowEmpty?: boolean;
      error: string;
      normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
    }
  | {
      required?: boolean;
      allowEmpty?: boolean;
      error?: string;
      normalize: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
    };

export type FormPathValueOrUnknown<T extends z.ZodMiniObject, P> =
  P extends FormPath<T> ? FormPathValue<T, P> : unknown;

export type Selector<S, R> = (state: S) => R;

// Public types

/**
 * Immutable type.
 */
export type Immutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
    ? ImmutableArray<U>
    : T extends Map<infer K, infer V>
      ? ImmutableMap<K, V>
      : T extends Set<infer M>
        ? ImmutableSet<M>
        : T extends object
          ? ImmutableObject<T>
          : T;

/**
 * Recursive `Partial<T>` like type.
 */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/**
 * Zod validation error.
 */
export type ZodValidationError = z.core.$ZodRawIssue & {
  /**
   * A standardized error message.
   */
  message: string;
  /**
   * Zod path as a `string`.
   */
  pathNotation: string;
};

/**
 * Form event type for change listener callback functions.
 */
export type FormEventType = 'change' | 'submit';

/**
 * Submitted form data.
 *
 * @typeParam T - type of the form data.
 */
export type SubmittedData<T extends object> = {
  /**
   * The form data.
   */
  data: FormState<T>['data'];
  /**
   * The form data in the `FormData` format.
   *
   * The form must be submitted with the `handleSubmit` function for this value to get
   * populated.
   */
  formData: FormData | null;
} | null;

export type StateChangeEvent<T extends object> = {
  /**
   * Event type ('change' or 'submit').
   */
  type: FormEventType;
  /**
   * Form state data.
   */
  data: FormState<T>['data'];
  /**
   * Optional form data in the `FormData` format.
   *
   * Note: form data is only available in `submit` events.
   */
  formData?: FormData | undefined;
  /**
   * A number indicating how many times the form has been submitted.
   */
  submitCount: number;
  /**
   * Form errors.
   */
  errors: FormState<T>['errors'];
  /**
   * `false` if the form has any errors; otherwise, `true`.
   */
  valid: boolean;
};

/**
 * Form change event listener type.
 *
 * @typeParam T - type of the form data.
 */
export type StateChangeListener<T extends object> = (event: StateChangeEvent<T>) => void;

/**
 * Form initialization options.
 *
 * @typeParam T - type of the form data.
 */
export type FormInitOptions<T extends z.ZodMiniObject> = {
  /**
   * An optional object with schema properties to set the initial data of the form.
   *
   * This object can be used for asynchronous form initialization, otherwise, specify
   * the default data in the schema.
   *
   * Non-dirty form state values reflect reactive changes to the initial state.
   */
  initialData?: DeepPartial<z.infer<T>> | undefined;
  /**
   * An optional array of root level field names or state path expressions that
   * will be marked as touched when the form is initialized.
   */
  initialTouched?: FormPath<T>[];
  /**
   * The initial form mode (default: "editable").
   */
  initialMode?: FormMode | undefined;
  /**
   * Reset the "touch" field status after the form has been reset  (default: `false`).
   *
   * Note: This option is only applicable to a `Form` component without a provided
   * `onReset` handler.
   */
  resetTouchedOnFormReset?: boolean;
  /**
   * Validate the schema before submission on "change", "touch", "replace" or "setError"/
   * "clearManualErrors" form actions (default: `true`);
   *
   * Note: This option is only in affect while the "validated" form status has not been
   * set by the "validateOnMount" option or the "validate" form action.
   */
  validateBeforeSubmit?: boolean;
  /**
   * Validate the schema after the form mounts with the initial values (default: `false`).
   */
  validateOnMount?: boolean;
  /**
   * Validate the schema, by default, after a `change` action (default: `true`).
   */
  validateOnChange?: boolean;
  /**
   * Validate the schema, by default, after a `touch` action  (default: `true`).
   */
  validateOnTouch?: boolean;
  /**
   * Sets the capacity of the debounce callback cache used by the "change"
   * function. (default: 50).
   * A non-positive value means no debouncing of change callbacks is allowed.
   * A smaller value saves memory but can cause issues with debounced change
   * callbacks.
   */
  debounceCacheCapacity?: number;
  /**
   * Sets a value indicating whether the `useWatch` hook should be enabled
   * (default: `false`).
   *
   * This functionality is only necessary for special use-cases. It requires
   * additional memory and has a minor overhead.
   */
  watch?: boolean;
  /**
   * Sets the default format for the `inferName` function (default: "bracket").
   */
  inferredNameFormat?: 'bracket' | 'dot';
  /**
   * Sets the default error message separator when multiple errors occur for the
   * same state property (default: "|").
   */
  errorMessageSeparator?: string;
  /**
   * Confirm browser navigation when the form status is dirty (default: `false`).
   */
  confirmDirtyStateNavigation?: boolean;
  /**
   * Form-level defaults for the `formClasses` function.
   *
   * See: {@link FormClassOptions}
   */
  cssOptions?: FormClassOptions | undefined;
};

export type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};

/**
 * Type of schema data with stripped empty literals from union types.
 */
export type SchemaDataObject<T> = T extends ImmutablePrimitive
  ? NormalizePrimitives<T>
  : T extends unknown[]
    ? T extends (infer Item)[]
      ? SchemaDataObject<NormalizePrimitives<Item>>[]
      : T
    : Flatten<
        {
          [K in keyof T as T[K] extends object
            ? K
            : ReplaceEmptyWithUndefined<T[K]> extends never
              ? never
              : undefined extends NormalizePrimitives<T[K]>
                ? never
                : K]: T[K] extends object ? SchemaDataObject<T[K]> : NormalizePrimitives<T[K]>;
        } & {
          [K in keyof T as T[K] extends object
            ? never
            : NormalizePrimitives<T[K]> extends never
              ? never
              : undefined extends NormalizePrimitives<T[K]>
                ? K
                : never]?: NormalizePrimitives<T[K]>;
        }
      >;

/**
 * Form state on submission.
 *
 * @typeParam T - type of the form data.
 */
export type SubmitState<T extends object> =
  | {
      /**
       * Indicates whether the state is valid.
       */
      valid: true;
      /**
       * Form state data that includes form union types.
       */
      data: T;
    }
  | {
      /**
       * Indicates whether the state is valid.
       */
      valid: false;
      /**
       * The errors for each field in the form. This value is `undefined` when the form state has
       * no errors.
       */
      errors: FormState<T>['errors'];
    };

/**
 * Form state type made immutable and extended with the `get(expression)` functions.
 *
 * @typeParam T - type of the form data.
 */
export type FormState<T extends object> = {
  /**
   * Form state data.
   */
  data: Immutable<FormMutableState<T>['data']>;
  /**
   * Errors for each field in the form.
   */
  errors: Immutable<
    FormMutableState<T>['errors'] & {
      /**
       * Gets an error message for a nested field.
       *
       * @example
       * formState.errors.get((path) => path.company.name)
       *
       * @param path - Form state path expression.
       * @returns Error message for the specified field, or `undefined` if there is no error.
       */
      get: (expression: (data: T) => unknown) => string | undefined;
      /**
       * Gets a manual error message with an arbitrary `string` key.
       *
       * @param key - Manual error key.
       * @returns Error message for the specified key, or `undefined` if there is no error.
       */
      getManual: (key: string) => string | undefined;
      /**
       * Gets an array of all error messages.
       */
      getAll: () => string[];
      /**
       * Gets an array of all error keys.
       *
       * @returns An array of error keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<
    FormMutableState<T>['dirty'] & {
      /**
       * Gets the dirty state for an arbitrary `string` key.
       *
       * @example
       * formState.dirty.get("#myError")
       *
       * @param key - A `string` key. The key must start with the `#` character
       *              to avoid key collisions.
       * @returns `true` if the key exists and is dirty, `false` otherwise.
       */
      get: (key: `#${string}`) => boolean;
      /**
       * Gets an array of all dirty keys.
       *
       * @returns An array of dirty keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Touched status for each field in the form.
   */
  touched: Immutable<
    FormMutableState<T>['touched'] & {
      /**
       * Gets the touched state for a nested field.
       *
       * @example
       * formState.touched.get((path) => path.info.age)
       *
       * @param path - Form state path expression.
       * @returns `true` if the field exists and has been touched, `false` otherwise.
       */
      get: (expression: (data: T) => unknown) => boolean;
      /**
       * Gets an array of all touched keys.
       *
       * @returns An array of touched keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Required status for each field in the form.
   */
  required: Immutable<
    FormMutableState<T>['required'] & {
      /**
       * Gets the required state for a nested field.
       *
       * @example
       * formState.required.get((path) => path.info.age)
       *
       * @param path - Form state path expression.
       * @returns `true` if the field is required in the form, `false` otherwise.
       */
      get: (expression: (data: T) => unknown) => boolean;
      /**
       * Gets an array of all required keys.
       *
       * @returns An array of required keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Optional min/max ranges for numeric and date fields in the form.
   */
  ranges: Immutable<
    FormMutableState<T>['ranges'] & {
      get: {
        /**
         * Gets the minimum and maximum values for a nested numeric or date field.
         *
         * @example
         * const { min, max } = formState.ranges.get((path) => path.info.birthDate) ?? {}
         *
         * @param path - Form state path expression.
         * @returns An object containing the `min` and the `max` properties that can be `number`, `Date` or `undefined`.
         */
        <R extends string>(
          expression: (data: T) => R | undefined
        ): RangeResult<R extends string ? number | undefined : never>;
        /**
         * Gets the minimum and maximum values for a nested numeric or date field.
         *
         * @example
         * const { min, max } = formState.ranges.get((path) => path.info.birthDate) ?? {}
         *
         * @param path - Form state path expression.
         * @returns An object containing the `min` and the `max` properties that can be `number`, `Date` or `undefined`.
         */
        <R extends unknown[]>(
          expression: (data: T) => R | undefined
        ): RangeResult<R extends unknown[] ? number | undefined : never>;
        /**
         * Gets the minimum and maximum values for a nested numeric or date field.
         *
         * @example
         * const { min, max } = formState.ranges.get((path) => path.info.birthDate) ?? {}
         *
         * @param path - Form state path expression.
         * @returns An object containing the `min` and the `max` properties that can be `number`, `Date` or `undefined`.
         */
        <R extends RangeOf<R>>(expression: (data: T) => R): RangeResult<R>;
      };
      getMin: {
        /**
         * Gets the minimum range value or length from the corresponding range of a field.
         *
         * @param name - Field name.
         * @returns The minimum range value.
         * @throws `TypeError` when a range with the minimum value is not defined in the schema.
         */
        <
          K extends {
            [P in keyof T]: T[P] extends string | unknown[] | number | Date | undefined ? P : never;
          }[keyof T],
        >(
          name: K
        ): T[K] extends Date ? Date : number;
        /**
         * Gets the minimum range value from the corresponding range of a field.
         *
         * @param name - Field name.
         * @returns The minimum range value.
         * @throws `TypeError` when a range with the minimum value is not defined in the schema.
         */
        <R extends string | unknown[] | number | Date | undefined>(
          expression: (data: T) => R
        ): Date extends R ? Date : number;
      };
      getMax: {
        /**
         * Gets the maximum range value or length from the corresponding range of a field.
         *
         * @param name - Field name.
         * @returns The maximum range value.
         * @throws `TypeError` when a range with the maximum value is not defined in the schema.
         */
        <
          K extends {
            [P in keyof T]: T[P] extends string | unknown[] | number | Date | undefined ? P : never;
          }[keyof T],
        >(
          name: K
        ): T[K] extends Date ? Date : number;
        /**
         * Gets the maximum range value from the corresponding range of a field.
         *
         * @param name - Field name.
         * @returns The maximum range value.
         * @throws `TypeError` when a range with the maximum value is not defined in the schema.
         */
        <R extends string | unknown[] | number | Date | undefined>(
          expression: (data: T) => R
        ): Date extends R ? Date : number;
      };
      /**
       * Gets an array of all range keys.
       *
       * @returns An array of range keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Optional regular expression patterns for fields in the form.
   */
  patterns: Immutable<
    FormMutableState<T>['patterns'] & {
      /**
       * Gets the regular expression pattern for a nested field.
       *
       * @example
       * formState.patterns.get((path) => path.name)
       *
       * @param path - Form state path expression.
       * @returns `string` containing the regular expression pattern or `undefined`.
       */
      get: (expression: (data: T) => unknown) => string | undefined;
      /**
       * Gets an array of all pattern keys.
       *
       * @returns An array of pattern keys.
       */
      getKeys: () => string[];
    }
  >;
  /**
   * Optional field descriptions in the form.
   */
  descriptions: Immutable<
    FormMutableState<T>['descriptions'] & {
      /**
       * Gets the description for a nested field.
       *
       * @example
       * formState.descriptions.get((path) => path.name)
       *
       * @param path - Form state path expression.
       * @returns `string` containing the description; no description returns an empty `string`.
       */
      get: (expression: (data: T) => unknown) => string;
      /**
       * Gets an array of all description keys.
       *
       * @returns An array of description keys.
       */
      getKeys: () => string[];
    }
  >;
};

/**
 * Form status type.
 */
export type FormStatus = {
  /**
   * Whether the form mode as "editable" (default), "readOnly" or "disabled".
   */
  readonly mode: FormMode;
  /**
   * Whether the form is marked as read-only.
   */
  readonly readOnly: boolean;
  /**
   * Whether the form is marked as disabled.
   */
  readonly disabled: boolean;
  /**
   * Whether any field in the form has been touched.
   */
  readonly touched: boolean;
  /**
   * Whether the form is not in the initial state.
   */
  readonly dirty: boolean;
  /**
   * Whether the form is valid (has no errors).
   *
   * The value is `null` if the form has not been validated.
   */
  readonly valid: boolean | null;
  /**
   * Whether the form is valid as per the schema, without accounting for manual errors.
   *
   * The value is `null` if the form has not been validated.
   */
  readonly validSchema: boolean | null;
  /**
   * Whether the form submit action is pending.
   *
   * The form must be submitted from the `action` attribute of the form.
   */
  readonly submitting: boolean;
  /**
   * Whether the form has been submitted (initially or after the last form reset).
   */
  readonly submitted: boolean;
};

/**
 * A form path that can be a field name or a state path expression.
 *
 * @typeParam T - form state type.
 */
// "any" allows inference to flow forward.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormPath<T extends z.ZodMiniObject> = keyof z.infer<T> | ((data: z.infer<T>) => any);

/**
 * Helper type to resolve the value type from a FormPath.
 *
 * @typeParam T - form state type.
 * @typeParam P - the form path (either a key or a function expression).
 */
export type FormPathValue<T extends z.ZodMiniObject, P extends FormPath<T>> = P extends (
  data: z.infer<T>
) => infer R
  ? R
  : P extends keyof z.infer<T>
    ? z.infer<T>[P]
    : P extends string
      ? PathValue<z.infer<T>, P>
      : unknown;

/**
 * The form-state arguments passed to a {@link FormClassCallback} callback.
 */
export type FormClassState = {
  /**
   * `true` when the field has a validation error and the form has been validated.
   */
  isError: boolean;
  /**
   * `true` when the field has been touched.
   */
  isTouched: boolean;
  /**
   * `true` when the field is required by the schema.
   */
  isRequired: boolean;
  /**
   * The current form mode (`editable`, `readOnly`, or `disabled`).
   */
  mode: FormMode;
};

/**
 * A clsx-compatible class value. A `string` is used directly; an `object` emits the keys
 * whose values are truthy; arrays are flattened recursively; `false`, `null`, and
 * `undefined` are filtered out.
 */
export type FormClassValue =
  | string
  | Record<string, boolean | null | undefined>
  | readonly FormClassValue[]
  | false
  | null
  | undefined;

/**
 * A callback that produces CSS classes from the current field state. The return value can be
 * a `string`, a clsx-style `object`, an array of either, or a falsy value.
 */
export type FormClassCallback = (state: FormClassState) => FormClassValue;

/**
 * Options for the `formClasses` function.
 */
export type FormClassOptions = {
  /**
   * A custom CSS class prefix for the form. The default prefix is `form-state`.
   *
   * Set the value to `null` to skip prefix-based CSS classes.
   *
   * CSS classes that are generated based on the form state:
   *
   * - `[prefix]__error` (form-state__error)
   * - `[prefix]__touched` (form-state__touched)
   * - `[prefix]__required` (form-state__required)
   * - `[prefix]__disabled` (form-state__disabled)
   * - `[prefix]__readonly` (form-state__readonly)
   */
  prefix?: string | null;
  /**
   * Classes to append to the prefix classes. Either a static `string` (always applied) or a
   * callback that receives the current field state and returns a clsx-compatible value.
   *
   * @example
   * formClasses('email', { classNames: 'w-full rounded-md' });
   * formClasses('email', { classNames: ({ isError, isTouched }) =>
   *   isError && isTouched ? 'border-red-400' : 'border-zinc-300'
   * });
   */
  classNames?: string | FormClassCallback;
};

/**
 * Form change options.
 *
 * @typeParam T - form state type.
 */
export type FormChangeOptions<T extends z.ZodMiniObject> = {
  /**
   * Indicates whether to mark field as touched (default: `false`).
   */
  touch?: boolean;
  /**
   * Indicates whether to validate the field (default: `true`).
   *
   * The default value can be overridden in the options of the `useFormState` hook.
   */
  validate?: boolean;
  /**
   * An optional debounce interval in milliseconds before dispatching the form state change.
   * Default: 0 - the change is going to happen immediately.
   *
   * Important: this feature should be used for text input/text area elements. The field state value
   * should be set in the `defaultValue` attribute of the element. Otherwise, the `value`
   * attribute is going to prevent users from typing properly by changing the control's data
   * to the existing form state value.
   */
  debounceIntervalMs?: number;
  /**
   * An optional callback to run after the form state has been changed.
   *
   * Important: the callback function needs to be stable. It can either be defined on the module level
   * or implemented with the `useCallback` hook. An inline function cannot be debounced since a new function
   * instance would get created on every render.
   *
   * @param state - Updated form state - data, errors, touched and dirty flags.
   * @param status - Updated form status.
   */
  callback?: ((state: FormState<z.infer<T>>, status: FormStatus) => void) | undefined;
};

/**
 * Form array data change options.
 */
export type FormChangeArrayOptions<T extends z.ZodMiniObject> = Omit<
  FormChangeOptions<T>,
  'debounceIntervalMs'
>;

/**
 * Form data replace options.
 */
export type FormReplaceOptions = {
  /**
   * Indicates whether to validate the form state (default: `false`).
   */
  validate?: boolean;
};

/**
 * Form touch options.
 */
export type FormTouchOptions = {
  /**
   * Indicates whether to validate the field (default: `true`).
   *
   * The default value can be overridden in the options of the `useFormState` hook.
   */
  validate?: boolean;
};

/**
 * Form set error options.
 */
export type FormSetErrorOptions = {
  /**
   * Indicates whether to validate the form state (default: `true` - uses the `change` action default).
   *
   * The default value can be overridden in the options of the `useFormState` hook.
   */
  validate?: boolean;
};

/**
 * Form clear errors options.
 */
export type FormClearErrorsOptions = {
  /**
   * An optional predicate function to only clear specific errors based on their key.
   */
  predicate?: ((key: string) => boolean) | undefined;

  /**
   * Indicates whether to validate the form state (default: `true` - uses the `change` action default).
   *
   * The default value can be overridden in the options of the `useFormState` hook.
   */
  validate?: boolean;
};

/**
 * Form reset options.
 *
 * @typeParam T - form state type.
 */
export type FormResetOptions<T extends z.ZodMiniObject> = {
  /**
   * An optional array of root level field names to reset. If not provided, all fields will be reset.
   */
  names?: (keyof z.infer<T>)[];
  /**
   * Indicates whether to retain the current field values (default: `false`).
   */
  retainData?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields (default: `false`).
   */
  resetTouched?: boolean;
  /**
   * An optional callback to run after the form state has been reset.
   *
   * @param state - Updated form state - data, errors, touched and dirty flags.
   * @param status - Updated form status.
   */
  callback?: ((state: FormState<z.infer<T>>, status: FormStatus) => void) | undefined;
};

/**
 * The result returned by a manual validation function. `true` indicates no errors; the record
 * maps field names to error messages (`undefined` allows returning objects with different field names).
 */
export type ValidationResult = Record<string, string | undefined> | true;

/**
 * Form validation options.
 *
 * @typeParam T - form state type.
 */
export type FormValidateOptions<T extends z.ZodMiniObject> = {
  /**
   * Indicates whether to reset the dirty state of the fields (default: `true`).
   */
  resetDirty?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields after the form was
   * submitted. (default: `true`).
   *
   * Note: this setting is applicable only when `submit` is set to true. Regular
   * validations do not affect `touched` flags.
   */
  resetTouched?: boolean;
  /**
   * Indicates whether to update the initial form data with the submitted data.
   * Resetting the form would default it to the submitted data (default: `true`).
   */
  updateInitialData?: boolean;
  /**
   * Indicates whether to mark the form submitted if its state is valid (default: `false`).
   */
  submit?: boolean;
  /**
   * An optional callback to run after the form state has been validated.
   *
   * @param state - Updated form state - data, errors, touched and dirty flags.
   * @param status - Updated form status.
   */
  callback?: ((state: FormState<z.infer<T>>, status: FormStatus) => void) | undefined;
};

/**
 * Form state on submission.
 *
 * @typeParam T - type of the form data.
 */
export type SubmitSuccessState<T extends object> = {
  /**
   * Form state data that includes form union types.
   */
  data: T;
  /**
   * Submitted form data as a `FormData` instance.
   */
  formData: FormData;
};

/**
 * Form submission options.
 *
 * @typeParam T - form state type.
 */
export type FormSubmitOptions<T extends z.ZodMiniObject> = {
  /**
   * Indicates whether to reset the dirty state of the fields (default: `true`).
   */
  resetDirty?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields (default: `true`).
   */
  resetTouched?: boolean;
  /**
   * Indicates whether to update the initial form data with the submitted data.
   * Resetting the form would default it to the submitted data (default: `true`).
   */
  updateInitialData?: boolean;
  /**
   * An optional callback to run after the form state has been submitted.
   *
   * @param state - Submitted form state.
   * @param state.data - Form state data that includes form union types.
   * @param state.formData - Submitted form data as a `FormData` instance.
   */
  onSuccess?: ((state: SubmitSuccessState<z.infer<T>>) => void) | undefined;
  /**
   * An optional callback to run if the form was not submitted due to errors
   * or the `onSubmit` function returning `false`.
   *
   * @param state - Updated form state - data, errors, touched and dirty flags.
   * @param status - Updated form status.
   */
  onError?: ((state: FormState<z.infer<T>>, status: FormStatus) => void) | undefined;
};

/**
 * Form element focus options.
 *
 * @typeParam T - form state type.
 */
export type ElementFocusOptions<T extends z.ZodMiniObject> = {
  /**
   * Shows that the element is focused using an outline style, if defined (default: `true`).
   */
  focusVisible?: boolean;
  /**
   * Do not scroll focused element into view (default: `false`).
   */
  preventScroll?: boolean;
  /**
   * Selects the text content of the focused input (default: `false`).
   */
  selectText?: boolean;
  /**
   * When provided, focuses only if there is an active error at the given field path or manual
   * error key. Accepts a path expression or a `string` key.
   */
  errorKey?: FormPath<T>;
};

/**
 * Form submission handler callback.
 *
 * @typeParam T - form state type.
 * @returns true, if there are no errors, or a hash object with error names and messages.
 */
export type FormSubmitHandler<T extends z.ZodMiniObject> = (
  /**
   * The submitted form state.
   */
  state: SubmitState<z.infer<T>>,
  /**
   * Form data in the `FormData` format.
   */
  formData: FormData
) => Promise<ValidationResult> | ValidationResult;

/**
 * The form mode type.
 */
export type FormMode = 'editable' | 'readOnly' | 'disabled';

/**
 * The form state response type.
 *
 * @typeParam T - form state type.
 */
export type FormStateResponse<T extends z.ZodMiniObject> = {
  /**
   * Initial form state - data and errors.
   */
  initialState: {
    /**
     * Initial form state data.
     */
    data: Immutable<z.infer<T>>;
    /**
     * Initial form state errors.
     */
    errors: Immutable<Record<keyof z.infer<T> | '', string | undefined>>;
  };
  /**
   * Form state - data, errors, touched and dirty flags as well as max lengths for strings and arrays.
   */
  formState: FormState<z.infer<T>>;
  /**
   * Form status.
   */
  formStatus: FormStatus;
  /**
   * Form actions.
   */
  formActions: {
    /**
     * Performs form field changes.
     *
     * @example
     * <input type="text" onChange={(event) => formActions.change(path => path.company.name, event.target.value)} />
     * <input type="checkbox" onChange={(event) => formActions.change('isActive', event.target.checked, { touch: true })} />
     *
     * @typeParam T - form state type.
     * @typeParam P - the form path type.
     * @param nameOrPath - Root level field name or a state path expression.
     * @param value - New value for the field (typed based on the path).
     * @param options - Options for the change event.
     */
    change: <P extends FormPath<T>>(
      nameOrPath: P,
      value: FormPathValue<T, P>,
      options?: FormChangeOptions<T>
    ) => void;
    /**
     * Performs data replacement in the form state.
     *
     * @example
     * formActions.replace({ name: John, info: { age: 24 } }, { validate: false })
     *
     * @typeParam T - form state type.
     * @param data - Replacement data.
     * @param options - Options for the replace event.
     */
    replace: (data: DeepPartial<z.infer<T>>, options?: FormReplaceOptions) => void;
    /**
     * Resets the form data to its initial state.
     *
     * Note: this method does not reset the HTML form element.
     *
     * @typeParam T - form state type.
     * @param options - Options for reset event.
     */
    reset: (options?: FormResetOptions<T>) => void;
    /**
     * Performs form field control touch state changes.
     *
     * @example
     * <input type="text" onBlue={(event) => formActions.touch((path) => path.notes[0].text)} />
     *
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     *                     The first field in the schema is touched if the path is not provided.
     * @param options - Options for the touch event.
     */
    touch: (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => void;
    validate: {
      /**
       * Validates the form and, optionally, sets its status as submitted when there are no form state errors.
       *
       * @example
       * formActions.validate({ submit: true }) // submit the form, if there are no errors.
       *
       * const onValidate = () => {
       *    const { isAddressValid, country } = customValidate(formState.data);
       *    if (!isAddressValid) {
       *       return { address: 'Invalid address' }; // custom errors as `Record<string, string>`
       *    }
       *    if (country !== 'US') {
       *       return { country: 'International shipping is not available' };
       *    }
       *    return true; // valid state (no errors)
       * };
       *
       * formActions.validate(onValidate)
       *
       * @param onValidate - A callback function to execute before submitting the form.
       * @param options - Options for form validation.
       */
      (onValidate?: () => ValidationResult, options?: FormValidateOptions<T>): void;
      /**
       * Validates the form and, optionally, sets its status as submitted when there are no form state errors.
       *
       * @example
       * formActions.validate({ submit: true }) // submit the form, if there are no errors.
       *
       * @param options - Options for form validation.
       */
      (options?: FormValidateOptions<T>): void;
    };
    /**
     * Marks the form as dirty with an arbitrary `string` key.
     *
     * @param key - Arbitrary `string` independent of the managed form state. It must start with the `#` sign to avoid collisions.
     * @param dirty - `true` to set the key as dirty, `false` to clear it. (default: `true`).
     */
    setDirty: (key: `#${string}`, dirty?: boolean) => void;
    /**
     * Sets the form mode.
     *
     * @param mode - sets the form mode as "editable" (default), "readOnly" or "disabled".
     */
    setMode: (mode: FormMode) => void;
    /**
     * Sets a manual error for a path that overrides any form generated errors.
     *
     * @example
     * formActions.setError('id', 'Invalid ID', { validate: true })
     * formActions.setError((path) => path.isActive, 'Non-active users cannot be edited')
     *
     * @param keyOrPath - Arbitrary `string` or a state path expression.
     *                    The first field in the schema is touched if the path is not provided.
     * @param error - Error message. Leave this parameter blank or set it to `null` to clear the manual error.
     * @param options - Options for setting a manual error.
     */
    setError: (
      keyOrPath: string | ((data: z.infer<T>) => unknown),
      error?: string | null,
      options?: FormSetErrorOptions
    ) => void;
    /**
     * Clears all manual errors.
     *
     * @param options - Options for clearing manual errors.
     */
    clearManualErrors: (options?: FormClearErrorsOptions) => void;
    /**
     * Gets the last submitted form data or `null`, if the form has never been submitted.
     *
     * @typeParam T - form state type.
     * @returns - The last submitted data.
     */
    getSubmittedData: () => SubmittedData<z.core.output<T>>;
    /**
     * Infers the name of a specified form field. The value can be used in HTML element's "name" attribute as well as
     * the argument in the `useWatch` hook.
     *
     * @param nameOrPath - Root level field name or a state path expression.
     * @param format - Specifies the path format (default: "bracket").
     *
     *  - "bracket" - Ex: `'schema["addresses"][1]["street"]'`
     *  - "dot" - Ex: `'schema.addresses.1.street'`
     * @example
     * <input type="text" name={formActions.inferName('name')} />
     * <input type="text" name={formActions.inferName(path => path.company.name, 'dot')} />
     *
     * @returns The inferred name.
     */
    inferName: (nameOrPath: FormPath<T>, format?: 'bracket' | 'dot') => string;
    /**
     * Blurs the actively focused HTML element.
     */
    blur: () => void;
    focus: {
      /**
       * Focuses the HTML element with the provided name.
       *
       * @param name - The name HTML attribute value.
       * @param options - Focus options.
       * @param options.focusVisible - Shows that the element is focused using an outline style, if defined
       *                               (default: `true`).
       * @param options.preventScroll - Do not scroll focused element into view (default: `false`).
       * @param options.selectText - Selects the text content of the focused input (default: `false`).
       * @param options.errorKey - When provided, focuses only if there is an active error at the given
       *                           field path or manual error key. Accepts a path expression or a `string` key.
       */
      (name: string, options?: ElementFocusOptions<T>): void;
      /**
       * Focuses the provided HTML element.
       *
       * @param element - The HTML element to focus, or `null` (no-op).
       * @param options - Focus options.
       * @param options.focusVisible - Shows that the element is focused using an outline style, if defined
       *                               (default: true).
       * @param options.preventScroll - Do not scroll focused element into view (default: `false`).
       * @param options.selectText - Selects the text content of the focused input (default: `false`).
       * @param options.errorKey - When provided, focuses only if there is an active error at the given
       *                           field path or manual error key. Accepts a path expression or a `string` key.
       */
      (element: HTMLElement | null, options?: ElementFocusOptions<T>): void;
    };
    /**
     * Focuses the first `input` or `textarea` element in the form that has the error CSS class applied
     * via `formClasses`.
     *
     * @param options - Focus options.
     * @param options.focusVisible - Shows that the element is focused using an outline style, if defined
     *                               (default: `true`).
     * @param options.preventScroll - Do not scroll focused element into view (default: `false`).
     * @param options.selectText - Selects the text content of the focused input (default: `false`).
     */
    focusOnFirstError: (options?: Omit<ElementFocusOptions<T>, 'errorKey'>) => void;
    /**
     * Array data change operations.
     */
    array: {
      /**
       * Appends an item to the end of an array data property.
       *
       * @example
       * formActions.array.append('tags', ['Important', 'Do not delete'])
       * formActions.array.append((path) => path.info.emails, 'test@internet.org')
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param items - An item or an array of items to append.
       * @param options - Options for the corresponding change event.
       */
      append: <P extends FormPath<T>, I = FormPathValue<T, P>>(
        nameOrPath: P,
        items: ArrayElement<I>[] | ArrayElement<I>,
        options?: FormChangeArrayOptions<T>
      ) => void;
      /**
       * Inserts an item at the specified index in an array data property.
       *
       * @example
       * formActions.array.insert('tags', 1, ['Important', 'Do not delete'])
       * formActions.array.insert((path) => path.info.emails, 0, 'test@internet.org')
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param index - An array index.
       * @param items - An item or an array of items to append.
       * @param options - Options for the corresponding change event.
       */
      insert: <P extends FormPath<T>, I = FormPathValue<T, P>>(
        nameOrPath: P,
        index: number,
        items: ArrayElement<I>[] | ArrayElement<I>,
        options?: FormChangeArrayOptions<T>
      ) => void;
      /**
       * Updates an item at the specified index of an array data property.
       *
       * @example
       * formActions.array.update('tags', 1, 'Do not delete')
       * formActions.array.update((path) => path.info.emails, 0, 'user@internet.org')
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param index - An array index.
       * @param items - An item or an array of items to append.
       * @param options - Options for the corresponding change event.
       */
      update: <P extends FormPath<T>, I = FormPathValue<T, P>>(
        nameOrPath: P,
        index: number,
        item: ArrayElement<I>,
        options?: FormChangeArrayOptions<T>
      ) => void;
      /**
       * Swaps 2 items with the specified indexes in an array data property.
       *
       * @example
       * formActions.array.swap('tags', 1, 2)
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param from - The swapped item's array index.
       * @param to - The target item's array index.
       * @param options - Options for the corresponding change event.
       */
      swap: (
        nameOrPath: FormPath<T>,
        from: number,
        to: number,
        options?: FormChangeArrayOptions<T>
      ) => void;
      /**
       * Removes items from an array data property.
       *
       * @example
       * formActions.array.remove('tags', (value) => value.toUpperCase() === 'DELETE')
       * formActions.array.remove((path) => path.tags, 2)
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param indexOrPredicate - An array index number, or a predicate function that returns a
       *                           `boolean` value that indicates that the item should be removed.
       * @param options - Options for the corresponding change event.
       */
      remove: <P extends FormPath<T>>(
        nameOrPath: P,
        indexOrPredicate:
          | number
          | ((value: ArrayElement<FormPathValue<T, P>>, index: number) => boolean),
        options?: FormChangeArrayOptions<T>
      ) => void;
      /**
       * Removes all items from an array data property.
       *
       * @example
       * formActions.array.clear('tags');
       * formActions.array.clear((path) => path.tags);
       *
       * @typeParam T - form state type.
       * @typeParam P - the form path type.
       * @typeParam I - the array item type.
       * @param nameOrPath - Root level field name or a state path expression.
       * @param options - Options for the corresponding change event.
       */
      clear: (nameOrPath: FormPath<T>, options?: FormChangeArrayOptions<T>) => void;
    };
  };
  /**
   * Form handler functions.
   */
  formHandlers: {
    /**
     * A function to call in the `action` attribute of a `<Form />` component to submit the form.
     *
     * @example
     * const onSubmit = async (state: SubmitState<FormSchema>, formData: FormData) => {
     *    const { isAddressValid, country } = await validateApi(schema.toObject(state));
     *    if (!isAddressValid) {
     *       return { address: 'Invalid address' }; // custom errors as `Record<string, string>`
     *    }
     *    if (country !== 'US') {
     *       return { country: 'International shipping is not available' };
     *    }
     *    return true; // valid state (no errors)
     * };
     * const onSubmitted = (state: SubmitSuccessState<FormSchema>) => { ... };
     * const onSubmitError = (state: FormState<FormSchema>, status: FormStatus) => { ... };
     *
     * <Form action={formHandlers.handleSubmit(onSubmit, { onSuccess: onSubmitted, onError: onSubmitError })}>...</Form>
     *
     * @param onSubmit - A callback function to execute before submitting the form.
     *
     * Callback return values:
     * - `true`, if there are no errors
     * - a hash object with error names and messages (an empty object `{}` also represents no errors)
     *
     * @param options - Options for form submission.
     */
    handleSubmit: (
      onSubmit: FormSubmitHandler<T>,
      options?: FormSubmitOptions<T>
    ) => (formData: FormData) => Promise<void>;
    /**
     * A function to call in the `onReset` attribute to reset the form to its initial state.
     *
     * There is no need to call this function manually if you are using the `Form` component of the library.
     * However, you may still want to call the function on reset with non-default option values.
     *
     * @typeParam T - form state type.
     * @param event - Pass-through form reset event that triggered the HTML form reset.
     * @param options - Options for reset event.
     */
    handleReset: (
      event?: SyntheticEvent<HTMLFormElement> | null,
      options?: FormResetOptions<T>
    ) => void;
  };
  /**
   * Form hooks.
   */
  formHooks: {
    /**
     * A hook that listens to "change" and "submit" form events.
     *
     * @param listener - A listener function.
     */
    useListener: (listener?: StateChangeListener<z.infer<T>>) => void;
    /**
     * A hook that watches a field based on the element's `name` HTML attribute.
     *
     * Note: The `Form` component from this library must be used to track changes.
     *
     * The following HTML form elements are supported.
     *  - input
     *  - textarea
     *
     * @example
     * const nameValue = useWatch('name');
     * const ageValue = useWatch(
     *     inferName((path) => path.info.age),
     *     (value) => (parseInt(value, 10) <= 0 ? '' : value)
     * );
     *
     * @param name - A `name` HTML attribute value of the element to watch.
     * @param compute - An optional compute function to transform the value.
     * @returns The value of the element.
     */
    useWatch: (name: string, compute?: (value: string) => string) => string;
    /**
     * A hook that creates a memoized selector over the form state data or derived data.
     * It is similar to the `createSelector` method in the "Reselect" library.
     *
     * @example
     * const selectActiveUsers = createSelector(
     *   [state => state.users],
     *   users => users.filter(u => u.active)
     * );
     * const activeUsers = selectActiveUsers(formState.data);
     *
     * @param inputSelectors - One or more selectors that extract values from the source state.
     * @param resultFn - The result function that computes the final value from the extracted inputs.
     * @returns Memoized selector function.
     */
    useSelector: FormDataSelector<Immutable<z.infer<T>>>;
  };
  formClasses: {
    /**
     * Returns the prefix CSS classes (`form-state__error`, `form-state__touched`, etc.) for
     * the control with the provided path.
     *
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     * @returns A `string` of space-separated class names.
     */
    (nameOrPath: FormPath<T>): string;
    /**
     * Returns the prefix CSS classes for the control with the provided path, with the
     * `classNames` argument appended verbatim.
     *
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     * @param classNames - A `string` of space-separated class names appended verbatim.
     * @returns A `string` of space-separated class names.
     */
    (nameOrPath: FormPath<T>, classNames: string): string;
    /**
     * Returns the prefix CSS classes for the control with the provided path, with the result
     * of `callback` rendered as additional classes.
     *
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     * @param callback - A callback receiving the current {@link FormClassState}
     *                   (`{ isError, isTouched, isRequired, mode }`) and returning a
     *                   {@link FormClassValue} — a `string`, a clsx-style `object`, an array
     *                   of either, or a falsy value.
     * @returns A `string` of space-separated class names.
     */
    (nameOrPath: FormPath<T>, callback: FormClassCallback): string;
    /**
     * Returns the prefix CSS classes for the control with the provided path, with `options`
     * overriding the form-level `cssOptions` defaults.
     *
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     * @param options - {@link FormClassOptions} with `prefix` and/or `classNames`. Per-call
     *                  values fully replace the form-level `cssOptions` defaults for the same
     *                  key.
     * @returns A `string` of space-separated class names.
     */
    (nameOrPath: FormPath<T>, options: FormClassOptions): string;
  };
  /**
   * The Form component with pre-wired reset logic.
   *
   * Native form validation has been disabled and Enter handling modified
   * for consistency.
   *
   * @param props - `Form` component props.
   * @returns `Form` React element.
   */
  Form: (props: FormProps) => React.JSX.Element;
};

/**
 * The date notation format in a `string`.
 */
export type FormDateFormat =
  | 'yyyy-MM-dd'
  | 'MM/dd/yyyy'
  | 'dd/MM/yyyy'
  | 'MM-dd-yyyy'
  | 'dd-MM-yyyy'
  | 'dd.MM.yyyy';

/**
 * Form props.
 */
export type FormProps = React.ComponentPropsWithRef<'form'> & {
  /**
   * Allow forms to be submitted by pressing the "Enter" key (default: `false`).
   */
  submitWithEnter?: boolean;
  /**
   * Allows browser built-in validation (default: `false`).
   */
  nativeValidation?: boolean;
};

/**
 * Component props that contain the form state.
 *
 * @typeParam T - form state type.
 */
export type FormStateProps<T extends z.ZodMiniObject> = {
  /**
   * The form state.
   */
  form: FormStateResponse<T>;
};

/**
 * Component props that contain the form state and the index of the corresponding array property in the state.
 *
 * @typeParam T - form state type.
 */
export type FormStatePropsWithIndex<T extends z.ZodMiniObject> = FormStateProps<T> & {
  /**
   * The index of the corresponding array state property.
   */
  index: number;
};

/**
 * Component props that contain the HTML element properties along with the form state.
 *
 * @typeParam T - HTML element type.
 * @typeParam F - form state type.
 */
export type FormControlWithStateProps<F extends z.ZodMiniObject> = FormStateProps<F> &
  Omit<React.ComponentPropsWithRef<'form'>, 'form'>;

/**
 * The date parse result type.
 */
export type DateParseResult = {
  /**
   * `true` if the operation was successful; otherwise, `false`.
   */
  success: boolean;
  /**
   * The parsed date object; or `null` if the operation was unsuccessful.
   */
  date: Date | null;
};

/**
 * The `ranges` value conditional type.
 *
 * @typeParam R - The range type.
 */
export type RangeResult<R> = R extends number | Date
  ? { type: string; format: string; min: R | undefined; max: R | undefined }
  : undefined;

/**
 * Parsed result type.
 *
 * @typeParam T - form state type.
 */
export type ParseResult<T extends z.ZodMiniObject> = {
  /**
   * Data object instance, if the validation was successful.
   */
  data: z.infer<T>;
  /**
   * Data validation errors.
   */
  errors: Record<keyof z.infer<T> | '', string | undefined> & {
    /**
     * Gets an error message for a nested field.
     *
     * @example
     * formState.errors.get((path) => path.company.name)
     *
     * @param path - Form state path expression.
     * @returns Error message for the specified field, or `undefined` if there is no error.
     */
    get: (expression: (data: z.infer<T>) => unknown) => string | undefined;
    /**
     * Gets an array of all error messages.
     *
     * @returns An array of error messages.
     */
    getAll: () => string[];
    /**
     * Gets an array of all error keys.
     *
     * @returns An array of all error keys.
     */
    getKeys: () => string[];
  };
  /**
   * Indicates whether the operation was successfull.
   */
  success: boolean;
};

/**
 * Parsed result type as a schema object.
 *
 * @typeParam T - form state type.
 */
export type ParseAsObjectResult<T extends z.ZodMiniObject> = {
  /**
   * Schema object instance stripped of internal-only fields and empty form values.
   */
  data: SchemaDataObject<z.infer<T>>;
  /**
   * Data validation errors.
   */
  errors: Record<keyof z.infer<T> | '', string | undefined> & {
    get: (expression: (data: z.infer<T>) => unknown) => string | undefined;
    getAll: () => string[];
    getKeys: () => string[];
  };
  /**
   * Indicates whether the operation was successfull.
   */
  success: boolean;
};
