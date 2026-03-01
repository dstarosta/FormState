import * as z from "zod/mini";
import { ComponentType, PropsWithChildren, SyntheticEvent } from "react";
import * as react_jsx_runtime0 from "react/jsx-runtime";

//#region \0rolldown/runtime.js
//#endregion
//#region src/helpers/form-state-error.d.ts
declare class FormStateError<T extends object> extends Error {
  readonly errors: Partial<Record<keyof T, string>>;
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
  initialErrors: Record<keyof T, string | undefined>;
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
  replaced: boolean;
  validated: boolean;
  submitted: boolean;
  readOnly: boolean;
  disabled: boolean;
};
type FormInitOptions<T extends z.ZodMiniObject> = {
  initialState?: DeepPartial<z.infer<T>> | undefined;
  initialTouched?: FormPath<T>[];
  initialMode?: FormMode | undefined;
  resetTouchedOnFormReset?: boolean;
  validateOnInit?: boolean;
  validateOnChange?: boolean;
  validateOnTouch?: boolean;
  debounceCacheCapacity?: number;
  watch?: boolean;
  CSSPrefix?: string;
};
type FormProviderInitOptions<T extends z.ZodMiniObject> = FormInitOptions<T> & {
  schema: T;
};
type SubmitState<T extends object> = {
  valid: true;
  data: T;
} | {
  valid: false;
  errors: Immutable<FormMutableState<T>['errors'] & {
    get: (expression: (data: T) => unknown) => string | undefined;
    getManual: (key: string) => string | undefined;
  }>;
};
type FormState<T extends object> = {
  data: Immutable<FormMutableState<T>['data'] & {
    toObject: () => T;
  }>;
  errors: Immutable<FormMutableState<T>['errors'] & {
    get: (expression: (data: T) => unknown) => string | undefined;
    getManual: (key: string) => string | undefined;
  }>;
  dirty: Immutable<FormMutableState<T>['dirty'] & {
    get: (key: `#${string}`) => boolean;
  }>;
  touched: Immutable<FormMutableState<T>['touched'] & {
    get: (expression: (data: T) => unknown) => boolean;
  }>;
  maxLengths: Immutable<FormMutableState<T>['maxLengths'] & {
    get: (expression: (data: T) => unknown) => number | undefined;
  }>;
  ranges: Immutable<FormMutableState<T>['ranges'] & {
    get: <R extends RangeOf<R>>(expression: (data: T) => R) => RangeResult<R>;
  }>;
  patterns: Immutable<FormMutableState<T>['patterns'] & {
    get: (expression: (data: T) => unknown) => string | undefined;
  }>;
  descriptions: Immutable<FormMutableState<T>['descriptions'] & {
    get: (expression: (data: T) => unknown) => string;
  }>;
};
type FormStatus = {
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean | null;
  readonly validSchema: boolean | null;
  readonly submitting: boolean;
  readonly submitted: boolean;
  readonly readOnly: boolean;
  readonly disabled: boolean;
};
type FormPath<T extends z.ZodMiniObject> = keyof z.infer<T> | ((data: z.infer<T>) => unknown);
type FormPathValue<T extends z.ZodMiniObject, P extends FormPath<T>> = P extends ((data: z.infer<T>) => infer R) ? R : P extends keyof z.infer<T> ? z.infer<T>[P] : P extends string ? PathValue<z.infer<T>, P> : unknown;
type FormClassOptions = {
  classPrefix?: string;
};
type FormChangeOptions<T extends z.ZodMiniObject> = {
  touch?: boolean;
  validate?: boolean;
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
  callbackInterval?: number;
};
type FormReplaceOptions = {
  validate?: boolean;
};
type FormTouchOptions = {
  validate?: boolean;
};
type FormSetErrorOptions = {
  validate?: boolean;
};
type FormResetOptions<T extends z.ZodMiniObject> = {
  names?: (keyof z.infer<T>)[];
  retainData?: boolean;
  resetTouched?: boolean;
  resetSubmitted?: boolean;
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormValidateOptions<T extends z.ZodMiniObject> = {
  resetDirty?: boolean;
  resetTouched?: boolean;
  submit?: boolean;
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormSubmitOptions<T extends z.ZodMiniObject> = {
  resetDirty?: boolean;
  resetTouched?: boolean;
  onSuccess?: (data: z.infer<T>, formData: FormData) => void;
  onError?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormSubmitHandler<T extends z.ZodMiniObject> = (state: SubmitState<z.infer<T>>, formData: FormData) => Promise<Record<string, string> | true> | Record<string, string> | true;
type FormMode = 'editable' | 'readOnly' | 'disabled';
type FormStateResponse<T extends z.ZodMiniObject> = {
  initialState: {
    data: Immutable<z.infer<T>>;
    errors: Immutable<Record<keyof z.infer<T>, string | undefined>>;
  };
  formState: FormState<z.infer<T>>;
  formStatus: FormStatus;
  formClasses: (nameOrPath: FormPath<T>, additionalClasses?: string | null, options?: FormClassOptions) => string;
  formActions: {
    change: <P extends FormPath<T>>(nameOrPath: P, value: FormPathValue<T, P>, options?: FormChangeOptions<T>) => void;
    replace: (data: DeepPartial<z.infer<T>>, options?: FormReplaceOptions) => void;
    reset: (options?: FormResetOptions<T>) => void;
    touch: (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => void;
    validate: (options?: FormValidateOptions<T>) => void;
    setDirty: (key: `#${string}`, dirty?: boolean) => void;
    setMode: (mode: FormMode) => void;
    setError: (keyOrPath: string | ((data: z.infer<T>) => unknown), error?: string | null, options?: FormSetErrorOptions) => void;
    clearManualErrors: () => void;
    inferName: (nameOrPath: FormPath<T>) => string;
  };
  formHandlers: {
    handleSubmit: (onSubmit: FormSubmitHandler<T>, options?: FormSubmitOptions<T>) => (formData: FormData) => Promise<void>;
    handleReset: (event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => void;
  };
  Form: (props: React.ComponentPropsWithRef<'form'>) => React.JSX.Element;
  useWatch: (name: string) => string | undefined;
};
type FormDateFormat = 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'MM-dd-yyyy' | 'dd-MM-yyyy' | 'dd.MM.yyyy';
type FormStateProps<T extends z.ZodMiniObject> = {
  form: FormStateResponse<T>;
};
type FormStatePropsWithIndex<T extends z.ZodMiniObject> = FormStateProps<T> & {
  index: number;
};
type FormControlWithStateProps<F extends z.ZodMiniObject> = FormStateProps<F> & Omit<React.ComponentPropsWithRef<'form'>, 'form'>;
type DateParseResult = {
  success: boolean;
  date: Date | null;
};
type RangeResult<R> = R extends number | Date ? {
  min: R | undefined | '';
  max: R | undefined | '';
  format: string;
} : undefined;
declare namespace form_schema_d_exports {
  export { advanced, array, boolean, _catch as catch, date, _default as default, describe, _enum as enum, formArray, formBoolean, formDate, formNumber, formString, formValues, gt, gte, infer, length, lt, lte, maxLength, maximum, minLength, minimum, number, object, regex, regexes, strictObject, string, symbol, toLowerCase, toUpperCase, trim };
}
type infer<T extends z.ZodMiniType> = z.infer<T>;
declare const string: typeof z.string;
declare const number: typeof z.number;
declare const boolean: typeof z.boolean;
declare const date: typeof z.date;
declare const array: typeof z.array;
declare const object: typeof z.object;
declare const strictObject: typeof z.strictObject;
declare const symbol: typeof z.symbol;
declare const regexes: typeof z.core.regexes;
declare const regex: typeof z.core._regex;
declare const minLength: typeof z.core._minLength;
declare const maxLength: typeof z.core._maxLength;
declare const length: typeof z.core._length;
declare const minimum: typeof z.core._gte;
declare const maximum: typeof z.core._lte;
declare const gt: typeof z.core._gt;
declare const gte: typeof z.core._gte;
declare const lt: typeof z.core._lt;
declare const lte: typeof z.core._lte;
declare const describe: typeof z.core.describe;
declare const trim: typeof z.core._trim;
declare const toLowerCase: typeof z.core._toLowerCase;
declare const toUpperCase: typeof z.core._toUpperCase;
declare const _enum: typeof z.enum;
declare const _catch: typeof z.catch;
declare const _default: typeof z._default;
declare const advanced: {
  literal: typeof z.literal;
  nullable: typeof z.nullable;
  nullish: typeof z.nullish;
  pipe: typeof z.pipe;
  transform: typeof z.transform;
  union: typeof z.union;
  optional: typeof z.optional;
  nonoptional: typeof z.nonoptional;
};
declare function formBoolean(zodBoolean: ZodDeepType<z.ZodMiniBoolean<boolean>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<boolean | "", unknown>, z.ZodMiniBoolean<boolean> | z.ZodMiniUnion<readonly [z.ZodMiniBoolean<boolean>, z.ZodMiniLiteral<"">]>>;
declare function formDate(zodDate: ZodDeepType<z.ZodMiniDate<Date>>, options?: {
  required?: boolean;
  error?: string;
  dateFormat?: FormDateFormat;
  dateFormatError?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<string | Date, unknown>, z.ZodMiniUnion<readonly [z.ZodMiniDate<Date>, z.ZodMiniString<string>]>>;
declare function formNumber(zodNumber: ZodDeepType<z.ZodMiniNumber<number>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<number | "", unknown>, z.ZodMiniNumber<number> | z.ZodMiniUnion<readonly [z.ZodMiniNumber<number>, z.ZodMiniLiteral<"">]>>;
declare function formString(zodString: ZodDeepType<z.ZodMiniString<string>>, options?: {
  required?: boolean;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform<string, unknown>, z.ZodMiniString<string> | z.ZodMiniUnion<readonly [z.ZodMiniString<string>, z.ZodMiniLiteral<"">]>>;
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options: {
  required: true;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform, z.ZodMiniEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }>>;
declare function formValues<const T extends readonly [string, ...string[]]>(values: T, options?: {
  required?: false;
  error?: string;
}): z.ZodMiniPipe<z.ZodMiniTransform, z.ZodMiniEnum<{ [k in keyof { [ik in (T | readonly [...T])[number]]: ik }]: { [ik in (T | readonly [...T])[number]]: ik }[k] }> | z.ZodMiniLiteral<''>>;
declare function formArray<T extends z.ZodMiniType>(elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T, options: {
  required: false;
  minLength?: number;
  maxLength?: number;
  error?: string;
  lengthError?: string;
}): z.ZodMiniOptional<z.ZodMiniArray<T>>;
declare function formArray<T extends z.ZodMiniType>(elementSchema: T extends z.ZodMiniObject | z.ZodMiniArray ? never : T, options?: {
  required?: true;
  minLength?: number;
  maxLength?: number;
  error?: string;
  lengthError?: string;
}): z.ZodMiniArray<T>;
//#endregion
//#region src/use-form-state.d.ts
declare function useFormState<T extends z.ZodMiniObject>(schema: T, formOptions?: FormInitOptions<T>): FormStateResponse<T>;
//#endregion
//#region src/form-provider.d.ts
declare function FormStateProvider<T extends z.ZodMiniObject>(props: Readonly<PropsWithChildren<FormProviderInitOptions<T>>>): react_jsx_runtime0.JSX.Element;
declare function useFormStateContext<T extends z.ZodMiniObject>(schema: T): FormStateResponse<T>;
declare function formConnect<T extends z.ZodMiniObject>(options: FormProviderInitOptions<T>): <P>(Component: ComponentType<P>) => {
  (innerProps: Readonly<P>): react_jsx_runtime0.JSX.Element;
  displayName: string;
};
//#endregion
//#region src/helpers/state-manager.d.ts
declare function createState<T extends z.ZodMiniObject>(schema: T): z.infer<T>;
declare function createInitialState<T extends z.ZodMiniObject>(schema: T, data: DeepPartial<z.infer<T>> | null | undefined): z.core.output<T>;
declare function getState<T extends z.ZodMiniObject, P extends FormPath<T>>(schema: T, data: z.infer<T>, nameOrPath: P): FormPathValue<T, P> | undefined;
declare function updateState<T>(state: ImmutableArray<T> | undefined, updater: (draft: T[]) => void): T[];
declare function updateState<T>(state: ImmutableObject<T> | undefined, updater: (draft: T) => void): T;
//#endregion
//#region src/helpers/date-formatter.d.ts
declare function formatDate(date: Date, format?: FormDateFormat): string;
declare function safeParseDate(input: string | undefined, format?: FormDateFormat): DateParseResult;
//#endregion
//#region src/helpers/error-formatter.d.ts
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
declare const formDataToURL: (formData: FormData) => URLSearchParams;
declare const submitForm: (form?: HTMLFormElement | null) => void;
declare namespace value_converter_d_exports {
  export { toBoolean, toDate, toFloat, toInt, toLiteral, toString };
}
declare const toInt: (value: string) => number | "";
declare const toFloat: (value: string) => number | "";
declare const toDate: (value: string, options?: {
  dateFormat?: FormDateFormat;
  asUTC?: boolean;
}) => Date | "";
declare const toBoolean: (value: string, options?: {
  strict?: boolean;
}) => boolean | "";
declare const toLiteral: <T extends string>(value: string, validValues: readonly T[]) => T;
declare const toString: (value: boolean | string | number | Date | null | undefined, options?: {
  dateFormat?: FormDateFormat;
  emptyStringAsFalse?: boolean;
}) => string;
//#endregion
export { type DateParseResult, type DeepPartial, type FormChangeOptions, type FormControlWithStateProps, type FormDateFormat, type FormMode, type FormPath, type FormResetOptions, type FormState, FormStateError, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, type SubmitState, value_converter_d_exports as convert, createInitialState, createState, formConnect, formDataToURL, formatDate, getState, safeParseDate, submitForm, updateState, useFormState, useFormStateContext, validateState, form_schema_d_exports as z };