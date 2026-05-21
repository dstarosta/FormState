import * as z from "zod/mini";
import { ComponentType, PropsWithChildren, SyntheticEvent } from "react";
import * as _$react_jsx_runtime0 from "react/jsx-runtime";

//#region \0rolldown/runtime.js
//#endregion
//#region src/types/form-types.d.ts
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
    toObject<T extends this, U extends z.infer<T>>(data: U | DeepPartial<U> | FormState<U>['data']): SchemaDataObject<z.infer<T>>;
  }
}
type PathValue<T, P extends string> = P extends keyof T ? T[P] : P extends `${infer K}.${infer R}` ? K extends keyof T ? PathValue<T[K], R> : never : never;
type IsUnion<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type Flatten<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type ReplaceEmptyWithUndefined<T> = T extends '' ? undefined : T;
type DateToString<T> = T extends Date ? string : T extends (infer Item)[] ? DateToString<Item>[] : T extends object ? { [K in keyof T]: DateToString<T[K]> } : T;
type NormalizePrimitives<T> = DateToString<ReplaceEmptyWithUndefined<T>>;
type RangeOf<T> = undefined | Date | number | (IsUnion<T, Date | string> extends true ? Date | string : never) | (IsUnion<T, number | ''> extends true ? number | '' : never);
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type SelectorResults<S, Selectors extends Selector<S, unknown>[]> = { [K in keyof Selectors]: Selectors[K] extends Selector<S, infer R> ? R : never };
type FormDataSelector<S> = {
  <I extends Selector<S, unknown>, R>(inputSelector: I, resultFn: (input: ReturnType<I>) => R): Selector<S, R>;
  <I extends Selector<S, unknown>[], R>(inputSelectors: [...I], resultFn: (...inputs: SelectorResults<S, I>) => R): Selector<S, R>;
};
type ImmutablePrimitive = undefined | null | boolean | string | number | symbol | Date | Error | Function | RegExp | Promise<unknown>;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
type ArrayElement<A> = A extends readonly (infer U)[] ? U : never;
type FieldRange = number | Date | undefined;
type FormMutableState<T extends object> = {
  initialData: T;
  data: T;
  submittedData: SubmittedData<T>;
  initialErrors: Record<keyof T | '', string | undefined>;
  errors: Record<keyof T | '', string | undefined>;
  mode: FormMode;
  dirty: Record<keyof T, boolean>;
  touched: Record<keyof T, boolean>;
  required: Record<keyof T, boolean>;
  ranges: Record<keyof T, {
    type: string;
    format: string;
    min: FieldRange;
    max: FieldRange;
  }>;
  patterns: Record<keyof T, string | undefined>;
  descriptions: Record<keyof T | '', string | undefined>;
  submitCount: number;
  changed: boolean;
  replaced: boolean;
  validated: boolean;
  manualErrors: Record<string, string>;
  /**
   * Errors collected from the most recently resolved async validation pass.
   * Merged into `errors` on the next render. Cleared whenever `data` changes.
   */
  asyncErrors: Record<keyof T | '', string | undefined>;
  /**
   * Monotonically increasing id used to discard stale async validation results.
   */
  asyncRequestId: number;
  /**
   * Whether an async validation pass is currently pending for the latest data.
   */
  asyncValidating: boolean;
};
type FormTypeOptions = {
  required: boolean;
  error?: string;
} | {
  required?: boolean;
  error: string;
};
type FormDateOptions = {
  required: boolean;
  dateFormat?: FormDateFormat;
  error?: string;
  dateFormatError?: string;
} | {
  required?: boolean;
  dateFormat: FormDateFormat;
  error?: string;
  dateFormatError?: string;
} | {
  required?: boolean;
  dateFormat?: FormDateFormat;
  error: string;
  dateFormatError?: string;
} | {
  required?: boolean;
  dateFormat?: FormDateFormat;
  error?: string;
  dateFormatError: string;
};
type FormStringOptions = {
  required: boolean;
  allowEmpty?: boolean;
  error?: string;
  normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
} | {
  required?: boolean;
  allowEmpty: boolean;
  error?: string;
  normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
} | {
  required?: boolean;
  allowEmpty?: boolean;
  error: string;
  normalize?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
} | {
  required?: boolean;
  allowEmpty?: boolean;
  error?: string;
  normalize: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
};
type FormPathValueOrUnknown<T extends z.ZodMiniObject, P> = P extends FormPath<T> ? FormPathValue<T, P> : unknown;
type Selector<S, R> = (state: S) => R;
/**
 * Immutable type.
 */
type Immutable<T> = T extends ImmutablePrimitive ? T : T extends Array<infer U> ? ImmutableArray<U> : T extends Map<infer K, infer V> ? ImmutableMap<K, V> : T extends Set<infer M> ? ImmutableSet<M> : T extends object ? ImmutableObject<T> : T;
/**
 * Recursive `Partial<T>` like type.
 */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
/**
 * Zod validation error.
 */
