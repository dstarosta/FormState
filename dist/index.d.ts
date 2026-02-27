import * as z$1 from "zod";
import z from "zod";
import { ComponentType, ReactNode, SyntheticEvent } from "react";
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
  z: typeof z$1.z;
  default: typeof z$1.z;
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
  initialState?: DeepPartial<z$1.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  children?: ReactNode;
}>): react_jsx_runtime0.JSX.Element;
declare function useFormStateContext<T extends z$1.ZodObject>(schema: T): FormStateResponse<T>;
declare function formConnect<T extends z$1.ZodObject>(props: Readonly<{
  schema: T;
  initialState?: DeepPartial<z$1.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
}>): <P>(Component: ComponentType<P>) => {
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