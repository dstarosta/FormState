import * as z from "zod/mini";
import { ComponentType, PropsWithChildren, SyntheticEvent } from "react";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region \0rolldown/runtime.js
//#endregion
//#region src/helpers/form-state-error.d.ts
/**
 * Form state error containing Zod errors.
 *
 * @typeParam T - The form schema type.
 */
declare class FormStateError<T extends object> extends Error {
  readonly errors: Partial<Record<keyof T, string>>;
  /**
   * Initializes a new instance of the `FormStateError` class.
   *
   * @param message - The Zod error message in a pretty format.
   * @param errors - The object containing form error messages.
   */
  constructor(message: string, errors?: Partial<Record<keyof T, string>>);
}
//#endregion
//#region src/types/form-types.d.ts
type PathValue<T, P extends string> = P extends keyof T ? T[P] : P extends `${infer K}.${infer R}` ? K extends keyof T ? PathValue<T[K], R> : never : never;
type IsUnion<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type RangeOf<T> = undefined | Date | number | (IsUnion<T, Date | string> extends true ? Date | string : never) | (IsUnion<T, number | ''> extends true ? number | '' : never);
type ImmutablePrimitive = undefined | null | boolean | string | number | symbol | Date | Error | Function | RegExp | Promise<unknown>;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
type Immutable<T> = T extends ImmutablePrimitive ? T : T extends Array<infer U> ? ImmutableArray<U> : T extends Map<infer K, infer V> ? ImmutableMap<K, V> : T extends Set<infer M> ? ImmutableSet<M> : T extends object ? ImmutableObject<T> : T;
type ZodDeepType<T extends z.ZodMiniType> = T extends z.ZodMiniOptional<infer U> | z.ZodMiniNullable<infer U> | z.ZodMiniDefault<infer U> | z.ZodMiniCatch<infer U> | z.ZodMiniPipe<infer U> | z.ZodMiniNonOptional<infer U> ? ZodDeepType<U extends z.ZodMiniType ? U : never> : T;
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
type FieldRange = number | Date | undefined;
type FormMutableState<T extends object> = {
  initialData: T;
  data: T;
  initialErrors: Record<keyof T | '', string | undefined>;
  errors: Record<keyof T | '', string | undefined>;
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
  replaced: boolean;
  validated: boolean;
  readOnly: boolean;
  disabled: boolean;
};
/**
 * Form event type for change listener callback functions.
 */
type FormEventType = 'change' | 'submit';
/**
 * Callback function change listener type.
 *
 * @typeParam T - type of the form data.
 * @param type - Event type ('change' or 'submit').
 * @param data - Form state data.
 * @param errors - Form errors.
 * @param submitCount - A number indicating how many times the form has been submitted.
 */
type ChangeListener<T extends object> = (type: FormEventType, data: FormState<T>['data'], errors: FormState<T>['errors'], submitCount: number) => void;
/**
 * Form initialization options.
 *
 * @typeParam T - type of the form data.
 */
type FormInitOptions<T extends z.ZodMiniObject> = {
  /**
   * An optional object with schema properties to set the initial state of the form.
   * This object should be used for asynchronous form initialization, otherwise, specify
   * the initial state in the schema.
   * Non-dirty form state values will reflect reactive changes to the initial state.
   */
  initialState?: DeepPartial<z.infer<T>> | undefined;
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
   * Validate the schema with the initial values (default: `false`).
   */
  validateOnInit?: boolean;
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
};
type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};
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
   * The transformed form state data into an object without empty strings for API processing
   * (see: `formState.data.toObject()`). This value is `undefined` when the form state has
   * errors.
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
  errors: Immutable<FormMutableState<T>['errors'] & {
    /**
     * Gets an error message for a nested field.
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
  }>;
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
  data: Immutable<FormMutableState<T>['data'] & {
    /**
     * Transforms the form state data into an object without empty strings.
     *
     * This is useful for sending the data to JSON APIs.
     * @returns The transformed form data.
     */
    toObject: () => T;
  }>;
  /**
   * Errors for each field in the form.
   */
  errors: Immutable<FormMutableState<T>['errors'] & {
    /**
     * Gets an error message for a nested field.
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
  }>;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<FormMutableState<T>['dirty'] & {
    /**
     * Gets the dirty state for an arbitrary string key.
     *
     * @param key - A string key.
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
  /**
   * Whether the form is marked as read-only.
   */
  readonly readOnly: boolean;
  /**
   * Whether the form is marked as disabled.
   */
  readonly disabled: boolean;
};
/**
 * A form path that can be a field name or a state path expression.
 *
 * @typeParam T - form state type.
 */
