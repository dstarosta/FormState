import * as z$1 from "zod";
import z from "zod";
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
type ZodDeepType<T extends z.ZodType> = T extends z.ZodOptional<infer U> | z.ZodNullable<infer U> | z.ZodDefault<infer U> | z.ZodCatch<infer U> | z.ZodPipe<infer U> | z.ZodNonOptional<infer U> ? ZodDeepType<U extends z.ZodType ? U : never> : T;
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
};
type FormOptions<T extends z.ZodObject> = {
  initialState?: DeepPartial<z.infer<T>> | undefined;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  debounceCacheCapacity?: number;
  watch?: boolean;
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
};
type FormPath<T extends z.ZodObject> = keyof z.infer<T> | ((data: z.infer<T>) => unknown);
type FormPathValue<T extends z.ZodObject, P extends FormPath<T>> = P extends ((data: z.infer<T>) => infer R) ? R : P extends keyof z.infer<T> ? z.infer<T>[P] : P extends string ? PathValue<z.infer<T>, P> : unknown;
type FormClassOptions = {
  isLoading?: boolean;
  classPrefix?: string;
};
type FormChangeOptions<T extends z.ZodObject> = {
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
type FormResetOptions<T extends z.ZodObject> = {
  names?: (keyof z.infer<T>)[];
  retainData?: boolean;
  resetTouched?: boolean;
  resetSubmitted?: boolean;
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormValidateOptions<T extends z.ZodObject> = {
  resetDirty?: boolean;
  resetTouched?: boolean;
  submit?: boolean;
  callback?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormSubmitOptions<T extends z.ZodObject> = {
  resetDirty?: boolean;
  resetTouched?: boolean;
  onSuccess?: (data: z.infer<T>, formData: FormData) => void;
  onFail?: (state: FormState<z.infer<T>>, status: FormStatus) => void;
};
type FormSubmitHandler<T extends z.ZodObject> = (state: SubmitState<z.infer<T>>, formData: FormData) => Promise<Record<string, string> | true> | Record<string, string> | true;
type FormStateResponse<T extends z.ZodObject> = {
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
    setError: (keyOrPath: string | ((data: z.infer<T>) => unknown), error?: string | null) => void;
    clearManualErrors: () => void;
  };
  formHandlers: {
    handleSubmit: (onSubmit: FormSubmitHandler<T>, options?: FormSubmitOptions<T>) => (formData: FormData) => Promise<void>;
    handleReset: (event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => void;
  };
  Form: (props: React.ComponentPropsWithRef<'form'>) => React.JSX.Element;
  useWatch: (name: string) => string | undefined;
};
type FormDateFormat = 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'MM-dd-yyyy' | 'dd-MM-yyyy' | 'dd.MM.yyyy';
type FormStateProps<T extends z.ZodObject> = {
  form: FormStateResponse<T>;
};
type FormStatePropsWithIndex<T extends z.ZodObject> = FormStateProps<T> & {
  index: number;
};
type FormControlWithStateProps<F extends z.ZodObject> = FormStateProps<F> & Omit<React.ComponentPropsWithRef<'form'>, 'form'>;
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
  export { z$1 as advanced, array, boolean, date, formArray, formBoolean, formDate, formNumber, formString, formValues, infer, number, object, regexes, strictObject, string, symbol };
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
}): z$1.ZodArray<T extends z$1.ZodObject<z$1.core.$ZodLooseShape, z$1.core.$strip> | z$1.ZodArray<z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>> ? never : T> | z$1.ZodOptional<z$1.ZodArray<T extends z$1.ZodObject<z$1.core.$ZodLooseShape, z$1.core.$strip> | z$1.ZodArray<z$1.core.$ZodType<unknown, unknown, z$1.core.$ZodTypeInternals<unknown, unknown>>> ? never : T>>;
//#endregion
//#region src/use-form-state.d.ts
declare function useFormState<T extends z$1.ZodObject>(schema: T, formOptions?: FormOptions<T>): FormStateResponse<T>;
//#endregion
//#region src/form-provider.d.ts
type FormStateProviderProps<T extends z$1.ZodObject> = {
  schema: T;
  initialState?: DeepPartial<z$1.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  watch?: boolean;
};
declare function FormStateProvider<T extends z$1.ZodObject>({
  schema,
  initialState,
  initialTouched,
  validateOnInit,
  watch,
  children
}: Readonly<PropsWithChildren<FormStateProviderProps<T>>>): react_jsx_runtime0.JSX.Element;
declare function useFormStateContext<T extends z$1.ZodObject>(schema: T): FormStateResponse<T>;
declare function formConnect<T extends z$1.ZodObject>(props: FormStateProviderProps<T>): <P>(Component: ComponentType<P>) => {
  (innerProps: Readonly<P>): react_jsx_runtime0.JSX.Element;
  displayName: string;
};
//#endregion
//#region src/helpers/state-manager.d.ts
declare function createState<T extends z$1.ZodObject>(schema: T): z$1.infer<T>;
declare function createInitialState<T extends z$1.ZodObject>(schema: T, data: DeepPartial<z$1.infer<T>> | null | undefined): z$1.core.output<T>;
declare function getState<T extends z$1.ZodObject, P extends FormPath<T>>(schema: T, data: z$1.infer<T>, nameOrPath: P): FormPathValue<T, P> | undefined;
declare function updateState<T>(state: ImmutableArray<T> | undefined, updater: (draft: T[]) => void): T[];
declare function updateState<T>(state: ImmutableObject<T> | undefined, updater: (draft: T) => void): T;
//#endregion
//#region src/helpers/date-formatter.d.ts
declare function formatDate(date: Date, format?: FormDateFormat): string;
declare function safeParseDate(input: string | undefined, format?: FormDateFormat): DateParseResult;
//#endregion
//#region src/helpers/error-formatter.d.ts
declare const validateState: <T extends z$1.ZodObject>(schema: T, data: DeepPartial<z$1.infer<T>>, populateDefaults?: boolean) => {
  error: FormStateError<T>;
  success: false;
  data?: never;
} | {
  data: z$1.core.output<T>;
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
export { type DateParseResult, type DeepPartial, type FormChangeOptions, type FormControlWithStateProps, type FormDateFormat, type FormPath, type FormResetOptions, type FormState, FormStateError, type FormStateProps, type FormStatePropsWithIndex, FormStateProvider, type FormStateResponse, type FormStatus, type FormSubmitOptions, type FormTouchOptions, type SubmitState, value_converter_d_exports as convert, createInitialState, createState, formConnect, formDataToURL, formatDate, getState, safeParseDate, submitForm, updateState, useFormState, useFormStateContext, validateState, form_schema_d_exports as z };