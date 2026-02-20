/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import type { SyntheticEvent } from 'react';
import type z from 'zod/v4';

import { FormStateError } from './helpers/form-state-error';

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

export type ZodDeepType<T extends z.ZodType> = T extends
  | z.ZodOptional<infer U>
  | z.ZodNullable<infer U>
  | z.ZodDefault<infer U>
  | z.ZodCatch<infer U>
  | z.ZodPipe<infer U>
  | z.ZodNonOptional<infer U>
  ? ZodDeepType<U extends z.ZodType ? U : never>
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
      options: { retainData: boolean; resetTouched: boolean; resetSubmitted: boolean };
    }
  | {
      type: 'resetFields';
      names: (keyof T)[];
      options: { retainData: boolean; resetTouched: boolean; resetSubmitted: boolean };
    }
  | {
      type: 'submit';
      options: { resetDirty: boolean; resetTouched: boolean };
    }
  | { type: 'changeInitialState' }
  | { type: 'setDirty'; name: string; dirty: boolean }
  | { type: 'setManualError'; name: keyof T | FormStatePath<T>; error: string | null }
  | { type: 'clearManualErrors' }
  | { type: 'validate' };

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
  validated: boolean;
  submitted: boolean;
};

export type StateCallback<T extends object> = (state: FormState<T>, status: FormStatus) => void;

export type ManualErrorState = {
  get: () => Immutable<Record<string, string>>;
  set: (value?: Readonly<Record<string, string>>) => void;
};

// Public types

/**
 * Form initialization options.
 *
 * @typeParam T type of the form data.
 */
export type FormOptions<T extends z.ZodObject> = {
  /**
   * An optional object with schema properties to set the initial state of the form.
   * This object should be used for asynchronous form initialization, otherwise, specify
   * the initial state in the schema.
   * Non-dirty form state values will reflect reactive changes to the initial state.
   */
  initialState?: DeepPartial<z.infer<T>> | undefined;
  /**
   * An optional array of root level field names or a state path expressions that
   * will be marked as touched when the form is initialized.
   */
  initialTouched?: FormPath<T>[];
  /**
   * Validate the schema with the initial values (default: false).
   */
  validateOnInit?: boolean;
  /**
   * Sets the capacity of the debounce callback cache used by the "change"
   * function. (default: 50).
   * A non-positive value means no debouncing of change callbacks is allowed.
   * A smaller value saves memory but can cause issues with debounced change
   * callbacks.
   */
  debounceCacheCapacity?: number;
};

/**
 * Form state on submission.
 *
 * @typeParam T type of the form data.
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
           * @param path - a form state path expression.
           * @returns the error message for the specified field, or `undefined` if there is no error.
           */
          get: (expression: (data: T) => unknown) => string | undefined;
          /**
           * Gets a manual error message with an arbitrary string key.
           *
           * @param key - a manual error key.
           * @returns the error message for the specified key, or `undefined` if there is no error.
           */
          getManual: (key: string) => string | undefined;
        }
      >;
    };

/**
 * Form state type made immutable and extended with the `get(expression)` functions.
 *
 * @typeParam T type of the form data.
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
       * @param path - a form state path expression.
       * @returns the error message for the specified field, or `undefined` if there is no error.
       */
      get: (expression: (data: T) => unknown) => string | undefined;
      /**
       * Gets a manual error message with an arbitrary string key.
       *
       * @param key - a manual error key.
       * @returns the error message for the specified key, or `undefined` if there is no error.
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
       * Gets the touched state for an arbitrary string key.
       *
       * @param key - a string key.
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
       * @param path - a form state path expression.
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
       * @param path - a form state path expression.
       * @returns a number representing the maximum length or undefined.
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
       * @param path - a form state path expression.
       * @returns an object containing the `min` and the `max` properties that can be numeric, dates or `undefined`.
       */
      get: <R extends RangeOf<R>>(expression: (data: T) => R) => RangeResult<R>;
    }
  >;
  /**
   * Optional field descriptions in the form.
   */
  patterns: Immutable<
    FormMutableState<T>['patterns'] & {
      /**
       * Gets the regular expression pattern for a nested field.
       *
       * @param path - a form state path expression.
       * @returns a string containing the regular expression pattern or `undefined`.
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
       * @param path - a form state path expression.
       * @returns a string containing the description; no description returns an empty `string`.
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
   * Whether the form has been submitted (initially or after the last form reset).
   */
  readonly submitted: boolean;
};