type FormPath<T extends z.ZodMiniObject> = keyof z.infer<T> | ((data: z.infer<T>) => unknown);
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
  classPrefix?: string;
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
   * @param data - Strongly typed submitted form data.
   * @param formData - Submitted form data as a `FormData` instance.
   */
  onSuccess?: ((data: z.infer<T>, formData: FormData) => void) | undefined;
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
   * Form actions.
   */
  formActions: {
    /**
     * Performs form field changes.
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
     * @typeParam T - form state type.
     * @param nameOrPath - Root level field name or a state path expression.
     *                     The first field in the schema is touched if the path is not provided.
     * @param options - Options for the touch event.
     */
    touch: (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => void;
    /**
     * Validates the form and, optionally, sets its status as submitted when there are no form state errors.
     *
     * @param options - Options for form validation.
     */
    validate: (options?: FormValidateOptions<T>) => void;
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
     * Infers the name of a specified form field. The value can be used in HTML element's "name" attribute as well as
     * the argument in the `useWatch` hook.
     *
     * @param nameOrPath - Root level field name or a state path expression.
     * @returns The inferred name.
     */
    inferName: (nameOrPath: FormPath<T>) => string;
  };
  /**
   * Form handler functions.
   */
  formHandlers: {
    /**
     * A function to call in the `action` attribute of a `<Form />` component to submit the form.
     *
     * @param onSubmit - A callback function to execute before submitting the form.
     *
     * Callback return value: `false` - do not submit the form even if the form state has no errors.
     * `true` - submit the form if there are no errors.
     * `void` - no return value is treated as `true`.
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
   * The Form component with pre-wired reset logic.
   *
   * Native form validation has been disabled and Enter handling modified
   * for consistency.
   *
   * @param props - `form` HTML element props.
   * @returns `Form` React element.
   */
  Form: (props: React.ComponentPropsWithRef<'form'>) => React.JSX.Element;
  /**
   * Subscribes to form state changes.
   *
   * @typeParam T - form state type.
   * @param listener - A callback function with form state `data` and `errors` parameters.
   * @returns An `unsubscribe()` function to stop the subscription.
   */
  subscribe: (listener: ChangeListener<z.infer<T>>) => () => void;
  /**
   * A hook that watches a field based on the element's `name` HTML attribute.
   *
   * Note: The `Form` component from this library must be used to track changes.
   *
   * The following HTML form elements are supported.
   *  - input
   *  - textarea
   *
   * @param name - A `name` HTML attribute value of the element to watch.
   * @param compute - An optional compute function to transform the value.
   * @returns The value of the element.
   */
  useWatch: (name: string, compute?: (value: string) => string) => string;
};
/**
 * The date notation format in a string.
 */
type FormDateFormat = 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'MM-dd-yyyy' | 'dd-MM-yyyy' | 'dd.MM.yyyy';
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
  export { advanced, array, boolean, _catch as catch, date, _default as default, describe, endsWith, everyItem, formArray, formBoolean, formDate, formNumber, formString, formValues, gt, gte, includes, infer, length, lt, lte, maxLength, maximum, minLength, minimum, negative, nonnegative, nonpositive, number, object, positive, prefault, refine, regex, regexes, someItem, sortItems, startsWith, strictObject, string, superRefine, symbol, toLowerCase, toUpperCase, trim, uniqueItems, validate };
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
 * const initialState: z.infer<typeof schema> = {
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
 * @param zodBoolean - The Zod boolean schema.
 * @param options - Options for the boolean schema.
 * @param options.required - Indicates whether a value is required (default: false).
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for boolean values.
 */
declare function formBoolean(zodBoolean: ZodDeepType<z.ZodMiniBoolean<boolean>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<boolean | "", unknown>, z.ZodMiniBoolean<boolean> | z.ZodMiniUnion<readonly [z.ZodMiniBoolean<boolean>, z.ZodMiniLiteral<"">]>>;
/**
 * Zod schema for a control with a date value that can optionally be an empty string.
 *
 * @param zodDate - The Zod date schema.
 * @param options - Options for the date schema.
 * @param options.required - Whether a value is required (default: false).
 * @param options.error - Optional custom error message for required validation.
 * @param options.dateFormat - Optional date format string (default: 'yyyy-MM-dd').
 * @param options.dateFormatError - Optional custom error for invalid dates.
 * @returns A Zod schema with preprocessing for date values.
 */
declare function formDate(zodDate: ZodDeepType<z.ZodMiniDate<Date>>, options?: {
  required?: boolean;
  error?: string;
  dateFormat?: FormDateFormat;
  dateFormatError?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<string | Date, unknown>, z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>>;
/**
 * Zod schema for a control with a numeric value that can optionally be an empty string.
 *
 * @param zodNumber - The Zod number schema.
 * @param options - Options for the number schema.
 * @param options.required - Whether a value is required (default: false).
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod schema with preprocessing for number values.
 */
declare function formNumber(zodNumber: ZodDeepType<z.ZodMiniNumber<number>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<number | "", unknown>, z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<"">]>>;
/**
 * Zod schema for a control with a string value that can optionally be empty.
 *
 * @param zodString - The Zod string schema.
 * @param options - Options for the string schema.
 * @param options.required - Whether a value is required (default: false).
 * @param options.error - Optional custom error message for required validation.
 * @returns A Zod string schema with required or optional validation.
 */
declare function formString(zodString: ZodDeepType<z.ZodMiniString<string>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<string, unknown>, z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<"">]>>;
/**
 * Zod schema for a control with a limited number of literal string values.
 *
 * @typeParam T - Represents a generic tuple of strings for type inference.
 * @param values - An array of the string values. At least 1 non-empty value is required.
 * @param options - Options for the values schema.
 * @param options.required - Whether a non-empty value is required (default: false).
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
 * @param options.required - Whether a non-empty value is required (default: false).
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
 * @param params.path - An optional `errors` object key to store the error message with.
 * @param params.error - An optional custom error message.
 * @returns The object schema.
 */
declare function validate<T>(predicate: (item: NoInfer<T>) => boolean, params?: {
  path?: PropertyKey[] | PropertyKey;
  error?: string;
}): z.core.$ZodCheck<T>;
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
 * @param params.mapFn - An optional mapping function to compare properties of items.
 * @param params.error - An optional custom error message.
 * @returns A Zod check that can be passed to `.check()`.
 */
declare function uniqueItems<T>(deepEquality?: boolean, params?: {
  mapFn?: (item: T) => unknown;
  error?: string;
}): z.core.$ZodCheck<T[]>;
/**
 * Sorts items in the array schema.
 *
 * @typeParam T - The array item Zod type.
 * @param arraySchema - The array schema.
 * @param compareFn - Function used to determine the order of the elements. It is expected to return a negative
 *                    value if the first argument is less than the second argument, zero if they're equal, and
 *                    a positive value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code
 *                    unit order.
 * @returns Zod pipe instance that transforms the array schema.
 */
declare function sortItems<T extends z.ZodMiniType>(arraySchema: z.ZodMiniArray<T>, compareFn?: (a: z.infer<T>, b: z.infer<T>) => number): z.ZodMiniPipe<z.ZodMiniArray<T>, z.ZodMiniTransform<z.core.output<T>[], z.core.output<T>[]>>;
//#endregion
//#region src/use-form-state.d.ts
/**
 * Hook that manages form state.
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @param formOptions - Form initialization options.
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
declare function FormStateProvider<T extends z.ZodMiniObject>(props: Readonly<PropsWithChildren<FormProviderInitOptions<T>>>): react_jsx_runtime0.JSX.Element;
/**
 * Hook that manages form state inside React components that are, or have a parent component,
 * wrapped with the formConnect HOC.
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
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialState - An optional object with schema properties to set the initial state of the form.
 *                               This object should be used for asynchronous form initialization, otherwise, specify
 *                               the initial state in the schema.
 * @param options.initialTouched - An optional array of root level field names or state path expressions that
 *                               will be marked as touched when the form is initialized.
 * @param options.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                          (default: `true`).
 * @param options.validateOnInit - Validate the schema with the initial values (default: `false`).
 * @param options.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param options.validateOnTouch - Validate the form, by default, after a `touch` action (default: `false`).
 * @param options.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                        function. (default: 50). A non-positive value means no debouncing of
 *                                        change callbacks is allowed.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param options.CSSPrefix - Form CSS class prefix (default: "form-state").
 *
 * @returns A curried function to wrap the component.
 */
declare function formConnect<T extends z.ZodMiniObject>(options: FormProviderInitOptions<T>): <P>(Component: ComponentType<P>) => {
  (innerProps: Readonly<P>): react_jsx_runtime0.JSX.Element;
  displayName: string;
};
//#endregion
//#region src/helpers/state-manager.d.ts
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
declare function createState<T extends z.ZodMiniObject>(schema: T): z.infer<T>;
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
declare function createInitialState<T extends z.ZodMiniObject>(schema: T, data: DeepPartial<z.infer<T>> | null | undefined): z.core.output<T>;
/**
 * Gets strongly typed child data or field value based on the provided name or path.
 *
 * @typeParam T - schema type.
 * @param schema - The form schema.
 * @param data - The strongly typed state data.
 * @returns The child data or the field value that is assigned to the provided name or path.
 */
declare function getState<T extends z.ZodMiniObject, P extends FormPath<T>>(schema: T, data: z.infer<T>, nameOrPath: P): FormPathValue<T, P> | undefined;
/**
 * Updates an immutable array state in a nested schema.
 *
 * @typeParam T - schema type.
 * @param state - The state array property.
 * @param updater - The updater function.
 * @returns A new array containing the modified state.
 */
declare function updateState<T>(state: ImmutableArray<T> | undefined, updater: (draft: T[]) => void): T[];
/**
 * Updates an object state in a nested schema.
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
declare function safeParseDate(input: string | undefined, format?: FormDateFormat): DateParseResult;
//#endregion
//#region src/helpers/error-formatter.d.ts
/**
 * Validates whether the data is valid for the schema used by the form state.
 *
 * @param schema - The form schema.
 * @param data - The data object instance.
 * @param populateDefaults - Indicates whether to populate defaults values for uninitialized fields
 *                           such as empty strings for optional fields and symbols for strong IDs.
 *                           Those values would have been populated by the form state initializer
 *                           automatically and do not result in errors.
 * @returns The object containing the validation result as well as the validated data object
 *          instance or the form state error.
 */
declare const validateState: <T extends z.ZodMiniObject>(schema: T, data: DeepPartial<z.infer<T>>, populateDefaults?: boolean) => {
  error: FormStateError<T>;
  success: false;
  data?: never;
} | {
  data: z.core.output<T>;
  success: true;
  error?: never;
};
//#endregion
//#region src/helpers/form-builder.d.ts
/**
 * Converts form data name/value pairs into the URL search parameters.
 *
 * Use `formDataToURL(formData).toString()` to get a string notation of the name/value pairs.
 *
 * @param formData - The form data.
 * @returns The `URLSearchParams` instance with the form data name/value pairs.
 */
declare const formDataToURL: (formData: FormData) => URLSearchParams;
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
export { type ChangeListener, type DateParseResult, type DeepPartial, type FormChangeOptions, type FormControlWithStateProps, type FormDateFormat, type FormEventType, type FormMode, type FormPath, type FormResetOptions, type FormState, FormStateError, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, type SubmitState, value_converter_d_exports as convert, createInitialState, createState, formConnect, formDataToURL, formatDate, getState, safeParseDate, submitForm, updateState, useFormState, useFormStateContext, validateState, form_schema_d_exports as z };
//# sourceMappingURL=index.d.ts.map