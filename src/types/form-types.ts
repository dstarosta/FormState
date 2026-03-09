/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import type { SyntheticEvent } from 'react';
import type * as z from 'zod/mini';

import { FormStateError } from '../helpers/form-state-error';

// Internal types

type TypeIteration = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? PathValue<T[K], R>
      : never
    : never;

type IsUnion<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

type RangeOf<T> =
  | undefined
  | Date
  | number
  | (IsUnion<T, Date | string> extends true ? Date | string : never)
  | (IsUnion<T, number | ''> extends true ? number | '' : never);

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
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

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

export type ZodDeepType<T extends z.ZodMiniType> = T extends
  | z.ZodMiniOptional<infer U>
  | z.ZodMiniNullable<infer U>
  | z.ZodMiniDefault<infer U>
  | z.ZodMiniCatch<infer U>
  | z.ZodMiniPipe<infer U>
  | z.ZodMiniNonOptional<infer U>
  ? ZodDeepType<U extends z.ZodMiniType ? U : never>
  : T;

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

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
      options: { resetDirty: boolean; resetTouched: boolean };
    }
  | { type: 'changeInitialState' }
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
  | { type: 'setMode'; readOnly: boolean; disabled: boolean };

export type FormMutableState<T extends object> = {
  initialData: T;
  data: T;
  initialErrors: Record<keyof T, string | undefined>;
  errors: Record<keyof T, string | undefined>;
  dirty: Record<keyof T, boolean>;
  touched: Record<keyof T, boolean>;
  maxLengths: Record<keyof T, number>;
  ranges: Record<keyof T, { min: FieldRange; max: FieldRange; format: string }>;
  patterns: Record<keyof T, string | undefined>;
  descriptions: Record<keyof T, string | undefined>;
  submitCount: number;
  replaced: boolean;
  validated: boolean;
  readOnly: boolean;
  disabled: boolean;
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

// Public types

/**
 * Form event type for change listener callback functions.
 */
export type FormEventType = 'change' | 'submit';

/**
 * Callback function change listener type.
 *
 * @typeParam T - type of the form data.
 * @param type - Event type ('change' or 'submit').
 * @param data - Form state data.
 * @param errors - Form errors.
 * @param submitCount - A number indicating how many times the form has been submitted.
 */
export type ChangeListener<T extends object> = (
  type: FormEventType,
  data: FormState<T>['data'],
  errors: FormState<T>['errors'],
  submitCount: number
) => void;

/**
 * Form initialization options.
 *
 * @typeParam T - type of the form data.
 */
export type FormInitOptions<T extends z.ZodMiniObject> = {
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

export type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};

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
       * The transformed form state data into an object without empty strings for API processing
       * (see: `formState.data.toObject()`). This value is `undefined` when the form state has
       * errors.
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
      errors: Immutable<
        FormMutableState<T>['errors'] & {
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
        }
      >;
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
  data: Immutable<
    FormMutableState<T>['data'] & {
      /**
       * Transforms the form state data into an object without empty strings.
       *
       * This is useful for sending the data to JSON APIs.
       * @returns The transformed form data.
       */
      toObject: () => T;
    }
  >;
  /**
   * Errors for each field in the form.
   */
  errors: Immutable<
    FormMutableState<T>['errors'] & {
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
    }
  >;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<
    FormMutableState<T>['dirty'] & {
      /**
       * Gets the dirty state for an arbitrary string key.
       *
       * @param key - A string key.
       * @returns `true` if the key exists and is dirty, `false` otherwise.
       */
      get: (key: `#${string}`) => boolean;
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
       * @param path - Form state path expression.
       * @returns `true` if the field exists and has been touched, `false` otherwise.
       */
      get: (expression: (data: T) => unknown) => boolean;
    }
  >;
  /**
   * Optional maximum lengths for string or array fields in the form.
   */
  maxLengths: Immutable<
    FormMutableState<T>['maxLengths'] & {
      /**
       * Gets the maximum length for a nested field.
       *
       * @param path - Form state path expression.
       * @returns `number` representing the maximum length or undefined.
       */
      get: (expression: (data: T) => unknown) => number | undefined;
    }
  >;
  /**
   * Optional min/max ranges for numeric fields in the form.
   */
  ranges: Immutable<
    FormMutableState<T>['ranges'] & {
      /**
       * Gets the minimum and maximum values for a nested numeric field.
       *
       * @param path - Form state path expression.
       * @returns An object containing the `min` and the `max` properties that can be numeric, dates or `undefined`.
       */
      get: <R extends RangeOf<R>>(expression: (data: T) => R) => RangeResult<R>;
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
       * @param path - Form state path expression.
       * @returns `string` containing the regular expression pattern or `undefined`.
       */
      get: (expression: (data: T) => unknown) => string | undefined;
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
       * @param path - Form state path expression.
       * @returns `string` containing the description; no description returns an empty `string`.
       */
      get: (expression: (data: T) => unknown) => string;
    }
  >;
};

/**
 * Form status type.
 */
export type FormStatus = {
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
export type FormPath<T extends z.ZodMiniObject> =
  | keyof z.infer<T>
  | ((data: z.infer<T>) => unknown);

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
 * Options for the `formClasses` function.
 */
export type FormClassOptions = {
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
   * Indicates whether to validate the field (default: `false`).
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
export type FormSubmitHandler<T extends z.ZodMiniObject> = (
  /**
   * The submitted form state.
   */
  state: SubmitState<z.infer<T>>,
  /**
   * Form data in the `FormData` format.
   */
  formData: FormData
) => Promise<Record<string, string> | true> | Record<string, string> | true;

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
    errors: Immutable<Record<keyof z.infer<T>, string | undefined>>;
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
  formClasses: (
    nameOrPath: FormPath<T>,
    additionalClasses?: string | null,
    options?: FormClassOptions
  ) => string;
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
    change: <P extends FormPath<T>>(
      nameOrPath: P,
      value: FormPathValue<T, P>,
      options?: FormChangeOptions<T>
    ) => void;
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
   * @returns The value of the element.
   */
  useWatch: (name: string) => string | undefined;
};

/**
 * The date notation format in a string.
 */
export type FormDateFormat =
  | 'yyyy-MM-dd'
  | 'MM/dd/yyyy'
  | 'dd/MM/yyyy'
  | 'MM-dd-yyyy'
  | 'dd-MM-yyyy'
  | 'dd.MM.yyyy';

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
  ? { min: R | undefined | ''; max: R | undefined | ''; format: string }
  : undefined;

/**
 * The type for a successful state validation result.
 *
 * @typeParam T - The form schema type.
 */
export type StateValidationSuccess<T extends z.ZodMiniObject> = {
  /**
   * The data object instance, if the validation was successful.
   */
  data: z.infer<T>;
  /**
   * Indicates whether the validation was successful.
   */
  success: true;
};

/**
 * The type for a failed state validation result.
 *
 * @typeParam T - The form schema type.
 */
export type StateValidationFailure<T extends z.ZodMiniObject> = {
  /**
   * The form state error instance, if the validation was unsuccessful.
   */
  error: FormStateError<T>;
  /**
   * Indicates whether the validation was successful.
   */
  success: false;
};
