import * as z$1 from "zod/v4";
import z from "zod/v4";
import { ComponentType, ReactNode, SyntheticEvent } from "react";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region \0rolldown/runtime.js
//#endregion
//#region src/form-types.d.ts
type PathValue<T, P extends string> = P extends keyof T ? T[P] : P extends `${infer K}.${infer R}` ? K extends keyof T ? PathValue<T[K], R> : never : never;
type IsUnion<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type RangeOf<T> = undefined | Date | number | (IsUnion<T, Date | string> extends true ? Date | string : never) | (IsUnion<T, number | ''> extends true ? number | '' : never);
type ImmutablePrimitive = undefined | null | boolean | string | number | symbol | Date | Error | Function | RegExp | Promise<unknown>;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
type Immutable<T> = T extends ImmutablePrimitive ? T : T extends Array<infer U> ? ImmutableArray<U> : T extends Map<infer K, infer V> ? ImmutableMap<K, V> : T extends Set<infer M> ? ImmutableSet<M> : T extends object ? ImmutableObject<T> : T;
type ZodDeepType<T extends z.ZodType> = T extends z.ZodOptional<infer U> | z.ZodNullable<infer U> | z.ZodDefault<infer U> | z.ZodCatch<infer U> | z.ZodPipe<infer U> | z.ZodNonOptional<infer U> ? ZodDeepType<U extends z.ZodType ? U : never> : T;
type FieldRange = number | Date | undefined;
type FormMutableState<T extends object> = {
  initialData: T;
  data: T;
  errors: Record<keyof T, string | undefined>;
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
  validated: boolean;
  submitted: boolean;
  pendingValidation: {
    id: string;
    validator?: ((data: Immutable<State>) => Promise<void | Record<string, string>>) | undefined;
  } | null;
};
// Public types
/**
 * Form initialization options.
 *
 * @typeParam T type of the form data.
 */
type FormOptions<T extends z.ZodObject> = {
  /**
   * An optional object with schema properties to set the initial state of the form.
   * This object should be used for asynchronous form initialization, otherwise, specify
   * the initial state in the schema.
   * Non-dirty form state values will reflect reactive changes to the initial state.
   */
  initialState?: Partial<z.infer<T>> | undefined;
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
   * Sets the capacity of the throttle callback cache used by the "change"
   * method. (default: 50).
   * A non-positive value means no throttling of change callbacks is allowed.
   * A smaller value saves memory but can cause issues with throttling
   * change callbacks.
   */
  throttledCacheCapacity?: number;
};
/**
 * Form state type made immutable and extended with the `get(expression)` methods.
 *
 * @typeParam T type of the form data.
 */
type FormState<T extends object> = {
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
  }>;
  /**
   * Dirty status for each field in the form.
   */
  dirty: Immutable<FormMutableState<T>['dirty'] & {
    /**
     * Gets the touched state for an arbitrary string key.
     *
     * @param key - a string key.
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
     * @param path - a form state path expression.
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
     * @param path - a form state path expression.
     * @returns a number representing the maximum length or undefined.
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
     * @param path - a form state path expression.
     * @returns an object containing the `min` and the `max` properties that can be numeric, dates or `undefined`.
     */
    get: <R extends RangeOf<R>>(expression: (data: T) => R) => RangeResult<R>;
  }>;
  /**
   * Optional field descriptions in the form.
   */
  patterns: Immutable<FormMutableState<T>['patterns'] & {
    /**
     * Gets the regular expression pattern for a nested field.
     *
     * @param path - a form state path expression.
     * @returns a string containing the regular expression pattern or `undefined`.
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
     * @param path - a form state path expression.
     * @returns a string containing the description; no description returns an empty `string`.
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
   * Whether the form has been submitted (initially or after the last form reset).
   */
  readonly submitted: boolean;
};
/**
 * A form path that can be a field name or a state path expression.
 *
 * @typeparam T form state type.
 */
type FormPath<T extends z.ZodObject> = keyof z.infer<T> | ((data: z.infer<T>) => unknown);
/**
 * Helper type to resolve the value type from a FormPath.
 *
 * @typeparam T form state type.
 * @typeparam P the form path (either a key or a function expression).
 */
type FormPathValue<T extends z.ZodObject, P extends FormPath<T>> = P extends ((data: z.infer<T>) => infer R) ? R : P extends keyof z.infer<T> ? z.infer<T>[P] : P extends string ? PathValue<z.infer<T>, P> : unknown;
/**
 * Options for the `formClasses` method.
 */