/**
 * A form path that can be a field name or a state path expression.
 *
 * @typeparam T form state type.
 */
export type FormPath<T extends z.ZodObject> = keyof z.infer<T> | ((data: z.infer<T>) => unknown);

/**
 * Helper type to resolve the value type from a FormPath.
 *
 * @typeparam T form state type.
 * @typeparam P the form path (either a key or a function expression).
 */
export type FormPathValue<T extends z.ZodObject, P extends FormPath<T>> = P extends (
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
   * Indicates that the control data is being fetched to prevent applying the error classes
   * to lazy loaded controls.
   */
  isLoading?: boolean;
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
 * @typeparam T form state type.
 */
export type FormChangeOptions<T extends z.ZodObject> = {
  /**
   * Indicates whether to mark field as touched (default: false).
   */
  touch?: boolean;
  /**
   * Indicates whether to validate the field (default: true).
   */
  validate?: boolean;
  /**
   * An optional callback to run after the form state has been changed.
   *
   * @param state - the updated form state - data, errors, touched and dirty flags.
   * @param status - the updated form status.
   */
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
  /**
   * An optional debounce interval in milliseconds for the provided `callback` parameter.
   *
   * It is useful for making API calls on state change.
   */
  callbackInterval?: number;
};

/**
 * Form data replace options.
 */
export type FormReplaceOptions = {
  /**
   * Indicates whether to validate the field (default: false).
   */
  validate?: boolean;
};

/**
 * Form touch options.
 */
export type FormTouchOptions = {
  /**
   * Indicates whether to validate the field (default: false).
   */
  validate?: boolean;
};

/**
 * Form reset options.
 *
 * @typeparam T form state type.
 */
export type FormResetOptions<T extends z.ZodObject> = {
  /**
   * An optional array of root level field names to reset. If not provided, all fields will be reset.
   */
  names?: (keyof z.infer<T>)[];
  /**
   * Indicates whether to retain the current field values (default: false).
   */
  retainData?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields (default: `true` if the whole form is
   * being submitted, `false` if a list of names is provided.).
   */
  resetTouched?: boolean;
  /**
   * Indicates whether to reset the submitted state of the fields (default: false).
   */
  resetSubmitted?: boolean;
};

/**
 * Form validation options.
 *
 * @typeparam T form state type.
 */
export type FormValidateOptions<T extends z.ZodObject> = {
  /**
   * Indicates whether to reset the dirty state of the fields (default: true).
   */
  resetDirty?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields (default: true).
   */
  resetTouched?: boolean;
  /**
   * Indicates whether to validate the form if its state is valid.
   */
  submit?: boolean;
  /**
   * An optional callback to run after the form state has been changed.
   *
   * @param state - the updated form state - data, errors, touched and dirty flags.
   * @param status - the updated form status.
   */
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};

/**
 * Form submission options.
 */
export type FormSubmitOptions = {
  /**
   * Indicates whether to reset the dirty state of the fields (default: true).
   */
  resetDirty?: boolean;
  /**
   * Indicates whether to reset the touched state of the fields (default: true).
   */
  resetTouched?: boolean;
};

/**
 * Form submission hander callback.
 */
export type FormSubmitHandler<T extends z.ZodObject> = (
  /**
   * The submitted form state.
   */
  state: SubmitState<z.infer<T>>,
  /**
   * Form data in the <c>FormData</c> format.
   */
  formData: FormData
) => Promise<boolean | void> | boolean | void;

/**
 * The form state response type.
 *
 * @typeparam T form state type.
 */
export type FormStateResponse<T extends z.ZodObject> = {
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
  /***
   * Returns the form CSS classes for the control with the provided path.
   *
   * @typeparam T form state type.
   * @param nameOrPath - a root level field name or a state path expression.
   * @param additionalClasses - an optional string containing additional CSS classes for the control.
   * @param isLoading - indicates that the control data is being fetched to prevent applying the error class.
   * @returns a string containing the form and the additional CSS class names.
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
     * @typeparam T form state type.
     * @typeparam P the form path type.
     * @param nameOrPath - a root level field name or a state path expression.
     * @param value - the new value for the field (typed based on the path).
     * @param options - options for the change event.
     */
    change: <P extends FormPath<T>>(
      nameOrPath: P,
      value: FormPathValue<T, P>,
      options?: FormChangeOptions<T>
    ) => void;
    /**
     * Performs data replacement in the form state.
     *
     * @typeparam T form state type.
     * @param data - the replacement data.
     * @param options - options for the replace event.
     */
    replace: (data: DeepPartial<z.infer<T>>, options?: FormReplaceOptions) => void;
    /**
     * Resets the form to its initial state.
     *
     * @typeparam T form state type.
     * @param options - options for reset event.
     */
    reset: (options?: FormResetOptions<T>) => void;
    /**
     * Performs form field control touch state changes.
     *
     * @typeparam T form state type.
     * @param nameOrPath - a root level field name or a state path expression.
     *                     The first field in the schema is touched if the path is not provided.
     * @param options - options for the touch event.
     */
    touch: (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => void;
    /**
     * Validates the form and, optionally, sets its status as submitted when there are no form state errors.
     *
     * @param options - options for form validation.
     */
    validate: (options?: FormValidateOptions<T>) => void;
    /**
     * Marks the form as dirty with an arbitrary string key.
     *
     * @param key - an arbitrary string independent of the managed form state. It must start with the `#` sign to avoid collisions.
     * @param dirty - `true` to set the key as dirty, `false` to clear it. (default: true).
     */
    setDirty: (key: `#${string}`, dirty?: boolean) => void;
    /**
     * Sets a manual error for a path that overrides any form generated errors.
     *
     * @param keyOrPath - an arbitrary string or a state path expression.
     *                    The first field in the schema is touched if the path is not provided.
     * @param error - an error message. Leave this parameter blank or set it to `null` to clear the manual error.
     */
    setError: (keyOrPath: string | ((data: z.infer<T>) => unknown), error?: string | null) => void;
    /**
     * Clears all manual errors.
     */
    clearManualErrors: () => void;
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
     * @param options - options for form submission.
     */
    handleSubmit: (
      onSubmit: FormSubmitHandler<T>,
      options?: FormSubmitOptions
    ) => (formData: FormData) => Promise<void>;
    /**
     * A function to call in the `onReset` attribute the form to its initial state.
     *
     * There is no need to call this function manually if you are using the `Form` component of the library.
     * However, you may still want to call the function on reset with non-default option values.
     *
     * @typeparam T form state type.
     * @param event - a pass-through form reset event that triggered the HTML form reset.
     * @param options - options for reset event.
     */
    handleReset: (
      event?: SyntheticEvent<HTMLFormElement> | null,
      options?: FormResetOptions<T>
    ) => void;
    /**
     * Submits a form element.
     *
     * This method supports asynchronous action forms.
     *
     * @param form - The form element.
     */
    submitForm: (form?: HTMLFormElement | null) => void;
  };
  /**
   * The Form component with pre-wired reset logic.
   *
   * Native form validation has been disabled and Enter handling modified
   * for consistency.
   *
   * @param props - The `form` element props.
   * @returns The `Form` React element.
   */
  Form: (props: React.ComponentPropsWithRef<'form'>) => React.JSX.Element;
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
 * @typeparam T form state type.
 */
export type FormStateProps<T extends ZodObject> = {
  /**
   * The form state.
   */
  form: FormStateResponse<T>;
};

/**
 * Component props that contain the form state and the index of the corresponding array property in the state.
 *
 * @typeparam T form state type.
 */
export type FormStatePropsWithIndex<T extends ZodObject> = FormStateProps<T> & {
  /**
   * The index of the corresponding array state property.
   */
  index: number;
};

/**
 * Component props that contain the HTML element properties along witht the form state.
 *
 * @typeparam T HTML element type.
 * @typeparam F form state type.
 */
export type FormControlWithStateProps<F extends ZodObject> = FormStateProps<F> &
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
 * @typeparam The range type.
 */
export type RangeResult<R> = R extends number | Date
  ? { min: R | undefined | ''; max: R | undefined | ''; format: string }
  : undefined;

/**
 * The type for a successful state validation result.
 *
 * @typeparam The form schema type.
 */
export type StateValidationSuccess<T extends z.ZodObject> = {
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
 * @typeparam The form schema type.
 */
export type StateValidationFailure<T extends z.ZodObject> = {
  /**
   * The form state error instance, if the validation was unsuccessful.
   */
  error: FormStateError<T>;
  /**
   * Indicates whether the validation was successful.
   */
  success: false;
};
