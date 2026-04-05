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
type RangeOf<T> = undefined | Date | number | (IsUnion<T, Date | string> extends true ? Date | string : never) | (IsUnion<T, number | ''> extends true ? number | '' : never);
type ImmutablePrimitive = undefined | null | boolean | string | number | symbol | Date | Error | Function | RegExp | Promise<unknown>;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
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
  maxLengths: Record<keyof T, number>;
  ranges: Record<keyof T, {
    min: FieldRange;
    max: FieldRange;
    format: string;
  }>;
  patterns: Record<keyof T, string | undefined>;
  descriptions: Record<keyof T, string | undefined>;
  submitCount: number;
  changed: boolean;
  replaced: boolean;
  validated: boolean;
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
} | {
  required?: boolean;
  allowEmpty: boolean;
  error?: string;
} | {
  required?: boolean;
  allowEmpty?: boolean;
  error: string;
};
type FormPathValueOrUnknown<T extends z.ZodMiniObject, P> = P extends FormPath<T> ? FormPathValue<T, P> : unknown;
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
   * Zod path as a string.
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
   * Validate the schema, by default, after a `touch` action  (default: `false`).
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
   * Form CSS class prefix (default: "form-state").
   *
   * CSS class example: "form-state__touched"
   */
  CSSPrefix?: string;
  /**
   * Sets the default format for the `inferName` function (default: "bracket").
   */
  inferredNameFormat?: 'bracket' | 'dot';
  /**
   * Sets the default error message separator when multiple errors occur for the
   * same state property (default: "|").
   */
  errorMessageSeparator?: string;
};
type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};
/**
 * Type of schema data with stripped empty literals from union types.
 */