type ZodValidationError = z.core.$ZodRawIssue & {
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
type FormEventType = 'change' | 'submit';
/**
 * Submitted form data.
 *
 * @typeParam T - type of the form data.
 */
type SubmittedData<T extends object> = {
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
type StateChangeEvent<T extends object> = {
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
type StateChangeListener<T extends object> = (event: StateChangeEvent<T>) => void;
/**
 * Form initialization options.
 *
 * @typeParam T - type of the form data.
 */
type FormInitOptions<T extends z.ZodMiniObject> = {
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
type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};
/**
 * Type of schema data with stripped empty literals from union types.
 */
type SchemaDataObject<T> = T extends ImmutablePrimitive ? NormalizePrimitives<T> : T extends unknown[] ? T extends (infer Item)[] ? SchemaDataObject<NormalizePrimitives<Item>>[] : T : Flatten<{ [K in keyof T as T[K] extends object ? K : ReplaceEmptyWithUndefined<T[K]> extends never ? never : undefined extends NormalizePrimitives<T[K]> ? never : K]: T[K] extends object ? SchemaDataObject<T[K]> : NormalizePrimitives<T[K]> } & { [K in keyof T as T[K] extends object ? never : NormalizePrimitives<T[K]> extends never ? never : undefined extends NormalizePrimitives<T[K]> ? K : never]?: NormalizePrimitives<T[K]> }>;
/**
 * Form state on submission.
 *
 * @typeParam T - type of the form data.
 */
type SubmitState<T extends object> = {
  /**
   * Indicates whether the state is valid.
   */
  valid: true;
  /**
   * Form state data that includes form union types.
   */
  data: T;
} | {
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
type FormState<T extends object> = {
  /**
   * Form state data.
   */
  data: Immutable<FormMutableState<T>['data']>;
  /**
   * Errors for each field in the form.
   */
  errors: Immutable<FormMutableState<T>['errors'] & {
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
  }>;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<FormMutableState<T>['dirty'] & {
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
  }>;
  /**
   * Touched status for each field in the form.
   */
  touched: Immutable<FormMutableState<T>['touched'] & {
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
  }>;
  /**
   * Required status for each field in the form.
   */
  required: Immutable<FormMutableState<T>['required'] & {
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
  }>;
  /**
   * Optional min/max ranges for numeric and date fields in the form.
   */
  ranges: Immutable<FormMutableState<T>['ranges'] & {
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
      <R extends string>(expression: (data: T) => R | undefined): RangeResult<R extends string ? number | undefined : never>;
      /**
       * Gets the minimum and maximum values for a nested numeric or date field.
       *
       * @example
       * const { min, max } = formState.ranges.get((path) => path.info.birthDate) ?? {}
       *
       * @param path - Form state path expression.
       * @returns An object containing the `min` and the `max` properties that can be `number`, `Date` or `undefined`.
       */
      <R extends unknown[]>(expression: (data: T) => R | undefined): RangeResult<R extends unknown[] ? number | undefined : never>;
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
      <K extends { [P in keyof T]: T[P] extends string | unknown[] | number | Date | undefined ? P : never }[keyof T]>(name: K): T[K] extends Date ? Date : number;
      /**
       * Gets the minimum range value from the corresponding range of a field.
       *
       * @param name - Field name.
       * @returns The minimum range value.
       * @throws `TypeError` when a range with the minimum value is not defined in the schema.
       */
      <R extends string | unknown[] | number | Date | undefined>(expression: (data: T) => R): Date extends R ? Date : number;
    };
    getMax: {
      /**
       * Gets the maximum range value or length from the corresponding range of a field.
       *
       * @param name - Field name.
       * @returns The maximum range value.
       * @throws `TypeError` when a range with the maximum value is not defined in the schema.
       */
      <K extends { [P in keyof T]: T[P] extends string | unknown[] | number | Date | undefined ? P : never }[keyof T]>(name: K): T[K] extends Date ? Date : number;
      /**
       * Gets the maximum range value from the corresponding range of a field.
       *
       * @param name - Field name.
       * @returns The maximum range value.
       * @throws `TypeError` when a range with the maximum value is not defined in the schema.
       */
      <R extends string | unknown[] | number | Date | undefined>(expression: (data: T) => R): Date extends R ? Date : number;
    };
    /**
     * Gets an array of all range keys.
     *
     * @returns An array of range keys.
     */
    getKeys: () => string[];
  }>;
  /**
   * Optional regular expression patterns for fields in the form.
   */
  patterns: Immutable<FormMutableState<T>['patterns'] & {
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
  }>;
  /**
   * Optional field descriptions in the form.
   */
  descriptions: Immutable<FormMutableState<T>['descriptions'] & {
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
  }>;
};
/**
 * Form status type.
 */
type FormStatus = {
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
   * Whether an async validation pass is currently in flight for the latest data.
   *
   * Always `false` for schemas that do not contain async checks.
   */
  readonly validating: boolean;
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
type FormPath<T extends z.ZodMiniObject> = keyof z.infer<T> | ((data: z.infer<T>) => any);
/**
 * Helper type to resolve the value type from a FormPath.
 *
 * @typeParam T - form state type.
 * @typeParam P - the form path (either a key or a function expression).
 */
type FormPathValue<T extends z.ZodMiniObject, P extends FormPath<T>> = P extends ((data: z.infer<T>) => infer R) ? R : P extends keyof z.infer<T> ? z.infer<T>[P] : P extends string ? PathValue<z.infer<T>, P> : unknown;
/**
 * The form-state arguments passed to a {@link FormClassCallback} callback.
 */
type FormClassState = {
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
type FormClassValue = string | Record<string, boolean | null | undefined> | readonly FormClassValue[] | false | null | undefined;
/**
 * A callback that produces CSS classes from the current field state. The return value can be
 * a `string`, a clsx-style `object`, an array of either, or a falsy value.
 */
type FormClassCallback = (state: FormClassState) => FormClassValue;
/**
 * Options for the `formClasses` function.
 */
type FormClassOptions = {
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
type FormChangeOptions<T extends z.ZodMiniObject> = {
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
type FormChangeArrayOptions<T extends z.ZodMiniObject> = Omit<FormChangeOptions<T>, 'debounceIntervalMs'>;
/**
 * Form data replace options.
 */
type FormReplaceOptions = {
  /**
   * Indicates whether to validate the form state (default: `false`).
   */
  validate?: boolean;
};
/**
 * Form touch options.
 */
type FormTouchOptions = {
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
type FormSetErrorOptions = {
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
type FormClearErrorsOptions = {
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
type FormResetOptions<T extends z.ZodMiniObject> = {
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
type ValidationResult = Record<string, string | undefined> | true;
/**
 * Form validation options.
 *
 * @typeParam T - form state type.
 */
type FormValidateOptions<T extends z.ZodMiniObject> = {
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
type SubmitSuccessState<T extends object> = {
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
type FormSubmitOptions<T extends z.ZodMiniObject> = {
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
type ElementFocusOptions<T extends z.ZodMiniObject> = {
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
type FormSubmitHandler<T extends z.ZodMiniObject> = (
/**
 * The submitted form state.
 */

state: SubmitState<z.infer<T>>,
/**
 * Form data in the `FormData` format.
 */

formData: FormData) => Promise<ValidationResult> | ValidationResult;
/**
 * The form mode type.
 */
type FormMode = 'editable' | 'readOnly' | 'disabled';
/**
 * The form state response type.
 *
 * @typeParam T - form state type.
 */
type FormStateResponse<T extends z.ZodMiniObject> = {
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
    change: <P extends FormPath<T>>(nameOrPath: P, value: FormPathValue<T, P>, options?: FormChangeOptions<T>) => void;
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
     * Async counterpart to `validate` for schemas with async checks
     * (e.g. `z.validateAsync`). Use for programmatic validation only — for
     * form submission with async schemas, use `handleSubmit` which already
     * awaits async parsing.
     *
     * Resolves to `true` when the form state is valid (no errors, including
     * manual errors), `false` otherwise. After the promise resolves,
     * `formState` and `formStatus` also reflect the validation result.
     *
     * @example
     * const isValid = await formActions.validateAsync();
     *
     * if (!isValid) {
     *   // react immediately without reading from a possibly stale closure
     * }
     */
    validateAsync: () => Promise<boolean>;
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
    setError: (keyOrPath: string | ((data: z.infer<T>) => unknown), error?: string | null, options?: FormSetErrorOptions) => void;
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
      append: <P extends FormPath<T>, I = FormPathValue<T, P>>(nameOrPath: P, items: ArrayElement<I>[] | ArrayElement<I>, options?: FormChangeArrayOptions<T>) => void;
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
      insert: <P extends FormPath<T>, I = FormPathValue<T, P>>(nameOrPath: P, index: number, items: ArrayElement<I>[] | ArrayElement<I>, options?: FormChangeArrayOptions<T>) => void;
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
      update: <P extends FormPath<T>, I = FormPathValue<T, P>>(nameOrPath: P, index: number, item: ArrayElement<I>, options?: FormChangeArrayOptions<T>) => void;
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
      swap: (nameOrPath: FormPath<T>, from: number, to: number, options?: FormChangeArrayOptions<T>) => void;
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
      remove: <P extends FormPath<T>>(nameOrPath: P, indexOrPredicate: number | ((value: ArrayElement<FormPathValue<T, P>>, index: number) => boolean), options?: FormChangeArrayOptions<T>) => void;
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
    handleSubmit: (onSubmit: FormSubmitHandler<T>, options?: FormSubmitOptions<T>) => (formData: FormData) => Promise<void>;
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
    handleReset: (event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => void;
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
type FormDateFormat = 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'MM-dd-yyyy' | 'dd-MM-yyyy' | 'dd.MM.yyyy';
/**
 * Form props.
 */
type FormProps = React.ComponentPropsWithRef<'form'> & {
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
type FormStateProps<T extends z.ZodMiniObject> = {
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
type FormStatePropsWithIndex<T extends z.ZodMiniObject> = FormStateProps<T> & {
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
type FormControlWithStateProps<F extends z.ZodMiniObject> = FormStateProps<F> & Omit<React.ComponentPropsWithRef<'form'>, 'form'>;
/**
 * The date parse result type.
 */
type DateParseResult = {
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
type RangeResult<R> = R extends number | Date ? {
  type: string;
  format: string;
  min: R | undefined;
  max: R | undefined;
} : undefined;
/**
 * Parsed result type.
 *
 * @typeParam T - form state type.
 */
type ParseResult<T extends z.ZodMiniObject> = {
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
type ParseAsObjectResult<T extends z.ZodMiniObject> = {
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
declare namespace form_schema_d_exports {
  export { advanced, array, boolean, _catch as catch, date, _default as default, describe, endsWith, everyItem, formArray, formBoolean, formDate, formNumber, formString, formValues, gt, gte, includes, infer, length, lt, lte, maxLength, maximum, minLength, minimum, negative, nonnegative, nonpositive, number, object, positive, prefault, refine, regex, regexes, someItem, startsWith, strictObject, string, superRefine, symbol, toLowerCase, toUpperCase, trim, uniqueItems, validate, validateAsync };
}
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
 * const initialData: z.infer<typeof schema> = {
 *     name: '',
 *     checked: true
 * };
 * ```
 */
type infer<T extends z.ZodMiniType> = z.infer<T>;
/**
 * Returns a Zod string schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const string: typeof z.string;
/**
 * Returns a Zod number schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const number: typeof z.number;
/**
 * Returns a Zod boolean schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const boolean: typeof z.boolean;
/**
 * Returns a Zod Date schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const date: typeof z.date;
/**
 * Returns a Zod array schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const array: typeof z.array;
/**
 * Returns a Zod object schema. Pure Zod objects should be used as parameters in the `z.form...` functions.
 */
declare const object: typeof z.object;
/**
 * Returns a Zod object schema that does not allow additional properties.
 */
declare const strictObject: typeof z.strictObject;
/**
 * Returns a Zod symbol schema for unique private properties.
 */
declare const symbol: typeof z.symbol;
/**
 * Regular expressions for common validations.
 */
declare const regexes: typeof z.core.regexes;
/**
 * Zod regular expression validation function.
 */
declare const regex: typeof z.core._regex;
/**
 * Zod minimum length validation function.
 */
declare const minLength: typeof z.core._minLength;
/**
 * Zod maximum length validation function.
 */
declare const maxLength: typeof z.core._maxLength;
/**
 * Zod  length validation function.
 */
declare const length: typeof z.core._length;
/**
 * Zod minimum value validation function.
 */
declare const minimum: typeof z.core._gte;
/**
 * Zod maximum length validation function.
 */
declare const maximum: typeof z.core._lte;
/**
 * Zod greater than validation function.
 */
declare const gt: typeof z.core._gt;
/**
 * Zod greater than or equal validation function.
 */
declare const gte: typeof z.core._gte;
/**
 * Zod less than validation function.
 */
declare const lt: typeof z.core._lt;
/**
 * Zod less than or equal validation function.
 */
declare const lte: typeof z.core._lte;
/**
 * Zod negative number validation function.
 */
declare const negative: typeof z.core._negative;
/**
 * Zod non-negative number validation function.
 */
declare const nonnegative: typeof z.core._nonnegative;
/**
 * Zod non-positive number validation function.
 */
declare const nonpositive: typeof z.core._nonpositive;
/**
 * Zod positive number validation function.
 */
declare const positive: typeof z.core._positive;
/**
 * Zod "includes" string validation function.
 */
declare const includes: typeof z.core._includes;
/**
 * Zod "starts with" string validation function.
 */
declare const startsWith: typeof z.core._startsWith;
/**
 * Zod "ends with" string validation function.
 */
declare const endsWith: typeof z.core._endsWith;
/**
 * Zod trim function.
 */
declare const trim: typeof z.core._trim;
/**
 * Zod toUpperCase function.
 */
declare const toLowerCase: typeof z.core._toLowerCase;
/**
 * Zod toUpperCase function.
 */
declare const toUpperCase: typeof z.core._toUpperCase;
/**
 * Zod describe function.
 */
declare const describe: typeof z.core.describe;
/**
 * Zod refine function.
 */
declare const refine: typeof z.refine;
/**
 * Zod superRefine function.
 */
declare const superRefine: typeof z.superRefine;
/**
 * Zod prefault value.
 */
declare const prefault: typeof z.prefault;
/**
 * Zod default value.
 */
declare const _default: typeof z._default;
/**
 * Zod catch value.
 */
declare const _catch: typeof z.catch;
/**
 * Advanced Zod methods - not recommended for direct schema use
 * because the library might not support them.
 */
declare const advanced: {
  bigint: typeof z.bigint;
  literal: typeof z.literal;
  enum: typeof z.enum;
  any: typeof z.any;
  unknown: typeof z.unknown;
  never: typeof z.never;
  void: typeof z.void;
  null: typeof z.null;
  undefined: typeof z.undefined;
  union: typeof z.union;
  discriminatedUnion: typeof z.discriminatedUnion;
  intersection: typeof z.intersection;
  tuple: typeof z.tuple;
  partialRecord: typeof z.record;
  record: typeof z.record;
  map: typeof z.map;
  set: typeof z.set;
  promise: typeof z.promise;
  function: typeof z._function;
  json: typeof z.json;
  optional: typeof z.optional;
  nonoptional: typeof z.nonoptional;
  nullable: typeof z.nullable;
  nullish: typeof z.nullish;
  catchall: typeof z.catchall;
  coerce: typeof z.coerce;
  instanceof: typeof z.instanceof;
  lazy: typeof z.lazy;
  overwrite: typeof z.core._overwrite;
  pipe: typeof z.pipe;
  transform: typeof z.transform;
};
/**
 * Zod schema for a control with a boolean value that can optionally be an empty string.
 *
 * @param options - Options for the boolean schema.
 * @param options.required - Indicates whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for boolean values.
 */
declare function formBoolean(options?: FormTypeOptions): z.ZodMiniPipe<z.ZodMiniTransform<boolean | "", unknown>, z.ZodMiniBoolean<boolean> | z.ZodMiniUnion<readonly [z.ZodMiniBoolean<boolean>, z.ZodMiniLiteral<"">]>>;
/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @returns A Zod schema with preprocessing for date values.
 */
declare function formDate(): z.ZodMiniPipe<z.ZodMiniTransform<string | Date>, z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>>;
/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param checks - Zod checks.
 * @returns A Zod schema with preprocessing for date values.
 */
declare function formDate(...checks: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[]): z.ZodMiniPipe<z.ZodMiniTransform<string | Date>, z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>>;
/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options - Options for the date schema.
 * @param options.required - Whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.dateFormat - Optional date format string (default: 'yyyy-MM-dd').
 * @param options.dateFormatError - Optional custom error for invalid dates.
 * @param checks - Optional Zod checks.
 * @returns A Zod schema with preprocessing for date values.
 */
declare function formDate(options: FormDateOptions, ...checks: readonly (z.core.CheckFn<Date> | z.core.$ZodCheck<Date>)[]): z.ZodMiniPipe<z.ZodMiniTransform<string | Date>, z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>>;
/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @returns A Zod schema with preprocessing for number values.
 */
declare function formNumber(): z.ZodMiniPipe<z.ZodMiniTransform<number | ''>, z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>>;
/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param checks - Zod checks.
 * @returns A Zod schema with preprocessing for number values.
 */
declare function formNumber(...checks: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[]): z.ZodMiniPipe<z.ZodMiniTransform<number | ''>, z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>>;
/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options - Options for the number schema.
 * @param options.required - Whether a value is required (default: `false`).
 * @param options.error - Optional custom error message for required validation.
 * @param checks - Optional Zod checks.
 * @returns A Zod schema with preprocessing for number values.
 */
declare function formNumber(options: FormTypeOptions, ...checks: readonly (z.core.CheckFn<number> | z.core.$ZodCheck<number>)[]): z.ZodMiniPipe<z.ZodMiniTransform<number | ''>, z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<''>]>>;
/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @returns A Zod string schema with required or optional validation.
 */
declare function formString(): z.ZodMiniPipe<z.ZodMiniTransform<string>, z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>>;
/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param checks - Zod checks.
 * @returns A Zod string schema with required or optional validation.
 */
declare function formString(...checks: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[]): z.ZodMiniPipe<z.ZodMiniTransform<string>, z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>>;
/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param options - Options for the string schema.
 * @param options.required - Indicates whether a value is required (default: `false`).
 * @param options.allowEmpty - Indicates whether the `toObject()` method on the `data` form state
 *                             property should keep an empty string value (default: `true`).
 * @param options.error - Optional custom error message for required validation.
 * @param options.normalize - Optional Unicode normalization form to apply to the string value
 *                            before validation (default: `undefined`).
 *
 *                            ```
 *                            // 'n' + ~ [combining tilde] (length 2) is normalized to a single 'ñ' (length 1)
 *                            z.formString({ normalize: 'NFC' }).parse('ñ'); // → 'ñ'
 *                            ```
 * @param checks - Optional Zod checks.
 * @returns A Zod string schema with required or optional validation.
 */
declare function formString(options: FormStringOptions, ...checks: readonly (z.core.CheckFn<string> | z.core.$ZodCheck<string>)[]): z.ZodMiniPipe<z.ZodMiniTransform<string>, z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<''>]>>;
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
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options: {
  required: true;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform, z.ZodMiniEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }>>;
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
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options?: {
  required?: false;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform, z.ZodMiniEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }> | z.ZodMiniLiteral<''>>;
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
declare function formArray<T extends z.ZodMiniType>(elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T, options: {
  required: false;
  minLength?: number;
  maxLength?: number;
  error?: string;
  lengthError?: string;
}): z.ZodMiniOptional<z.ZodMiniArray<T>>;
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
declare function formArray<T extends z.ZodMiniType>(elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T, options?: {
  required?: true;
  minLength?: number;
  maxLength?: number;
  error?: string;
  lengthError?: string;
}): z.ZodMiniArray<T>;
/**
 * Creates a full schema validation check.
 *
 * @param predicate - A function that accepts the current schema object instance and, on subsequent invocations,
 *                    the previous instance and the previous result. Returns a `bool` value indicating whether
 *                    the schema object passes the rule. To skip recomputation when relevant fields haven't
 *                    changed, return `prevResult` directly.
 * @param params.condition - An optional function that returns a `boolean` value indicating whether to perform
 *                           the validation based on the existing schema validation errors.
 *
 *                           Validations always run by default, unlike the `refine`/`superRefine` methods.
 * @param params.path - An optional `errors` object key to store the error message with.
 * @param params.error - An optional custom error message.
 * @returns The object schema.
 */
declare function validate<T>(predicate: (item: NoInfer<T>, prevItem: NoInfer<T> | undefined, prevResult: boolean | undefined) => boolean, params?: {
  condition?: (errors: ZodValidationError[]) => boolean;
  path?: PropertyKey[] | PropertyKey;
  error?: string;
}): z.core.$ZodCheck<T>;
/**
 * Creates a full schema validation check.
 *
 * @param predicate - A function that accepts the current schema object instance and, on subsequent invocations,
 *                    the previous instance and the previous result. Returns a `bool` value indicating whether
 *                    the schema object passes the rule.
 * @param error - A custom error message.
 * @returns The object schema.
 */
declare function validate<T>(predicate: (item: NoInfer<T>, prevItem: NoInfer<T> | undefined, prevResult: boolean | undefined) => boolean, error: string): z.core.$ZodCheck<T>;
/**
 * Creates an asynchronous full schema validation check. Must be used with `safeParseAsync` / `parseAsync`.
 *
 * @param predicate - A function that accepts the current schema object instance and, on subsequent invocations,
 *                    the previous instance and the previous result. Returns a `Promise<boolean>` indicating
 *                    whether the schema object passes the rule. To skip recomputation when relevant fields
 *                    haven't changed, return `prevResult` directly.
 * @param params.condition - An optional function that accepts the schema's errors. It returns a `bool` value
 *                           indicating whether the validation should run for the current state of the errors.
 *                           Validations always run by default, unlike the `refine`/`superRefine` methods.
 * @param params.path - An optional `errors` object key to store the error message with.
 * @param params.error - An optional custom error message.
 * @param params.debounceMs - An optional debounce interval in milliseconds. When set, rapid successive
 *                            invocations collapse: a pending timer is cancelled on each new call and a new
 *                            one is scheduled; the cancelled call resolves to the previously known result so
 *                            the surrounding `safeParseAsync` can complete. NOTE: debounce state lives in the
 *                            check's closure, so reusing the same `validateAsync` result across multiple
 *                            concurrently-mounted forms will cause them to share the timer.
 * @returns The object schema.
 */
declare function validateAsync<T>(predicate: (item: NoInfer<T>, prevItem: NoInfer<T> | undefined, prevResult: boolean | undefined) => Promise<boolean>, params?: {
  condition?: (errors: ZodValidationError[]) => boolean;
  path?: PropertyKey[] | PropertyKey;
  error?: string;
  debounceMs?: number;
}): z.core.$ZodCheck<T>;
/**
 * Creates an asynchronous full schema validation check. Must be used with `safeParseAsync` / `parseAsync`.
 *
 * @param predicate - A function that accepts the current schema object instance and, on subsequent invocations,
 *                    the previous instance and the previous result. Returns a `Promise<boolean>` indicating
 *                    whether the schema object passes the rule.
 * @param error - A custom error message.
 * @returns The object schema.
 */
declare function validateAsync<T>(predicate: (item: NoInfer<T>, prevItem: NoInfer<T> | undefined, prevResult: boolean | undefined) => Promise<boolean>, error: string): z.core.$ZodCheck<T>;
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
declare function someItem<T>(predicate: (item: NoInfer<T>, index: number, items: NoInfer<T>[]) => boolean, error?: string): z.core.$ZodCheck<T[]>;
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
declare function everyItem<T>(predicate: (item: NoInfer<T>, index: number, items: NoInfer<T>[]) => boolean, error?: string): z.core.$ZodCheck<T[]>;
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
declare function uniqueItems<T>(deepEquality?: boolean, params?: {
  mapFn?: (item: T, index: number) => unknown;
  error?: string;
  elementPath?: PropertyKey[];
  ignoreValues?: unknown[];
}): z.core.$ZodCheck<T[]>;
//#endregion
//#region src/use-form-state.d.ts
/**
 * Hook that manages form state.
 *
 * @example
 * const { formState, formStatus, formActions } = useFormState(schema, {
 *   initialData: {
 *     name: 'John',
 *     info: { age: 24 }
 *   }
 * })
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @param formOptions - Form initialization options.
 * @param formOptions.schema - Zod schema to validate the form data.
 * @param formOptions.initialData - An optional object with schema properties to set the initial data of the form.
 *                                  This object can be used for asynchronous form initialization, otherwise, specify
 *                                  the default data in the schema.
 * @param formOptions.initialTouched - An optional array of root level field names or state path expressions that
 *                                     will be marked as touched when the form is initialized.
 * @param formOptions.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                              (default: `true`).
 * @param formOptions.validateBeforeSubmit - Validate the schema before submission on "change", "touch", "replace" or
 *                                           "setError"/"clearManualErrors" form actions (default: `true`);
 * @param formOptions.validateOnMount - Validate the schema after the form mounts with the initial values (default: `false`).
 * @param formOptions.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param formOptions.validateOnTouch - Validate the form, by default, after a `touch` action (default: `true`).
 * @param formOptions.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                            function. (default: 50). A non-positive value means no debouncing of
 *                                            change callbacks is allowed.
 * @param formOptions.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param formOptions.cssOptions - Form-level defaults for `formClasses`: `prefix`
 *                                 (default `"form-state"`, or `null` to skip prefix-based
 *                                 classes) and `classNames` (a `string` or a callback that
 *                                 receives `{ isError, isTouched, isRequired, mode }` and
 *                                 returns a clsx-compatible value). Per-call
 *                                 `formClasses(field, ...)` values fully replace the
 *                                 form-level defaults for the same key.
 * @param formOptions.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param formOptions.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                            same state property (default: "|").
 * @param formOptions.confirmDirtyStateNavigation - Confirm browser navigation when the form status is dirty
 *                                                  (default: `false`).
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
declare function useFormState<T extends z.ZodMiniObject>(schema: T, formOptions?: FormInitOptions<T>): FormStateResponse<T>;
//#endregion
//#region src/form-provider.d.ts
/**
 * Context provider to manage form state.
 *
 * @typeParam T - type of the form data.
 * @param props - Provider props.
 * @returns A form state provider.
 */
declare function FormStateProvider<T extends z.ZodMiniObject>(props: Readonly<PropsWithChildren<FormProviderInitOptions<T>>>): _$react_jsx_runtime0.JSX.Element;
/**
 * Hook that manages form state inside React components that are, or have a parent component,
 * wrapped with the formConnect HOC.
 *
 * @example
 * const { formState, formStatus, formActions } = useFormStateContext(schema)
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
declare function useFormStateContext<T extends z.ZodMiniObject>(schema: T): FormStateResponse<T>;
/**
 * HOC that wraps a React component with the form state context provider and initializes the state
 * based on the provided schema.
 *
 * @example
 * function EditForm() {
 *   const { formState, formActions, Form } = useFormStateContext(schema);
 *
 *   return (
 *     <Form>
 *       <input
 *          type="text"
 *          name="name"
 *          defaultValue={formState.data.name}
 *          onChange={(event) => formActions.change('name', event.target.value, { touch: true })} />
 *     </Form>
 *   );
 * }
 *
 * export default formConnect({ schema: formSchema, watch: true })(EditForm);
 *
 * @param options - Form initialization options.
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialData - An optional object with schema properties to set the initial data of the form.
 *                              This object can be used for asynchronous form initialization, otherwise, specify
 *                              the default data in the schema.
 * @param options.initialTouched - An optional array of root level field names or state path expressions that
 *                               will be marked as touched when the form is initialized.
 * @param options.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                          (default: `true`).
 * @param options.validateBeforeSubmit - Validate the schema before submission on "change", "touch", "replace" or
 *                                       "setError"/"clearManualErrors" form actions (default: `true`);
 * @param options.validateOnMount - Validate the schema after the form mounts with the initial values (default: `false`).
 * @param options.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param options.validateOnTouch - Validate the form, by default, after a `touch` action (default: `true`).
 * @param options.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                        function. (default: 50). A non-positive value means no debouncing of
 *                                        change callbacks is allowed.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param options.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param options.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                        same state property (default: "|").
 * @param options.confirmDirtyStateNavigation - Confirm browser navigation when the form status is dirty (default: `false`).
 * @param options.cssOptions - Form-level defaults for `formClasses`.
 *
 * @returns A curried function to wrap the component.
 */
declare function formConnect<T extends z.ZodMiniObject>(options: FormProviderInitOptions<T>): <P>(Component: ComponentType<P>) => {
  (innerProps: Readonly<P>): _$react_jsx_runtime0.JSX.Element;
  displayName: string;
};
//#endregion
//#region src/helpers/state-manager.d.ts
/**
 * Creates a unique symbol instance based on UUID v4.
 *
 * @returns The symbol.
 */
declare function createSymbol(): symbol;
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
declare function getState<T extends z.ZodMiniObject, P extends FormPath<T>>(schema: T, data: z.infer<T>, nameOrPath: P): FormPathValueOrUnknown<T, P>;
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
declare function parseState<T extends z.ZodMiniObject>(schema: T, obj: object, asSchemaData: true, errorMessageSeparator?: string): ParseAsObjectResult<T>;
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
declare function parseState<T extends z.ZodMiniObject>(schema: T, obj: object, asSchemaData?: false, errorMessageSeparator?: string): ParseResult<T>;
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
declare function parseStateAsync<T extends z.ZodMiniObject>(schema: T, obj: object, asSchemaData: true, errorMessageSeparator?: string): Promise<ParseAsObjectResult<T>>;
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
declare function parseStateAsync<T extends z.ZodMiniObject>(schema: T, obj: object, asSchemaData?: false, errorMessageSeparator?: string): Promise<ParseResult<T>>;
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
declare function createState<T extends z.ZodMiniObject>(schema: T, data?: DeepPartial<z.infer<T>> | null): z.infer<T>;
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
declare function updateState<T>(state: ImmutableArray<T> | undefined, updater: (draft: T[]) => void): T[];
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
declare function updateState<T>(state: ImmutableObject<T> | undefined, updater: (draft: T) => void): T;
//#endregion
//#region src/helpers/date-formatter.d.ts
/**
 * Formats a date as a `string` in the provided date format.
 *
 * @param date - The date object.
 * @param format - The date format.
 * @throws A `TypeError` instance if the date object is not a valid `Date` instance.
 * @returns The formatted date string.
 */
declare function formatDate(date: Date, format?: FormDateFormat): string;
/**
 * Parses the provided string input containing a date in the provided format.
 *
 * @param input - The string input.
 * @param format - The date format string (default: 'yyyy-MM-dd').
 * @returns An object containing the success flag and the date object, if the
 * operation was successful.
 */
declare function safeParseDate(input: string | undefined, format?: FormDateFormat): {
  success: false;
  date: null;
} | {
  success: true;
  date: Date;
};
//#endregion
//#region src/helpers/form-builder.d.ts
/**
 * URL encodes form data name/value pairs.
 *
 * Use `formDataEncode(formData).toString()` to get a string notation of the name/value pairs.
 *
 * @param formData - The form data.
 * @param omitNames - An array of names that represent form data entries that should not be serialized.
 * @param nameFormat - Optionally renames field keys to the specified name format. Otherwise, the
 *                     `inferredNameFormat` initialization value is used (default: "bracket").
 * @returns The `URLSearchParams` instance with the form data name/value pairs.
 */
declare const formDataEncode: (formData: FormData, omitNames?: string[], nameFormat?: "bracket" | "dot") => URLSearchParams;
/**
 * Submits a form element.
 *
 * This function supports asynchronous action forms.
 *
 * @param form - The form element.
 * @param submitter - An optional submitter HTML submit button element.
 */
declare const submitForm: (form?: HTMLFormElement | null, submitter?: HTMLElement | null) => void;
//#endregion
//#region src/helpers/form-reset-blocker.d.ts
/**
 * Component props.
 */
type FormResetBlockerProps = Readonly<{
  /**
   * An optional form reference to avoid a hidden inner dev element.
   */
  formRef?: React.RefObject<HTMLFormElement | null>;
}>;
/**
 * A component to put inside a form element that has a function called from the `action` attribute
 * to avoid versions React 19.3+ from resetting the form after submitting the data.
 */
declare function FormResetBlocker({
  formRef
}: FormResetBlockerProps): _$react_jsx_runtime0.JSX.Element | null;
//#endregion
//#region src/helpers/class-helper.d.ts
/**
 * Resolves a clsx-style {@link FormClassValue} into a space-separated class name string.
 *
 * Strings are returned as-is, arrays are flattened recursively, and object keys are included
 * when their value is truthy. `false`, `null`, and `undefined` are filtered out.
 *
 * @param values - A sequence of `string`, clsx-style `object`, array of either, or falsy values.
 * @returns A `string` of space-separated class names, or an empty string if nothing resolved.
 */
declare const classNames: (...values: FormClassValue[]) => string;
//#endregion
//#region src/masked-input.d.ts
/**
 * `React.FocusEvent` augmented with a {@link MaskedFocusEvent.complete}
 * flag and an {@link MaskedFocusEvent.unmaskedValue} string carrying just
 * the user-entered characters.
 */
interface MaskedFocusEvent extends React.FocusEvent<HTMLInputElement> {
  /**
   * `true` if every required mask slot in the mask is filled. otherwise `false`.
   * Optional slots can be unfilled.
   */
  complete: boolean;
  /**
   * The user-entered characters concatenated in order, with all literals
   * and unfilled slot placeholders stripped. For mask `"(999) 999-9999"`
   * and value `"(555) 123-____"`, this is `"555123"`.
   */
  unmaskedValue: string;
}
/**
 * `React.ChangeEvent` augmented with a {@link MaskedChangeEvent.complete}
 * flag and an {@link MaskedChangeEvent.unmaskedValue} string carrying just
 * the user-entered characters.
 */
interface MaskedChangeEvent extends React.ChangeEvent<HTMLInputElement> {
  /**
   * `true` if every required slot in the mask is filled. otherwise `false`.
   * Optional slots can be unfilled.
   */
  complete: boolean;
  /**
   * The user-entered characters concatenated in order, with all literals
   * and unfilled slot placeholders stripped. For mask `"(999) 999-9999"`
   * and value `"(555) 123-____"`, this is `"555123"`.
   */
  unmaskedValue: string;
}
interface MaskedInputProps extends Omit<React.ComponentPropsWithRef<'input'>, 'onBlur' | 'onChange' | 'type' | 'value' | 'defaultValue' | 'placeholder'> {
  /**
   * Mask pattern. Tokens accept user input — `9` (digit), `a` (letter),
   * `*` (alphanumeric). `?` marks every following position as optional.
   * Any other character is a literal that is rendered as-is and skipped
   * over while typing (parentheses, dashes, slashes, dots, commas, colons,
   * spaces, ...).
   *
   * Examples: `(999) 999-9999`, `99/99/9999`, `aaa-9999`,
   * `(999) 999-9999? x99999`.
   */
  mask: string;
  /**
   * Native input type. Constrained to types compatible with the mask —
   * `text` (default) or `search` (adds the browser clear button). Other
   * types like `number`/`email`/`date` would either strip mask literals or
   * apply conflicting validation.
   */
  type?: 'text' | 'search';
  /**
   * Fill character used at unfilled slot positions when `placeholder` is
   * not supplied (or is shorter than the rendered mask). Defaults to `'_'`.
   * Use `' '` to keep the mask invisible until the user types into it
   * while still reserving the layout.
   */
  placeholderChar?: '_' | ' ';
  /**
   * Per-position fill characters shown at unfilled slots. Aligns with the
   * rendered mask (`?` markers stripped). Literal positions are ignored —
   * the mask's literal always wins. Slot positions not covered by the
   * placeholder fall back to `placeholderChar`.
   */
  placeholder?: string;
  /**
   * Controlled value — the formatted mask string with placeholder characters
   * at unfilled slots. The empty mask (e.g. `"___-____"`) and `""` are
   * equivalent and both indicate an untouched field.
   */
  value?: string;
  /**
   * Initial value for uncontrolled usage. Same format as {@link value}.
   */
  defaultValue?: string;
  /**
   * Fires when the control loses focus. The event's `target.value` is
   * the formatted mask (or `""` when no slot is filled).
   * `event.unmaskedValue` is the raw user-entered characters in order.
   * `event.complete` is `true` if all the required mask slots are
   * filled.
   */
  onBlur?: (event: MaskedFocusEvent) => void;
  /**
   * Fires on every edit. The event's `target.value` is the formatted mask
   * (or `""` when no slot is filled). `event.unmaskedValue` is the raw
   * user-entered characters in order. `event.complete` is `true` if all
   * the required mask slots are filled.
   */
  onChange?: (event: MaskedChangeEvent) => void;
}
/**
 * Masked input component. Restricts user input to a fixed pattern of slots
 * and literal characters and always renders the full mask in place.
 *
 * The `mask` prop defines the structure with token characters:
 *   - `9` matches a single digit
 *   - `a` matches a single letter
 *   - `*` matches a single alphanumeric character
 *   - `?` marks every following position as optional — they accept input
 *     but are not required for `event.complete` to be `true`
 *
 * Anything else in the mask (parentheses, dashes, slashes, dots, commas,
 * colons, spaces, ...) is treated as a literal and rendered as-is.
 *
 * The `placeholder` prop defines what is shown at unfilled slot positions.
 * If provided it must align with the rendered mask (i.e. with `?` markers
 * stripped). Literal positions in the placeholder are ignored — the mask's
 * literal character is always shown. Slot positions not covered by the
 * placeholder fall back to `placeholderChar`.
 *
 * `placeholderChar` sets the fill character used at unfilled slot positions
 * when `placeholder` is not supplied (or is shorter than the rendered mask).
 * Allowed values are `'_'` (default) and `' '` — useful when the mask should
 * stay invisible until the user types into it.
 *
 * `value`, `defaultValue`, `onBlur` and `onChange` all use the formatted
 * string with placeholder characters at unfilled slots, matching what is
 * rendered in the DOM. The `onBlur` and `onChange` event has an extra
 * `complete` boolean that is `true` when all the required mask slots are
 * filled.
 *
 * @param props - see: {@link React.InputHTMLAttributes | InputHTMLAttributes}
 *
 * Additional props:
 *   - `mask: string`
 *   - `placeholderChar?: '_' | ' '`
 *   - `placeholder?: string`
 *   - `onBlur?: (event: MaskedFocusEvent) => void`
 *   - `onChange?: (event: MaskedChangeEvent) => void`
 *
 * @returns The component instance.
 */
declare function MaskedInput({
  mask,
  type,
  placeholderChar,
  placeholder,
  inputMode,
  value,
  defaultValue,
  onBlur,
  onChange,
  onFocus,
  onClick,
  onMouseDown,
  name,
  readOnly,
  disabled,
  ref,
  ...props
}: Readonly<MaskedInputProps>): _$react_jsx_runtime0.JSX.Element;
//#endregion
//#region src/secure-input.d.ts
interface SecureInputProps extends Omit<React.ComponentPropsWithRef<'input'>, 'onChange' | 'type' | 'value' | 'defaultValue'> {
  /**
   * Visual rendering of the input. `'text'` shows the bullet mask in the
   * DOM; `'password'` lets the browser apply its own password-style mask
   * on top. Defaults to `'text'`.
   */
  type?: 'text' | 'password';
  /**
   * Controlled value — the real plaintext. Never appears in the DOM; it is
   * mirrored visually as bullets of equal length.
   */
  value?: string;
  /**
   * Initial plaintext value for uncontrolled usage.
   */
  defaultValue?: string;
  /**
   * Fires on every edit with a synthetic event whose `target.value` is the
   * masked bullet string. Use {@link onSecureChange} to receive the real
   * plaintext.
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Fires on every edit with the real plaintext value. Wire this to your
   * form state — the DOM never sees the plaintext, so neither does the
   * standard `onChange`.
   */
  onSecureChange?: (value: string) => void;
  /**
   * Fires on blur with the real plaintext value. Useful for `touch`-on-blur
   * form-state patterns where you want to mark the field touched alongside
   * the latest value.
   */
  onSecureBlur?: (value: string) => void;
}
/**
 * Secure input component that simulates a password input but does not
 * store its value inside DOM for additional security.
 *
 * `onSecureChange` and `onSecureBlur` props can be used to control the form
 * state along with `value` and `defaultValue` input props.
 *
 * @param props - see: {@link React.InputHTMLAttributes | InputHTMLAttributes}
 *
 * Additional props:
 *   - `onSecureChange?: (value) => void`
 *   - `onSecureBlur?: (value) =>  void`
 *
 * @returns The component instance.
 */
declare function SecureInput({
  type,
  defaultValue,
  value,
  onChange,
  onSecureChange,
  onSecureBlur,
  onBlur,
  name,
  readOnly,
  disabled,
  ref,
  ...props
}: Readonly<SecureInputProps>): _$react_jsx_runtime0.JSX.Element;
declare namespace value_converter_d_exports {
  export { asBoolean, asDateString, asNumber, toBoolean, toDate, toFloat, toInt, toLiteral, toString };
}
/**
 * Converts an integer in a form string notation to the `number` type.
 *
 * @param value - A stringified value.
 * @returns The converted value.
 */
declare const toInt: (value: string) => number | "";
/**
 * Converts a floating point number in a form string notation to the `number` type.
 *
 * @param value - A stringified value.
 * @returns The converted value.
 */
declare const toFloat: (value: string) => number | "";
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
declare const toDate: (value: string, options?: {
  dateFormat?: FormDateFormat;
  asUTC?: boolean;
}) => Date | "";
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
declare const toBoolean: (value: string, options?: {
  strict?: boolean;
}) => boolean | "";
/**
 * Converts literal string values in a form string notation to the literal type.
 *
 * @param value - A stringified value.
 * @param validValues - An array of available values including an empty string.
 *                      An empty array of values would cause an empty string as the
 *                      return value.
 * @returns The converted value.
 */
declare const toLiteral: <T extends string>(value: string, validValues: readonly T[]) => T | "";
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
declare const toString: (value: boolean | string | number | Date | null | undefined, options?: {
  dateFormat?: FormDateFormat;
  emptyStringAsFalse?: boolean;
}) => string;
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
declare const asBoolean: (value: boolean | "", defaultValue?: boolean) => boolean;
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
declare const asNumber: (value: number | "", defaultValue?: number) => number;
/**
 * Returns the value represented by a `Date | string` type.
 *
 * @param value - The provided value.
 * @param dateFormat - The resulting date format notation (only applied to `Date` values).
 * @return The `string` value containing the Date value.
 */
declare function asDateString(value: Date | string, dateFormat: FormDateFormat): string;
/**
 * Returns the value represented by a `Date | string` type.
 *
 * @param value - The provided value.
 * @param dateFormat - An optional date format in the form string notation (only applied to `Date` values).
 * @return The `string` value containing the Date value.
 */
declare function asDateString(value: Date | string, dateFormat?: string): string;
//#endregion
export { type DateParseResult, type DeepPartial, type ElementFocusOptions, type FormChangeArrayOptions, type FormChangeOptions, type FormClassCallback, type FormClassOptions, type FormClassState, type FormClassValue, type FormControlWithStateProps, type FormDateFormat, type FormEventType, type FormInitOptions, type FormMode, type FormPath, type FormProviderInitOptions, FormResetBlocker, type FormResetOptions, type FormState, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, type FormValidateOptions, type Immutable, type MaskedChangeEvent, type MaskedFocusEvent, MaskedInput, type SchemaDataObject, SecureInput, type StateChangeEvent, type StateChangeListener, type SubmitState, type SubmitSuccessState, type ValidationResult, classNames, value_converter_d_exports as convert, createState, createSymbol, formConnect, formDataEncode, formatDate, getState, parseState, parseStateAsync, safeParseDate, submitForm, updateState, useFormState, useFormStateContext, form_schema_d_exports as z };
//# sourceMappingURL=index.d.ts.map