type FormClassOptions = {
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
type FormChangeOptions<T extends z.ZodObject> = {
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
   * An optional throttling interval in milliseconds for the provided `callback` parameter.
   *
   * It is useful for making API calls on state change.
   */
  callbackInterval?: number;
};
/**
 * Form data merge options.
 */
type FormMergeOptions = {
  /**
   * Indicates whether to validate the field (default: false).
   */
  validate?: boolean;
};
/**
 * Form touch options.
 */
type FormTouchOptions = {
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
type FormResetOptions<T extends z.ZodObject> = {
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
 * Form submission options.
 */
type FormSubmitOptions = {
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
 * The form state response type.
 *
 * @typeparam T form state type.
 */
type FormStateResponse<T extends z.ZodObject> = {
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
  formClasses: (nameOrPath: FormPath<T>, additionalClasses?: string | null, options?: FormClassOptions) => string;
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
    change: <P extends FormPath<T>>(nameOrPath: P, value: FormPathValue<T, P>, options?: FormChangeOptions<T>) => void;
    /**
     * Performs data merge into the form state.
     *
     * @typeparam T form state type.
     * @param data - the merged data.
     * @param options - options for the merge event.
     */
    merge: (data: Partial<z.infer<T>>, options?: FormMergeOptions) => void;
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
     * Resets the form to its initial state.
     *
     * @typeparam T form state type.
     * @param event - a pass-through form reset event that triggered the HTML form reset.
     * @param options - options for reset event.
     */
    reset: (event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => void;
    /**
     * Validates the form and sets its status (`formStatus.submitted`) as submitted, if there are no errors.
     * That allows form validations rules to be different after the form has been submitted.
     *
     * Calling `resetForm` for the entire form resets this status.
     *
     * @param options - options for form submission.
     * @returns `true` if the form was valid and the status was changed, `false` if the form was not valid.
     */
    submit: (options?: FormSubmitOptions) => boolean;
    /**
     * Validates the form state.
     *
     * @param validator - An async function to validate the form state data, usually to validate it against APIs.
     *
     *                    Note: Synchronous validation should be done in the schema.
     * @returns A promise with the updated form state object. The form state objects returned from the hook require
     *          an additional render to update and cannot be used synchronously after the function call.
     */
    validateAsync: (validator?: (data: Immutable<z.infer<T>>) => Promise<Record<string, string> | void>) => Promise<{
      state: FormState<z.infer<T>>;
      status: FormStatus;
    }>;
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
type FormDateFormat = 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'MM-dd-yyyy' | 'dd-MM-yyyy' | 'dd.MM.yyyy';
/**
 * Component props that contain the form state.
 *
 * @typeparam T form state type.
 */
type FormStateProps<T extends ZodObject> = {
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
type FormStatePropsWithIndex<T extends ZodObject> = FormStateProps<T> & {
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
type FormControlWithStateProps<F extends ZodObject> = FormStateProps<F> & Omit<React.ComponentPropsWithRef<'form'>, 'form'>;
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
 */
type RangeResult<R> = R extends number | Date ? {
  min: R | undefined | '';
  max: R | undefined | '';
  format: string;
} : undefined;
declare namespace form_schema_d_exports {
  export { advanced, array, boolean, date, formArray, formBoolean, formDate, formNumber, formString, formValues, infer, number, object, regexes, strictObject, string, symbol };
}
type infer<T extends z$1.ZodType> = z$1.infer<T>;
declare const string: typeof z$1.string;
declare const number: typeof z$1.number;
declare const boolean: typeof z$1.boolean;
declare const date: typeof z$1.date;
declare const array: typeof z$1.array;
declare const object: typeof z$1.object;
declare const strictObject: typeof z$1.strictObject;
declare const symbol: typeof z$1.symbol;
declare const regexes: typeof z$1.core.regexes;
declare const advanced: {
  default: typeof z$1.z;
  z: typeof z$1.z;
  core: typeof z$1.core;
  globalRegistry: z$1.core.$ZodRegistry<z$1.core.GlobalMeta, z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>>;
  registry: typeof z$1.core.registry;
  config: typeof z$1.core.config;
  $output: typeof z$1.core.$output;
  $input: typeof z$1.core.$input;
  $brand: typeof z$1.core.$brand;
  clone: typeof z$1.core.util.clone;
  regexes: typeof z$1.core.regexes;
  treeifyError: typeof z$1.core.treeifyError;
  prettifyError: typeof z$1.core.prettifyError;
  formatError: typeof z$1.core.formatError;
  flattenError: typeof z$1.core.flattenError;
  TimePrecision: {
    readonly Any: null;
    readonly Minute: -1;
    readonly Second: 0;
    readonly Millisecond: 3;
    readonly Microsecond: 6;
  };
  util: typeof z$1.core.util;
  NEVER: never;
  toJSONSchema: typeof z$1.core.toJSONSchema;
  fromJSONSchema: typeof z$1.fromJSONSchema;
  locales: typeof z$1.core.locales;
  ZodISODateTime: z$1.core.$constructor<z$1.ZodISODateTime, z$1.core.$ZodISODateTimeDef>;
  ZodISODate: z$1.core.$constructor<z$1.ZodISODate, z$1.core.$ZodStringFormatDef<"date">>;
  ZodISOTime: z$1.core.$constructor<z$1.ZodISOTime, z$1.core.$ZodISOTimeDef>;
  ZodISODuration: z$1.core.$constructor<z$1.ZodISODuration, z$1.core.$ZodStringFormatDef<"duration">>;
  iso: typeof z$1.iso;
  coerce: typeof z$1.coerce;
  string(params?: string | z$1.core.$ZodStringParams): z$1.ZodString;
  string<T extends string>(params?: string | z$1.core.$ZodStringParams): z$1.core.$ZodType<T, T>;
  email(params?: string | z$1.core.$ZodEmailParams): z$1.ZodEmail;
  guid(params?: string | z$1.core.$ZodGUIDParams): z$1.ZodGUID;
  uuid(params?: string | z$1.core.$ZodUUIDParams): z$1.ZodUUID;
  uuidv4(params?: string | z$1.core.$ZodUUIDv4Params): z$1.ZodUUID;
  uuidv6(params?: string | z$1.core.$ZodUUIDv6Params): z$1.ZodUUID;
  uuidv7(params?: string | z$1.core.$ZodUUIDv7Params): z$1.ZodUUID;
  url(params?: string | z$1.core.$ZodURLParams): z$1.ZodURL;
  httpUrl(params?: string | Omit<z$1.core.$ZodURLParams, "protocol" | "hostname">): z$1.ZodURL;
  emoji(params?: string | z$1.core.$ZodEmojiParams): z$1.ZodEmoji;
  nanoid(params?: string | z$1.core.$ZodNanoIDParams): z$1.ZodNanoID;
  cuid(params?: string | z$1.core.$ZodCUIDParams): z$1.ZodCUID;
  cuid2(params?: string | z$1.core.$ZodCUID2Params): z$1.ZodCUID2;
  ulid(params?: string | z$1.core.$ZodULIDParams): z$1.ZodULID;
  xid(params?: string | z$1.core.$ZodXIDParams): z$1.ZodXID;
  ksuid(params?: string | z$1.core.$ZodKSUIDParams): z$1.ZodKSUID;
  ipv4(params?: string | z$1.core.$ZodIPv4Params): z$1.ZodIPv4;
  mac(params?: string | z$1.core.$ZodMACParams): z$1.ZodMAC;
  ipv6(params?: string | z$1.core.$ZodIPv6Params): z$1.ZodIPv6;
  cidrv4(params?: string | z$1.core.$ZodCIDRv4Params): z$1.ZodCIDRv4;
  cidrv6(params?: string | z$1.core.$ZodCIDRv6Params): z$1.ZodCIDRv6;
  base64(params?: string | z$1.core.$ZodBase64Params): z$1.ZodBase64;
  base64url(params?: string | z$1.core.$ZodBase64URLParams): z$1.ZodBase64URL;
  e164(params?: string | z$1.core.$ZodE164Params): z$1.ZodE164;
  jwt(params?: string | z$1.core.$ZodJWTParams): z$1.ZodJWT;
  stringFormat<Format extends string>(format: Format, fnOrRegex: ((arg: string) => z$1.core.util.MaybeAsync<unknown>) | RegExp, _params?: string | z$1.core.$ZodStringFormatParams): z$1.ZodCustomStringFormat<Format>;
  hostname(_params?: string | z$1.core.$ZodStringFormatParams): z$1.ZodCustomStringFormat<"hostname">;
  hex(_params?: string | z$1.core.$ZodStringFormatParams): z$1.ZodCustomStringFormat<"hex">;
  hash<Alg extends z$1.core.util.HashAlgorithm, Enc extends z$1.core.util.HashEncoding = "hex">(alg: Alg, params?: {
    enc?: Enc;
  } & z$1.core.$ZodStringFormatParams): z$1.ZodCustomStringFormat<`${Alg}_${Enc}`>;
  number(params?: string | z$1.core.$ZodNumberParams): z$1.ZodNumber;
  int(params?: string | z$1.core.$ZodCheckNumberFormatParams): z$1.ZodInt;
  float32(params?: string | z$1.core.$ZodCheckNumberFormatParams): z$1.ZodFloat32;
  float64(params?: string | z$1.core.$ZodCheckNumberFormatParams): z$1.ZodFloat64;
  int32(params?: string | z$1.core.$ZodCheckNumberFormatParams): z$1.ZodInt32;
  uint32(params?: string | z$1.core.$ZodCheckNumberFormatParams): z$1.ZodUInt32;
  boolean(params?: string | z$1.core.$ZodBooleanParams): z$1.ZodBoolean;
  bigint(params?: string | z$1.core.$ZodBigIntParams): z$1.ZodBigInt;
  int64(params?: string | z$1.core.$ZodBigIntFormatParams): z$1.ZodBigIntFormat;
  uint64(params?: string | z$1.core.$ZodBigIntFormatParams): z$1.ZodBigIntFormat;
  symbol(params?: string | z$1.core.$ZodSymbolParams): z$1.ZodSymbol;
  any(): z$1.ZodAny;
  unknown(): z$1.ZodUnknown;
  never(params?: string | z$1.core.$ZodNeverParams): z$1.ZodNever;
  date(params?: string | z$1.core.$ZodDateParams): z$1.ZodDate;
  array<T extends z$1.core.SomeType>(element: T, params?: string | z$1.core.$ZodArrayParams): z$1.ZodArray<T>;
  keyof<T extends z$1.ZodObject>(schema: T): z$1.ZodEnum<z$1.core.util.KeysEnum<T["_zod"]["output"]>>;
  object<T extends z$1.core.$ZodLooseShape = Partial<Record<never, z$1.core.SomeType>>>(shape?: T, params?: string | z$1.core.$ZodObjectParams): z$1.ZodObject<z$1.core.util.Writeable<T>, z$1.core.$strip>;
  strictObject<T extends z$1.core.$ZodLooseShape>(shape: T, params?: string | z$1.core.$ZodObjectParams): z$1.ZodObject<T, z$1.core.$strict>;
  looseObject<T extends z$1.core.$ZodLooseShape>(shape: T, params?: string | z$1.core.$ZodObjectParams): z$1.ZodObject<T, z$1.core.$loose>;
  union<const T extends readonly z$1.core.SomeType[]>(options: T, params?: string | z$1.core.$ZodUnionParams): z$1.ZodUnion<T>;
  xor<const T extends readonly z$1.core.SomeType[]>(options: T, params?: string | z$1.core.$ZodXorParams): z$1.ZodXor<T>;
  discriminatedUnion<Types extends readonly [z$1.core.$ZodTypeDiscriminable, ...z$1.core.$ZodTypeDiscriminable[]], Disc extends string>(discriminator: Disc, options: Types, params?: string | z$1.core.$ZodDiscriminatedUnionParams): z$1.ZodDiscriminatedUnion<Types, Disc>;
  intersection<T extends z$1.core.SomeType, U extends z$1.core.SomeType>(left: T, right: U): z$1.ZodIntersection<T, U>;
  tuple<T extends readonly [z$1.core.SomeType, ...z$1.core.SomeType[]]>(items: T, params?: string | z$1.core.$ZodTupleParams): z$1.ZodTuple<T, null>;
  tuple<T extends readonly [z$1.core.SomeType, ...z$1.core.SomeType[]], Rest extends z$1.core.SomeType>(items: T, rest: Rest, params?: string | z$1.core.$ZodTupleParams): z$1.ZodTuple<T, Rest>;
  tuple(items: [], params?: string | z$1.core.$ZodTupleParams): z$1.ZodTuple<[], null>;
  record<Key extends z$1.core.$ZodRecordKey, Value extends z$1.core.SomeType>(keyType: Key, valueType: Value, params?: string | z$1.core.$ZodRecordParams): z$1.ZodRecord<Key, Value>;
  partialRecord<Key extends z$1.core.$ZodRecordKey, Value extends z$1.core.SomeType>(keyType: Key, valueType: Value, params?: string | z$1.core.$ZodRecordParams): z$1.ZodRecord<Key & z$1.core.$partial, Value>;
  looseRecord<Key extends z$1.core.$ZodRecordKey, Value extends z$1.core.SomeType>(keyType: Key, valueType: Value, params?: string | z$1.core.$ZodRecordParams): z$1.ZodRecord<Key, Value>;
  map<Key extends z$1.core.SomeType, Value extends z$1.core.SomeType>(keyType: Key, valueType: Value, params?: string | z$1.core.$ZodMapParams): z$1.ZodMap<Key, Value>;
  set<Value extends z$1.core.SomeType>(valueType: Value, params?: string | z$1.core.$ZodSetParams): z$1.ZodSet<Value>;
  nativeEnum<T extends z$1.core.util.EnumLike>(entries: T, params?: string | z$1.core.$ZodEnumParams): z$1.ZodEnum<T>;
  literal<const T extends ReadonlyArray<z$1.core.util.Literal>>(value: T, params?: string | z$1.core.$ZodLiteralParams): z$1.ZodLiteral<T[number]>;
  literal<const T extends z$1.core.util.Literal>(value: T, params?: string | z$1.core.$ZodLiteralParams): z$1.ZodLiteral<T>;
  file(params?: string | z$1.core.$ZodFileParams): z$1.ZodFile;
  transform<I = unknown, O = I>(fn: (input: I, ctx: z$1.core.ParsePayload) => O): z$1.ZodTransform<Awaited<O>, I>;
  optional<T extends z$1.core.SomeType>(innerType: T): z$1.ZodOptional<T>;
  exactOptional<T extends z$1.core.SomeType>(innerType: T): z$1.ZodExactOptional<T>;
  nullable<T extends z$1.core.SomeType>(innerType: T): z$1.ZodNullable<T>;
  nullish<T extends z$1.core.SomeType>(innerType: T): z$1.ZodOptional<z$1.ZodNullable<T>>;
  _default<T extends z$1.core.SomeType>(innerType: T, defaultValue: z$1.core.util.NoUndefined<z$1.core.output<T>> | (() => z$1.core.util.NoUndefined<z$1.core.output<T>>)): z$1.ZodDefault<T>;
  prefault<T extends z$1.core.SomeType>(innerType: T, defaultValue: z$1.core.input<T> | (() => z$1.core.input<T>)): z$1.ZodPrefault<T>;
  nonoptional<T extends z$1.core.SomeType>(innerType: T, params?: string | z$1.core.$ZodNonOptionalParams): z$1.ZodNonOptional<T>;
  success<T extends z$1.core.SomeType>(innerType: T): z$1.ZodSuccess<T>;
  nan(params?: string | z$1.core.$ZodNaNParams): z$1.ZodNaN;
  pipe<const A extends z$1.core.SomeType, B extends z$1.core.$ZodType<unknown, z$1.core.output<A>> = z$1.core.$ZodType<unknown, z$1.core.output<A>, z$1.core.$ZodTypeInternals<unknown, z$1.core.output<A>>>>(in_: A, out: B | z$1.core.$ZodType<unknown, z$1.core.output<A>>): z$1.ZodPipe<A, B>;
  codec<const A extends z$1.core.SomeType, B extends z$1.core.SomeType = z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>>(in_: A, out: B, params: {
    decode: (value: z$1.core.output<A>, payload: z$1.core.ParsePayload<z$1.core.output<A>>) => z$1.core.util.MaybeAsync<z$1.core.input<B>>;
    encode: (value: z$1.core.input<B>, payload: z$1.core.ParsePayload<z$1.core.input<B>>) => z$1.core.util.MaybeAsync<z$1.core.output<A>>;
  }): z$1.ZodCodec<A, B>;
  readonly<T extends z$1.core.SomeType>(innerType: T): z$1.ZodReadonly<T>;
  templateLiteral<const Parts extends z$1.core.$ZodTemplateLiteralPart[]>(parts: Parts, params?: string | z$1.core.$ZodTemplateLiteralParams): z$1.ZodTemplateLiteral<z$1.core.$PartsToTemplateLiteral<Parts>>;
  lazy<T extends z$1.core.SomeType>(getter: () => T): z$1.ZodLazy<T>;
  promise<T extends z$1.core.SomeType>(innerType: T): z$1.ZodPromise<T>;
  _function(): z$1.ZodFunction;
  _function<const In extends ReadonlyArray<z$1.core.$ZodType>>(params: {
    input: In;
  }): z$1.ZodFunction<z$1.ZodTuple<In, null>, z$1.core.$ZodFunctionOut>;
  _function<const In extends ReadonlyArray<z$1.core.$ZodType>, const Out extends z$1.core.$ZodFunctionOut = z$1.core.$ZodFunctionOut>(params: {
    input: In;
    output: Out;
  }): z$1.ZodFunction<z$1.ZodTuple<In, null>, Out>;
  _function<const In extends z$1.core.$ZodFunctionIn = z$1.core.$ZodFunctionArgs>(params: {
    input: In;
  }): z$1.ZodFunction<In, z$1.core.$ZodFunctionOut>;
  _function<const Out extends z$1.core.$ZodFunctionOut = z$1.core.$ZodFunctionOut>(params: {
    output: Out;
  }): z$1.ZodFunction<z$1.core.$ZodFunctionIn, Out>;
  _function<In extends z$1.core.$ZodFunctionIn = z$1.core.$ZodFunctionArgs, Out extends z$1.core.$ZodType = z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>>(params?: {
    input: In;
    output: Out;
  }): z$1.ZodFunction<In, Out>;
  check<O = unknown>(fn: z$1.core.CheckFn<O>): z$1.core.$ZodCheck<O>;
  custom<O>(fn?: (data: unknown) => unknown, _params?: string | z$1.core.$ZodCustomParams | undefined): z$1.ZodCustom<O, O>;
  refine<T>(fn: (arg: NoInfer<T>) => z$1.core.util.MaybeAsync<unknown>, _params?: string | z$1.core.$ZodCustomParams): z$1.core.$ZodCheck<T>;
  superRefine<T>(fn: (arg: T, payload: z$1.core.$RefinementCtx<T>) => void | Promise<void>): z$1.core.$ZodCheck<T>;
  json(params?: string | z$1.core.$ZodCustomParams): z$1.ZodJSONSchema;
  preprocess<A, U extends z$1.core.SomeType, B = unknown>(fn: (arg: B, ctx: z$1.core.$RefinementCtx) => A, schema: U): z$1.ZodPipe<z$1.ZodTransform<A, B>, U>;
  ZodType: z$1.core.$constructor<z$1.ZodType>;
  _ZodString: z$1.core.$constructor<z$1._ZodString>;
  ZodString: z$1.core.$constructor<z$1.ZodString>;
  ZodStringFormat: z$1.core.$constructor<z$1.ZodStringFormat>;
  ZodEmail: z$1.core.$constructor<z$1.ZodEmail>;
  ZodGUID: z$1.core.$constructor<z$1.ZodGUID>;
  ZodUUID: z$1.core.$constructor<z$1.ZodUUID>;
  ZodURL: z$1.core.$constructor<z$1.ZodURL>;
  ZodEmoji: z$1.core.$constructor<z$1.ZodEmoji>;
  ZodNanoID: z$1.core.$constructor<z$1.ZodNanoID>;
  ZodCUID: z$1.core.$constructor<z$1.ZodCUID>;
  ZodCUID2: z$1.core.$constructor<z$1.ZodCUID2>;
  ZodULID: z$1.core.$constructor<z$1.ZodULID>;
  ZodXID: z$1.core.$constructor<z$1.ZodXID>;
  ZodKSUID: z$1.core.$constructor<z$1.ZodKSUID>;
  ZodIPv4: z$1.core.$constructor<z$1.ZodIPv4>;
  ZodMAC: z$1.core.$constructor<z$1.ZodMAC>;
  ZodIPv6: z$1.core.$constructor<z$1.ZodIPv6>;
  ZodCIDRv4: z$1.core.$constructor<z$1.ZodCIDRv4>;
  ZodCIDRv6: z$1.core.$constructor<z$1.ZodCIDRv6>;
  ZodBase64: z$1.core.$constructor<z$1.ZodBase64>;
  ZodBase64URL: z$1.core.$constructor<z$1.ZodBase64URL>;
  ZodE164: z$1.core.$constructor<z$1.ZodE164>;
  ZodJWT: z$1.core.$constructor<z$1.ZodJWT>;
  ZodCustomStringFormat: z$1.core.$constructor<z$1.ZodCustomStringFormat>;
  ZodNumber: z$1.core.$constructor<z$1.ZodNumber>;
  ZodNumberFormat: z$1.core.$constructor<z$1.ZodNumberFormat>;
  ZodBoolean: z$1.core.$constructor<z$1.ZodBoolean>;
  ZodBigInt: z$1.core.$constructor<z$1.ZodBigInt>;
  ZodBigIntFormat: z$1.core.$constructor<z$1.ZodBigIntFormat>;
  ZodSymbol: z$1.core.$constructor<z$1.ZodSymbol>;
  ZodUndefined: z$1.core.$constructor<z$1.ZodUndefined>;
  undefined: typeof z$1.undefined;
  ZodNull: z$1.core.$constructor<z$1.ZodNull>;
  null: typeof z$1.null;
  ZodAny: z$1.core.$constructor<z$1.ZodAny>;
  ZodUnknown: z$1.core.$constructor<z$1.ZodUnknown>;
  ZodNever: z$1.core.$constructor<z$1.ZodNever>;
  ZodVoid: z$1.core.$constructor<z$1.ZodVoid>;
  void: typeof z$1.void;
  ZodDate: z$1.core.$constructor<z$1.ZodDate>;
  ZodArray: z$1.core.$constructor<z$1.ZodArray>;
  ZodObject: z$1.core.$constructor<z$1.ZodObject>;
  ZodUnion: z$1.core.$constructor<z$1.ZodUnion>;
  ZodXor: z$1.core.$constructor<z$1.ZodXor>;
  ZodDiscriminatedUnion: z$1.core.$constructor<z$1.ZodDiscriminatedUnion>;
  ZodIntersection: z$1.core.$constructor<z$1.ZodIntersection>;
  ZodTuple: z$1.core.$constructor<z$1.ZodTuple>;
  ZodRecord: z$1.core.$constructor<z$1.ZodRecord>;
  ZodMap: z$1.core.$constructor<z$1.ZodMap>;
  ZodSet: z$1.core.$constructor<z$1.ZodSet>;
  ZodEnum: z$1.core.$constructor<z$1.ZodEnum>;
  enum: typeof z$1.enum;
  ZodLiteral: z$1.core.$constructor<z$1.ZodLiteral>;
  ZodFile: z$1.core.$constructor<z$1.ZodFile>;
  ZodTransform: z$1.core.$constructor<z$1.ZodTransform>;
  ZodOptional: z$1.core.$constructor<z$1.ZodOptional>;
  ZodExactOptional: z$1.core.$constructor<z$1.ZodExactOptional>;
  ZodNullable: z$1.core.$constructor<z$1.ZodNullable>;
  ZodDefault: z$1.core.$constructor<z$1.ZodDefault>;
  ZodPrefault: z$1.core.$constructor<z$1.ZodPrefault>;
  ZodNonOptional: z$1.core.$constructor<z$1.ZodNonOptional>;
  ZodSuccess: z$1.core.$constructor<z$1.ZodSuccess>;
  ZodCatch: z$1.core.$constructor<z$1.ZodCatch>;
  catch: typeof z$1.catch;
  ZodNaN: z$1.core.$constructor<z$1.ZodNaN>;
  ZodPipe: z$1.core.$constructor<z$1.ZodPipe>;
  ZodCodec: z$1.core.$constructor<z$1.ZodCodec>;
  ZodReadonly: z$1.core.$constructor<z$1.ZodReadonly>;
  ZodTemplateLiteral: z$1.core.$constructor<z$1.ZodTemplateLiteral>;
  ZodLazy: z$1.core.$constructor<z$1.ZodLazy>;
  ZodPromise: z$1.core.$constructor<z$1.ZodPromise>;
  ZodFunction: z$1.core.$constructor<z$1.ZodFunction>;
  function: typeof z$1._function;
  ZodCustom: z$1.core.$constructor<z$1.ZodCustom>;
  describe: typeof z$1.core.describe;
  meta: typeof z$1.core.meta;
  instanceof: typeof z$1.instanceof;
  stringbool: (_params?: string | z$1.core.$ZodStringBoolParams) => z$1.ZodCodec<z$1.ZodString, z$1.ZodBoolean>;
  lt: typeof z$1.core._lt;
  lte: typeof z$1.core._lte;
  gt: typeof z$1.core._gt;
  gte: typeof z$1.core._gte;
  positive: typeof z$1.core._positive;
  negative: typeof z$1.core._negative;
  nonpositive: typeof z$1.core._nonpositive;
  nonnegative: typeof z$1.core._nonnegative;
  multipleOf: typeof z$1.core._multipleOf;
  maxSize: typeof z$1.core._maxSize;
  minSize: typeof z$1.core._minSize;
  size: typeof z$1.core._size;
  maxLength: typeof z$1.core._maxLength;
  minLength: typeof z$1.core._minLength;
  length: typeof z$1.core._length;
  regex: typeof z$1.core._regex;
  lowercase: typeof z$1.core._lowercase;
  uppercase: typeof z$1.core._uppercase;
  includes: typeof z$1.core._includes;
  startsWith: typeof z$1.core._startsWith;
  endsWith: typeof z$1.core._endsWith;
  property: typeof z$1.core._property;
  mime: typeof z$1.core._mime;
  overwrite: typeof z$1.core._overwrite;
  normalize: typeof z$1.core._normalize;
  trim: typeof z$1.core._trim;
  toLowerCase: typeof z$1.core._toLowerCase;
  toUpperCase: typeof z$1.core._toUpperCase;
  slugify: typeof z$1.core._slugify;
  ZodError: z$1.core.$constructor<z$1.ZodError>;
  ZodRealError: z$1.core.$constructor<z$1.ZodError>;
  parse: <T extends z$1.core.$ZodType>(schema: T, value: unknown, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>, _params?: {
    callee?: z$1.core.util.AnyFunc;
    Err?: z$1.core.$ZodErrorClass;
  }) => z$1.core.output<T>;
  parseAsync: <T extends z$1.core.$ZodType>(schema: T, value: unknown, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>, _params?: {
    callee?: z$1.core.util.AnyFunc;
    Err?: z$1.core.$ZodErrorClass;
  }) => Promise<z$1.core.output<T>>;
  safeParse: <T extends z$1.core.$ZodType>(schema: T, value: unknown, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => z$1.ZodSafeParseResult<z$1.core.output<T>>;
  safeParseAsync: <T extends z$1.core.$ZodType>(schema: T, value: unknown, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => Promise<z$1.ZodSafeParseResult<z$1.core.output<T>>>;
  encode: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.output<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => z$1.core.input<T>;
  decode: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.input<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => z$1.core.output<T>;
  encodeAsync: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.output<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => Promise<z$1.core.input<T>>;
  decodeAsync: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.input<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => Promise<z$1.core.output<T>>;
  safeEncode: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.output<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => z$1.ZodSafeParseResult<z$1.core.input<T>>;
  safeDecode: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.input<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => z$1.ZodSafeParseResult<z$1.core.output<T>>;
  safeEncodeAsync: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.output<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => Promise<z$1.ZodSafeParseResult<z$1.core.input<T>>>;
  safeDecodeAsync: <T extends z$1.core.$ZodType>(schema: T, value: z$1.core.input<T>, _ctx?: z$1.core.ParseContext<z$1.core.$ZodIssue>) => Promise<z$1.ZodSafeParseResult<z$1.core.output<T>>>;
  setErrorMap(map: z$1.core.$ZodErrorMap): void;
  getErrorMap(): z$1.core.$ZodErrorMap<z$1.core.$ZodIssue> | undefined;
  ZodIssueCode: {
    readonly invalid_type: "invalid_type";
    readonly too_big: "too_big";
    readonly too_small: "too_small";
    readonly invalid_format: "invalid_format";
    readonly not_multiple_of: "not_multiple_of";
    readonly unrecognized_keys: "unrecognized_keys";
    readonly invalid_union: "invalid_union";
    readonly invalid_key: "invalid_key";
    readonly invalid_element: "invalid_element";
    readonly invalid_value: "invalid_value";
    readonly custom: "custom";
  };
  ZodFirstPartyTypeKind: typeof z$1.ZodFirstPartyTypeKind;
};
declare function formBoolean(zodBoolean: ZodDeepType<z$1.ZodBoolean>, options?: {
  required: boolean;
  error?: string;
}): z$1.ZodPipe<z$1.ZodTransform<boolean | "", unknown>, z$1.ZodBoolean | z$1.ZodUnion<[z$1.ZodBoolean, z$1.ZodLiteral<"">]>>;
declare function formDate(zodDate: ZodDeepType<z$1.ZodDate>, options?: {
  required: boolean;
  error?: string;
  dateFormat?: FormDateFormat;
  dateFormatError?: string;
}): z$1.ZodPipe<z$1.ZodTransform<string | Date, unknown>, z$1.ZodUnion<[z$1.ZodDate, z$1.ZodString]>>;
declare function formNumber(zodNumber: ZodDeepType<z$1.ZodNumber>, options?: {
  required: boolean;
  error?: string;
}): z$1.ZodPipe<z$1.ZodTransform<number | "", unknown>, z$1.ZodNumber | z$1.ZodUnion<[z$1.ZodNumber, z$1.ZodLiteral<"">]>>;
declare function formString(zodString: ZodDeepType<z$1.ZodString>, options?: {
  required: boolean;
  error?: string;
}): z$1.ZodPipe<z$1.ZodTransform<{}, unknown>, z$1.ZodString | z$1.ZodUnion<[z$1.ZodString, z$1.ZodLiteral<"">]>>;
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options: {
  required: true;
  error?: string;
}): z$1.ZodPipe<z$1.ZodTransform, z$1.ZodEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }>>;
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options?: {
  required?: false;
  error?: string;
}): z$1.ZodPipe<z$1.ZodTransform, z$1.ZodEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }> | z$1.ZodLiteral<''>>;
declare function formArray<T extends z$1.ZodType>(elementSchema: T extends z$1.ZodObject | z$1.ZodArray ? never : T, options?: {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  error?: string;
  lengthError?: string;
}): z$1.ZodArray<T extends z$1.ZodArray<z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>> | z$1.ZodObject<z$1.core.$ZodLooseShape, z$1.core.$strip> ? never : T> | z$1.ZodOptional<z$1.ZodArray<T extends z$1.ZodArray<z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>> | z$1.ZodObject<z$1.core.$ZodLooseShape, z$1.core.$strip> ? never : T>>;
//#endregion
//#region src/use-form-state.d.ts
declare function useFormState<T extends z$1.ZodObject>(schema: T, formOptions?: FormOptions<T>): FormStateResponse<T>;
//#endregion
//#region src/form-provider.d.ts
declare function FormStateProvider<T extends z$1.ZodObject>({
  schema,
  initialState,
  initialTouched,
  validateOnInit,
  children
}: Readonly<{
  schema: T;
  initialState?: Partial<z$1.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  children?: ReactNode;
}>): react_jsx_runtime0.JSX.Element;
declare function useFormStateContext<T extends z$1.ZodObject>(schema: T): FormStateResponse<T>;
declare function formConnect<T extends z$1.ZodObject>(props: Readonly<{
  schema: T;
  initialState?: Partial<z$1.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
}>): <P>(Component: ComponentType<P>) => {
  (innerProps: Readonly<P>): react_jsx_runtime0.JSX.Element;
  displayName: string;
};
//#endregion
//#region src/helpers/state-manager.d.ts
declare function createState<T extends z$1.ZodObject>(schema: T): z$1.infer<T>;
declare function updateState<T>(state: ImmutableArray<T> | undefined, updater: (draft: T[]) => void): T[];
declare function updateState<T>(state: ImmutableObject<T> | undefined, updater: (draft: T) => void): T;
//#endregion
//#region src/helpers/date-formatter.d.ts
declare function formatDate(date: Date, format?: FormDateFormat): string;
declare function safeParseDate(input: string | undefined, format?: FormDateFormat): DateParseResult;
//#endregion
export { type DateParseResult, type FormChangeOptions, type FormControlWithStateProps, type FormDateFormat, type FormPath, type FormResetOptions, type FormState, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, createState, formConnect, formatDate, safeParseDate, updateState, useFormState, useFormStateContext, form_schema_d_exports as z };