type SchemaDataObject<T> = T extends ImmutablePrimitive ? ReplaceEmptyWithUndefined<T> : T extends unknown[] ? T extends (infer Item)[] ? SchemaDataObject<ReplaceEmptyWithUndefined<Item>>[] : T : Flatten<{ [K in keyof T as T[K] extends object ? K : ReplaceEmptyWithUndefined<T[K]> extends never ? never : undefined extends ReplaceEmptyWithUndefined<T[K]> ? never : K]: T[K] extends object ? SchemaDataObject<T[K]> : ReplaceEmptyWithUndefined<T[K]> } & { [K in keyof T as T[K] extends object ? never : ReplaceEmptyWithUndefined<T[K]> extends never ? never : undefined extends ReplaceEmptyWithUndefined<T[K]> ? K : never]?: ReplaceEmptyWithUndefined<T[K]> }>;
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
     * Gets a manual error message with an arbitrary string key.
     *
     * @param key - Manual error key.
     * @returns Error message for the specified key, or `undefined` if there is no error.
     */
    getManual: (key: string) => string | undefined;
    /**
     * Gets an array of all error messages.
     */
    getAll: () => string[];
  }>;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<FormMutableState<T>['dirty'] & {
    /**
     * Gets the dirty state for an arbitrary string key.
     *
     * @example
     * formState.dirty.get("#myError")
     *
     * @param key - A string key. The key must start with the `#` character
     *              to avoid key collisions.
     * @returns `true` if the key exists and is dirty, `false` otherwise.
     */
    get: (key: `#${string}`) => boolean;
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
  }>;
  /**
   * Optional maximum lengths for string or array fields in the form.
   */
  maxLengths: Immutable<FormMutableState<T>['maxLengths'] & {
    /**
     * Gets the maximum length for a nested field.
     *
     * @example
     * <input type="text" name="companyName" maxLength={formState.maxLengths.get((path) => path.company.name)} />
     *
     * @param path - Form state path expression.
     * @returns `number` representing the maximum length or undefined.
     */
    get: (expression: (data: T) => unknown) => number | undefined;
  }>;
  /**
   * Optional min/max ranges for numeric fields in the form.
   */
  ranges: Immutable<FormMutableState<T>['ranges'] & {
    /**
     * Gets the minimum and maximum values for a nested numeric field.
     *
     * @example
     * const { min, max } = formState.ranges.get((path) => path.info.birthDate) ?? {}
     *
     * @param path - Form state path expression.
     * @returns An object containing the `min` and the `max` properties that can be numeric, dates or `undefined`.
     */
    get: <R extends RangeOf<R>>(expression: (data: T) => R) => RangeResult<R>;
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
 * Options for the `formClasses` function.
 */
type FormClassOptions = {
  /**
   * A custom CSS class prefix for the form. The default prefix is `form-state`.
   *
   * CSS classes that are generated based on the form state:
   *
   * - `[prefix]__error` (form-state__error)
   * - `[prefix]__touched` (form-state__touched)
   */
  prefix?: string;
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
   * Indicates whether to validate the field (default: `false`).
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

formData: FormData) => Promise<Record<string, string> | true> | Record<string, string> | true;
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
     * Resets the form to its initial state.
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
      (onValidate?: () => Record<string, string> | true, options?: FormValidateOptions<T>): void;
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
     * Marks the form as dirty with an arbitrary string key.
     *
     * @param key - Arbitrary string independent of the managed form state. It must start with the `#` sign to avoid collisions.
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
     * @param keyOrPath - Arbitrary string or a state path expression.
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
  };
  /**
   * Returns the form CSS classes for the control with the provided path.
   *
   * @typeParam T - form state type.
   * @param nameOrPath - Root level field name or a state path expression.
   * @param additionalClasses - Optional string containing additional CSS classes for the control.
   * @param options - Options for form CSS classes.
   * @returns A `string` containing the form and the additional CSS class names.
   */
  formClasses: (nameOrPath: FormPath<T>, additionalClasses?: string | null, options?: FormClassOptions) => string;
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
 * The date notation format in a string.
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
  min: R | undefined | '';
  max: R | undefined | '';
  format: string;
} : undefined;
declare namespace form_schema_d_exports {
  export { advanced, array, boolean, _catch as catch, date, _default as default, describe, endsWith, everyItem, formArray, formBoolean, formDate, formNumber, formString, formValues, gt, gte, includes, infer, length, lt, lte, maxLength, maximum, minLength, minimum, negative, nonnegative, nonpositive, number, object, positive, prefault, refine, regex, regexes, someItem, startsWith, strictObject, string, superRefine, symbol, toLowerCase, toUpperCase, trim, uniqueItems, validate };
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
 * @param options.checks - Optional Zod checks.
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
 * @param options.checks - Zod checks.
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
 * @param options.checks - Optional Zod checks.
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
 * @param options.checks - Zod checks.
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
 * @param options.checks - Optional Zod checks.
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
 * @param options.checks - Zod checks.
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
 * @param options.checks - Optional Zod checks.
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
declare function validate<T>(predicate: (item: NoInfer<T>) => boolean, params?: {
  condition?: (errors: ZodValidationError[]) => boolean;
  path?: PropertyKey[] | PropertyKey;
  error?: string;
}): z.core.$ZodCheck<T>;
/**
 * Creates a full schema validation check.
 *
 * @param predicate - A function that accepts a schema object instance. It returns a `bool` value indicating
 *                    whether the schema object passes the rule.
 * @param error - A custom error message.
 * @returns The object schema.
 */
declare function validate<T>(predicate: (item: NoInfer<T>) => boolean, error: string): z.core.$ZodCheck<T>;
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
 * @param formOptions.validateOnTouch - Validate the form, by default, after a `touch` action (default: `false`).
 * @param formOptions.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                            function. (default: 50). A non-positive value means no debouncing of
 *                                            change callbacks is allowed.
 * @param formOptions.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param formOptions.CSSPrefix - Form CSS class prefix (default: "form-state").
 * @param formOptions.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param formOptions.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                            same state property (default: "|").
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
 * @param options.validateOnTouch - Validate the form, by default, after a `touch` action (default: `false`).
 * @param options.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                        function. (default: 50). A non-positive value means no debouncing of
 *                                        change callbacks is allowed.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param options.CSSPrefix - Form CSS class prefix (default: "form-state").
 * @param options.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param options.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                        same state property (default: "|").
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
 * Parses an arbitrary object into the form state.
 *
 * @example
 * const { success, data, errors } = parseState(schema, obj)
 *
 * @param schema - The form schema.
 * @param obj - Data object to parse.
 * @param errorMessageSeparator - Sets the default error message separator when multiple errors occur
 *                                for the same state property (default: "|").
 * @return An object containing parsed data and an optional errors instance.
 *
 *         The `success` property indicates whether any errors have been found.
 *
 *         The `data` instance may cause form errors if the operation was not
 *         successful.
 */
declare const parseState: <T extends z.ZodMiniObject>(schema: T, obj: object, errorMessageSeparator?: string) => {
  data: z.core.output<T>;
  success: boolean;
  errors: (Record<"" | keyof z.core.output<T>, string | undefined> & {
    get: (expression: (data: z.infer<T>) => unknown) => string | undefined;
    getAll: () => string[];
  }) | undefined;
};
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
 * @returns The `URLSearchParams` instance with the form data name/value pairs.
 */
declare const formDataEncode: (formData: FormData, omitNames?: string[]) => URLSearchParams;
/**
 * Submits a form element.
 *
 * This function supports asynchronous action forms.
 *
 * @param form - The form element.
 * @param submitter - An optional submitter HTML submit button element.
 */
declare const submitForm: (form?: HTMLFormElement | null, submitter?: HTMLElement | null) => void;
declare namespace value_converter_d_exports {
  export { toBoolean, toDate, toFloat, toInt, toLiteral, toString };
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
declare const toLiteral: <T extends string>(value: string, validValues: readonly T[]) => T;
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
//#endregion
export { type DateParseResult, type DeepPartial, type FormChangeOptions, type FormControlWithStateProps, type FormDateFormat, type FormEventType, type FormMode, type FormPath, type FormResetOptions, type FormState, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, type Immutable, type SchemaDataObject, type StateChangeEvent, type StateChangeListener, type SubmitState, type SubmitSuccessState, value_converter_d_exports as convert, createState, createSymbol, formConnect, formDataEncode, formatDate, getState, parseState, safeParseDate, submitForm, updateState, useFormState, useFormStateContext, form_schema_d_exports as z };
//# sourceMappingURL=index.d.ts.map