import * as z from 'zod/mini';

import type {
  AsyncCheck,
  AsyncCheckMeta,
  AsyncCheckMetaMap,
  FieldRange,
  FormDateFormat,
  FormStatePath,
} from '../types/form-types';
import { safeParseDate, toUTC } from './date-formatter';
import { dotPathGet } from './dot-path';

const MAX_UNWRAP_DEPTH = 20;

const DIGIT_RE = /^\d+$/;

const requiredTypes: Readonly<Set<string>> = new Set([
  'object',
  'array',
  'number',
  'int',
  'bigint',
  'boolean',
  'symbol',
  'date',
  'literal',
  'template_literal',
  'enum',
  'string',
]);

// Async schema cache.
const asyncSchemaCache = new WeakMap<z.ZodMiniType, boolean>();

// Async path cache.
const asyncCheckPathsCache = new WeakMap<z.ZodMiniType, readonly string[]>();

// Factory registered by `validateAsync` — called lazily to create a fresh
// per-form state slot the first time a given metaMap needs one.
const asyncCheckFactories = new WeakMap<AsyncCheck, () => AsyncCheckMeta>();

// Fallback Map for stand-alone parses (e.g. `schema.safeParseAsync` called
// outside any form, including direct test calls). Keyed weakly so it goes
// away with the schema/check.
const defaultMetaMapByCheck = new WeakMap<AsyncCheck, AsyncCheckMetaMap>();

// Module-level pointer to the metaMap that should be used by the next Zod
// `when` invocation.
let currentMetaMap: AsyncCheckMetaMap | undefined;

// Private functions

const getOrCreateMetaIn = (
  check: AsyncCheck,
  map: AsyncCheckMetaMap
): AsyncCheckMeta | undefined => {
  let meta = map.get(check);
  if (!meta) {
    const factory = asyncCheckFactories.get(check);
    // Unreachable guard
    /* v8 ignore if -- @preserve */
    if (!factory) {
      return undefined;
    }
    meta = factory();
    map.set(check, meta);
  }
  return meta;
};

const getDefaultMapFor = (check: AsyncCheck): AsyncCheckMetaMap => {
  let map = defaultMetaMapByCheck.get(check);
  if (!map) {
    map = new Map();
    defaultMetaMapByCheck.set(check, map);
  }
  return map;
};

const getSchemaLength = (schema: z.ZodMiniString | z.ZodMiniArray) => {
  const checks =
    (schema instanceof z.ZodMiniString || schema instanceof z.ZodMiniArray) &&
    Array.isArray(schema.def.checks)
      ? schema.def.checks
      : undefined;

  const minCheck = checks?.find(
    (chk): chk is z.core.$ZodCheckMinLength => chk._zod.def.check === 'min_length'
  )?._zod.def;

  const maxCheck = checks?.find(
    (chk): chk is z.core.$ZodCheckMaxLength => chk._zod.def.check === 'max_length'
  )?._zod.def;

  return { type: 'length', format: 'integer', min: minCheck?.minimum, max: maxCheck?.maximum };
};

const getNumericSchemaRange = (schema: z.ZodMiniNumber) => {
  const bag = schema._zod.bag as Record<string, number | undefined> | undefined;

  let rawMin: number | undefined;
  let rawMax: number | undefined;

  let exclusiveMin = false;
  let exclusiveMax = false;

  if (bag?.['exclusiveMinimum'] !== undefined) {
    rawMin = bag['exclusiveMinimum'];
    exclusiveMin = true;
  } else if (bag?.['minimum'] !== undefined) {
    rawMin = bag['minimum'];
  }

  if (bag?.['exclusiveMaximum'] !== undefined) {
    rawMax = bag['exclusiveMaximum'];
    exclusiveMax = true;
  } else if (bag?.['maximum'] !== undefined) {
    rawMax = bag['maximum'];
  }

  let minValue = Number.isFinite(rawMin) ? rawMin : undefined;
  let maxValue = Number.isFinite(rawMax) ? rawMax : undefined;

  const hasNonInteger =
    (minValue !== undefined && !Number.isInteger(minValue)) ||
    (maxValue !== undefined && !Number.isInteger(maxValue));

  if (typeof minValue === 'number' && exclusiveMin) {
    minValue += hasNonInteger ? 1e-9 : 1;
  }

  if (typeof maxValue === 'number' && exclusiveMax) {
    maxValue -= hasNonInteger ? 1e-9 : 1;
  }

  const numberFormat = hasNonInteger ? 'numeric' : 'integer';

  return { type: 'range', format: numberFormat, min: minValue, max: maxValue };
};

const getDateSchemaRange = (schema: z.ZodMiniDate) => {
  const minCheck = schema.def.checks?.find(
    (chk): chk is z.core.$ZodCheckGreaterThan<Date> => chk._zod.def.check === 'greater_than'
  )?._zod.def;

  const maxCheck = schema.def.checks?.find(
    (chk): chk is z.core.$ZodCheckLessThan<Date> => chk._zod.def.check === 'less_than'
  )?._zod.def;

  const minDate = minCheck?.value instanceof Date ? minCheck.value : undefined;
  const maxDate = maxCheck?.value instanceof Date ? maxCheck.value : undefined;

  let dateFormat = 'yyyy-MM-dd';

  const meta = z.globalRegistry.get(schema);

  if (meta && typeof meta['format'] === 'string' && meta['format'].length > 0) {
    dateFormat = meta['format'];
  }

  return { type: 'range', format: dateFormat, min: toUTC(minDate), max: toUTC(maxDate) };
};

const getSchemaPattern = (schema: z.ZodMiniString | z.ZodMiniDate) => {
  let pattern: string | undefined;

  if (schema instanceof z.ZodMiniDate) {
    const format = z.globalRegistry.get(schema)?.['format'];

    return typeof format === 'string' && format.length > 0 ? format : 'yyyy-MM-dd';
  }

  if (Array.isArray(schema.def.checks)) {
    const check = schema.def.checks.find(
      (chk): chk is z.core.$ZodCheckStringFormat => chk._zod.def.check === 'string_format'
    )?._zod.def;

    if (check?.pattern instanceof RegExp) {
      pattern = check.pattern.source;
    }
  }

  return pattern;
};

const recursiveCollect = <T>(
  schema: z.ZodMiniType,
  obj: Record<string, T>,
  key: string,
  collect: (schema: z.ZodMiniType, field: string, parentKey: string) => Record<string, T>
) => {
  if (schema instanceof z.ZodMiniArray) {
    Object.assign(obj, collect(schema.def.element as z.ZodMiniType, '0', key));
  } else if (schema instanceof z.ZodMiniObject) {
    for (const prop in schema.shape) {
      if (Object.prototype.hasOwnProperty.call(schema.shape, prop)) {
        Object.assign(obj, collect(schema.shape[prop] as z.ZodMiniType, prop, key));
      }
    }
  }
};

const getFormDateFormat = (schema: z.ZodMiniType): FormDateFormat | undefined => {
  if (!(schema instanceof z.ZodMiniPipe)) {
    return undefined;
  }

  const out = schema.def.out as z.ZodMiniType | undefined;

  if (!(out instanceof z.ZodMiniUnion)) {
    return undefined;
  }

  for (const option of out.def.options) {
    const inner = option as z.ZodMiniType;

    if (inner instanceof z.ZodMiniDate) {
      const format = z.globalRegistry.get(inner)?.['format'];

      if (typeof format === 'string' && format.length > 0) {
        return format as FormDateFormat;
      }

      return 'yyyy-MM-dd';
    }
  }

  return undefined;
};

const coerceValue = (schema: z.ZodMiniType, value: unknown): unknown => {
  const format = getFormDateFormat(schema);

  if (format) {
    if (value instanceof Date || !value) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const parsed = safeParseDate(value, format);
    return parsed.success ? parsed.date : value;
  }

  return value;
};

const getSchema = (schema: z.ZodMiniType, path: string, extractEnum: boolean) => {
  let current: z.ZodMiniType = getBaseType(schema);

  const parts = path.split('.');

  for (const part of parts) {
    if (current instanceof z.ZodMiniObject) {
      current = current.shape[part] ? getBaseType(current.shape[part]) : z.undefined();
    } else if (current instanceof z.ZodMiniArray && DIGIT_RE.test(part)) {
      current = getBaseType(current.def.element);
    }

    if (
      extractEnum &&
      current instanceof z.ZodMiniEnum &&
      typeof current.def.entries === 'object' &&
      typeof Object.values(current.def.entries)[0] === 'string'
    ) {
      current = z.string();
    }
  }

  return current;
};

const hasAsyncChecksOnSchema = (schema: z.ZodMiniType): boolean => {
  const checks = (schema._zod.def as { checks?: { _zod: { def: { fn?: unknown } } }[] }).checks;

  if (Array.isArray(checks)) {
    for (const check of checks) {
      const fn = check._zod.def.fn;
      if (typeof fn === 'function' && fn.constructor.name === 'AsyncFunction') {
        return true;
      }
    }
  }

  return false;
};

const hasAsyncChecks = (schema: z.ZodMiniType): boolean => {
  if (hasAsyncChecksOnSchema(schema)) {
    return true;
  }

  const baseSchema = getBaseType(schema);

  if (baseSchema !== schema && hasAsyncChecksOnSchema(baseSchema)) {
    return true;
  }

  if (baseSchema instanceof z.ZodMiniArray) {
    if (isAsyncSchema(baseSchema.def.element as z.ZodMiniType)) {
      return true;
    }
  } else if (baseSchema instanceof z.ZodMiniObject) {
    for (const prop in baseSchema.shape) {
      if (
        Object.prototype.hasOwnProperty.call(baseSchema.shape, prop) &&
        isAsyncSchema(baseSchema.shape[prop] as z.ZodMiniType)
      ) {
        return true;
      }
    }
  }

  return false;
};

type AsyncCheckNode = { _zod: { def: { fn?: unknown; path?: PropertyKey[] } } };

const walkAsyncChecks = (
  schema: z.ZodMiniType,
  parentKey: string,
  data: unknown,
  visit: (check: AsyncCheckNode, parentKey: string) => void
): void => {
  const checks = (
    schema._zod.def as {
      checks?: AsyncCheckNode[];
    }
  ).checks;

  if (Array.isArray(checks)) {
    for (const check of checks) {
      const fn = check._zod.def.fn;

      if (typeof fn !== 'function' || fn.constructor.name !== 'AsyncFunction') {
        continue;
      }

      visit(check, parentKey);
    }
  }

  const baseSchema = getBaseType(schema);

  if (baseSchema !== schema) {
    walkAsyncChecks(baseSchema, parentKey, data, visit);
  }

  if (baseSchema instanceof z.ZodMiniArray) {
    const element = baseSchema.def.element as z.ZodMiniType;

    if (data === undefined) {
      walkAsyncChecks(element, parentKey ? `${parentKey}.0` : '0', undefined, visit);
    } else {
      const arr = parentKey ? dotPathGet(data as object, parentKey) : data;
      if (Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
          const indexKey = String(i);
          walkAsyncChecks(element, parentKey ? `${parentKey}.${indexKey}` : indexKey, data, visit);
        }
      }
    }
  } else if (baseSchema instanceof z.ZodMiniObject) {
    for (const prop in baseSchema.shape) {
      if (Object.prototype.hasOwnProperty.call(baseSchema.shape, prop)) {
        walkAsyncChecks(
          baseSchema.shape[prop] as z.ZodMiniType,
          parentKey ? `${parentKey}.${prop}` : prop,
          data,
          visit
        );
      }
    }
  }
};

const collectNestedActiveAsyncCheckPaths = (
  schema: z.ZodMiniType,
  parentKey: string,
  data: unknown,
  out: string[],
  phase: 'change' | 'submit',
  metaMap: AsyncCheckMetaMap | undefined
) => {
  walkAsyncChecks(schema, parentKey, data, (check, key) => {
    const meta = getAsyncCheckMeta(check, metaMap);

    if (meta?.submitOnly && phase !== 'submit') {
      return;
    }

    if (meta?.skipWhen) {
      const valueAtCheck = key ? dotPathGet(data as object, key) : data;
      if (meta.skipWhen(valueAtCheck, meta.getPrevAt(key))) {
        return;
      }
    }

    const suffix = combinePath(check._zod.def.path);
    const fullPath = key && suffix ? `${key}.${suffix}` : key || suffix;

    out.push(fullPath);
  });
};

const commitNestedActiveAsyncCheckPaths = (
  schema: z.ZodMiniType,
  parentKey: string,
  data: unknown,
  phase: 'change' | 'submit',
  metaMap: AsyncCheckMetaMap | undefined
) => {
  walkAsyncChecks(schema, parentKey, data, (check, key) => {
    const meta = getAsyncCheckMeta(check, metaMap);

    // Unreachable guard
    /* v8 ignore if -- @preserve */
    if (!meta) {
      return;
    }

    if (meta.submitOnly && phase !== 'submit') {
      return;
    }

    const valueAtCheck = key ? dotPathGet(data as object, key) : data;
    meta.commitAt(key, valueAtCheck);
  });
};

const collectAsyncNestedPaths = (schema: z.ZodMiniType, parentKey: string, out: string[]) => {
  walkAsyncChecks(schema, parentKey, undefined, (check, key) => {
    const suffix = combinePath(check._zod.def.path);
    const fullPath = key && suffix ? `${key}.${suffix}` : key || suffix;

    out.push(fullPath);
  });
};

const setAsyncNestedPhase = (
  schema: z.ZodMiniType,
  phase: 'change' | 'submit',
  metaMap: AsyncCheckMetaMap | undefined
) => {
  walkAsyncChecks(schema, '', undefined, (check) => {
    const meta = getAsyncCheckMeta(check, metaMap);
    meta?.setPhase(phase);
  });
};

const assertNoNestedGroups = (schema: z.ZodMiniType): void => {
  const ERROR_MESSAGE = 'Groups are only allowed on root-level schema properties.';

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodMiniArray) {
    const element = baseSchema.def.element as z.ZodMiniType;

    if (
      z.globalRegistry.get(element)?.['group'] ||
      z.globalRegistry.get(getBaseType(element))?.['group']
    ) {
      throw new Error(ERROR_MESSAGE);
    }

    assertNoNestedGroups(element);
  } else if (baseSchema instanceof z.ZodMiniObject) {
    for (const prop in baseSchema.shape) {
      // Unreachable guard
      /* v8 ignore if -- @preserve */
      if (!Object.prototype.hasOwnProperty.call(baseSchema.shape, prop)) {
        continue;
      }

      const field = baseSchema.shape[prop] as z.ZodMiniType;

      if (
        z.globalRegistry.get(field)?.['group'] ||
        z.globalRegistry.get(getBaseType(field))?.['group']
      ) {
        throw new Error(ERROR_MESSAGE);
      }

      assertNoNestedGroups(field);
    }
  }
};

// Internal functions

export const getBaseType = (value: unknown) => {
  let innerValue = value;
  let depth = 0;

  while (
    depth++ < MAX_UNWRAP_DEPTH &&
    (innerValue instanceof z.ZodMiniReadonly ||
      innerValue instanceof z.ZodMiniOptional ||
      innerValue instanceof z.ZodMiniNonOptional ||
      innerValue instanceof z.ZodMiniDefault ||
      innerValue instanceof z.ZodMiniPrefault ||
      innerValue instanceof z.ZodMiniCatch ||
      innerValue instanceof z.ZodMiniNullable ||
      innerValue instanceof z.ZodMiniPipe ||
      innerValue instanceof z.ZodMiniUnion)
  ) {
    if (innerValue instanceof z.ZodMiniPipe) {
      innerValue =
        innerValue.def.out instanceof z.ZodMiniTransform ? innerValue.def.in : innerValue.def.out;
    } else if (innerValue instanceof z.ZodMiniUnion) {
      innerValue = innerValue.def.options.find(
        (option) => !(option instanceof z.ZodMiniLiteral) && !(option instanceof z.ZodMiniTransform)
      );
    } else {
      innerValue = innerValue.def.innerType;
    }
  }

  return (innerValue ?? value) as z.ZodMiniType;
};

export function getSchemaType(schema: z.ZodMiniType, path: string) {
  return getSchema(schema, path, true).type;
}

export function getDateFormat(schema: z.ZodMiniType, path: string) {
  const pathSchema = getSchema(schema, path, false);
  const meta = z.globalRegistry.get(pathSchema);
  const formatMeta = meta?.['format'];

  const format: FormDateFormat =
    typeof formatMeta === 'string' && formatMeta.length === 10
      ? (formatMeta as FormDateFormat)
      : 'yyyy-MM-dd';

  return format;
}

export function allowEmptyString(schema: z.ZodMiniType, path: string) {
  const pathSchema = getSchema(schema, path, false);
  const meta = z.globalRegistry.get(pathSchema);

  return meta?.['allowEmpty'] !== false;
}

export const collectRequired = <T extends z.ZodMiniType>(
  schema: T,
  field: string = '',
  parentKey: string = ''
) => {
  const required: Record<string, boolean> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (
    field !== '' &&
    (z.globalRegistry.get(baseSchema)?.['required'] ||
      schema instanceof z.ZodMiniNonOptional ||
      requiredTypes.has(schema.type))
  ) {
    required[key] = true;
  }

  if (baseSchema instanceof z.ZodMiniArray && baseSchema.def.element instanceof z.ZodMiniType) {
    const elementSchema = baseSchema.def.element;
    const baseElementSchema = getBaseType(elementSchema);

    if (
      z.globalRegistry.get(baseElementSchema)?.['required'] ||
      elementSchema instanceof z.ZodMiniNonOptional ||
      requiredTypes.has(elementSchema.type)
    ) {
      required[key + '.0'] = true;
    }
  }

  recursiveCollect(baseSchema, required, key, collectRequired);

  return required as Record<keyof z.infer<T>, boolean>;
};

export const collectLengths = <T extends z.ZodMiniType>(
  schema: T,
  field: string = '',
  parentKey: string = ''
) => {
  const lengths: Record<
    string,
    { type: string; format: string; min: FieldRange; max: FieldRange }
  > = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodMiniArray || baseSchema instanceof z.ZodMiniString) {
    const length = getSchemaLength(baseSchema);

    if (length.min !== undefined || length.max !== undefined) {
      lengths[key] = length;
    }

    if (baseSchema instanceof z.ZodMiniArray) {
      const baseElementSchema = getBaseType(baseSchema.def.element);

      if (baseElementSchema instanceof z.ZodMiniString) {
        const elementLength = getSchemaLength(baseElementSchema);

        if (elementLength.min !== undefined || elementLength.max !== undefined) {
          lengths[key + '.0'] = elementLength;
        }
      }
    }
  }

  recursiveCollect(baseSchema, lengths, key, collectLengths);

  return lengths as Record<
    keyof z.infer<T>,
    { type: string; format: string; min: FieldRange; max: FieldRange }
  >;
};

export const collectRanges = <T extends z.ZodMiniType>(
  schema: T,
  field: string = '',
  parentKey: string = ''
) => {
  const ranges: Record<string, { type: string; format: string; min: FieldRange; max: FieldRange }> =
    {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodMiniNumber) {
    const range = getNumericSchemaRange(baseSchema);

    if (range.min !== undefined || range.max !== undefined) {
      ranges[key] = range;
    }
  } else if (baseSchema instanceof z.ZodMiniDate) {
    const range = getDateSchemaRange(baseSchema);

    if (range.min !== undefined || range.max !== undefined) {
      ranges[key] = range;
    }
  } else if (
    baseSchema instanceof z.ZodMiniArray &&
    baseSchema.def.element instanceof z.ZodMiniType
  ) {
    const baseElementSchema = getBaseType(baseSchema.def.element);

    if (baseElementSchema instanceof z.ZodMiniNumber) {
      const elementRange = getNumericSchemaRange(baseElementSchema);

      if (elementRange.min !== undefined || elementRange.max !== undefined) {
        ranges[key + '.0'] = elementRange;
      }
    } else if (baseElementSchema instanceof z.ZodMiniDate) {
      const elementRange = getDateSchemaRange(baseElementSchema);

      if (elementRange.min !== undefined || elementRange.max !== undefined) {
        ranges[key + '.0'] = elementRange;
      }
    }
  }

  recursiveCollect(baseSchema, ranges, key, collectRanges);

  return ranges as Record<
    keyof z.infer<T>,
    { type: string; format: string; min: FieldRange; max: FieldRange }
  >;
};

export const collectPatterns = <T extends z.ZodMiniType>(
  schema: T,
  field: string = '',
  parentKey: string = ''
) => {
  const patterns: Record<string, string | undefined> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodMiniString || baseSchema instanceof z.ZodMiniDate) {
    const pattern = getSchemaPattern(baseSchema);

    if (pattern) {
      patterns[key] = pattern;
    }
  } else if (
    baseSchema instanceof z.ZodMiniArray &&
    baseSchema.def.element instanceof z.ZodMiniType
  ) {
    const baseElementSchema = getBaseType(baseSchema.def.element);

    if (
      baseElementSchema instanceof z.ZodMiniString ||
      baseElementSchema instanceof z.ZodMiniDate
    ) {
      const elementPattern = getSchemaPattern(baseElementSchema);

      if (elementPattern) {
        patterns[key + '.0'] = elementPattern;
      }
    }
  }

  recursiveCollect(baseSchema, patterns, key, collectPatterns);

  return patterns as Record<keyof z.infer<T>, string | undefined>;
};

export const collectAsyncCheckPaths = (schema: z.ZodMiniType): readonly string[] => {
  const cached = asyncCheckPathsCache.get(schema);

  if (cached !== undefined) {
    return cached;
  }

  const paths: string[] = [];
  collectAsyncNestedPaths(schema, '', paths);

  const frozen = Object.freeze(paths);
  asyncCheckPathsCache.set(schema, frozen);

  return frozen;
};

export const coerceFormData = <T extends z.ZodMiniType>(
  rootSchema: T,
  data: z.infer<T>
): z.infer<T> => {
  const baseSchema = getBaseType(rootSchema);

  if (baseSchema instanceof z.ZodMiniObject) {
    let next: Record<string, unknown> | undefined;

    for (const key in baseSchema.shape) {
      // Unreachable guard
      /* v8 ignore if -- @preserve */
      if (!Object.prototype.hasOwnProperty.call(baseSchema.shape, key)) {
        continue;
      }

      const fieldSchema = baseSchema.shape[key] as z.ZodMiniType;
      const rawValue = (data as Record<string, unknown>)[key];
      const fieldBase = getBaseType(fieldSchema);

      const coercedValue =
        (fieldBase instanceof z.ZodMiniObject || fieldBase instanceof z.ZodMiniArray) &&
        rawValue !== null &&
        typeof rawValue === 'object'
          ? coerceFormData(fieldSchema, rawValue)
          : coerceValue(fieldSchema, rawValue);

      if (coercedValue !== rawValue) {
        next ??= { ...(data as Record<string, unknown>) };
        next[key] = coercedValue;
      }
    }
    return (next ?? data) as z.infer<T>;
  }

  if (baseSchema instanceof z.ZodMiniArray && Array.isArray(data)) {
    const arr = data as unknown[];
    const element = baseSchema.def.element as z.ZodMiniType;
    const elementBase = getBaseType(element);

    let next: unknown[] | undefined;

    for (let i = 0; i < arr.length; i++) {
      const rawValue = arr[i];
      const coercedValue =
        (elementBase instanceof z.ZodMiniObject || elementBase instanceof z.ZodMiniArray) &&
        rawValue !== null &&
        typeof rawValue === 'object'
          ? coerceFormData(element, rawValue)
          : coerceValue(element, rawValue);

      if (coercedValue !== rawValue) {
        next ??= [...arr];
        next[i] = coercedValue;
      }
    }
    return (next ?? arr) as z.infer<T>;
  }

  return data;
};

export const commitActiveAsyncCheckPaths = (
  schema: z.ZodMiniType,
  data: unknown,
  phase: 'change' | 'submit',
  metaMap?: AsyncCheckMetaMap
): void => {
  commitNestedActiveAsyncCheckPaths(schema, '', data, phase, metaMap);
};

export const collectActiveAsyncCheckPaths = (
  schema: z.ZodMiniType,
  data: unknown,
  phase: 'change' | 'submit' = 'change',
  metaMap?: AsyncCheckMetaMap
): readonly string[] => {
  const paths: string[] = [];
  collectNestedActiveAsyncCheckPaths(schema, '', data, paths, phase, metaMap);
  return paths;
};

export const setAsyncCheckPhase = (
  schema: z.ZodMiniType,
  phase: 'change' | 'submit',
  metaMap?: AsyncCheckMetaMap
): void => {
  setAsyncNestedPhase(schema, phase, metaMap);
};

export const invalidateAsyncCheckPrevByPath = (
  schema: z.ZodMiniType,
  isInvalidatedKey: (key: string) => boolean,
  metaMap: AsyncCheckMetaMap
): void => {
  walkAsyncChecks(schema, '', undefined, (check, location) => {
    const meta = getAsyncCheckMeta(check, metaMap);

    // Unreachable guard
    /* v8 ignore if -- @preserve */
    if (!meta) {
      return;
    }

    const suffix = meta.pathKey;
    const fullPath = location && suffix ? `${location}.${suffix}` : location || suffix;

    if (isInvalidatedKey(fullPath)) {
      meta.clearPrev(location);
    }
  });
};

export const registerAsyncCheckFactory = (
  check: AsyncCheck,
  factory: () => AsyncCheckMeta
): void => {
  asyncCheckFactories.set(check, factory);
};

export const getAsyncCheckMeta = (
  check: AsyncCheck,
  metaMap: AsyncCheckMetaMap | undefined
): AsyncCheckMeta | undefined => getOrCreateMetaIn(check, metaMap ?? getDefaultMapFor(check));

export const getAsyncCheckMetaForCurrentMap = (check: AsyncCheck): AsyncCheckMeta | undefined =>
  getOrCreateMetaIn(check, currentMetaMap ?? getDefaultMapFor(check));

export const runSubmitPhaseParse = async <S extends z.ZodMiniType>(
  schema: S,
  data: z.infer<S>,
  metaMap: AsyncCheckMetaMap,
  between?: (activePaths: readonly string[]) => void
): Promise<{
  activePaths: readonly string[];
  result: Awaited<ReturnType<S['safeParseAsync']>>;
}> => {
  setAsyncCheckPhase(schema, 'submit', metaMap);

  try {
    const activePaths = collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap);

    commitActiveAsyncCheckPaths(schema, data, 'submit', metaMap);

    between?.(activePaths);

    const result = (await withMetaMap(metaMap, () => schema.safeParseAsync(data))) as Awaited<
      ReturnType<S['safeParseAsync']>
    >;

    return { activePaths, result };
  } finally {
    setAsyncCheckPhase(schema, 'change', metaMap);
  }
};

export const withMetaMap = async <T>(map: AsyncCheckMetaMap, fn: () => Promise<T>): Promise<T> => {
  const prev = currentMetaMap;
  currentMetaMap = map;
  try {
    return await fn();
  } finally {
    // eslint-disable-next-line require-atomic-updates -- restoring a captured local; intentional.
    currentMetaMap = prev;
  }
};

export const isAsyncSchema = (schema: z.ZodMiniType): boolean => {
  let cached = asyncSchemaCache.get(schema);

  if (cached === undefined) {
    cached = hasAsyncChecks(schema);
    asyncSchemaCache.set(schema, cached);
  }

  return cached;
};

export const hasChangePhaseAsyncChecks = (
  schema: z.ZodMiniType,
  metaMap?: AsyncCheckMetaMap
): boolean => {
  if (!isAsyncSchema(schema)) {
    return false;
  }

  let found = false;
  walkAsyncChecks(schema, '', undefined, (check) => {
    if (found) {
      return;
    }
    const meta = getAsyncCheckMeta(check, metaMap);
    if (!meta?.submitOnly) {
      found = true;
    }
  });

  return found;
};

export const collectDescriptions = <T extends z.ZodMiniType>(
  schema: T,
  field: string = '',
  parentKey: string = ''
) => {
  const descriptions: Record<string, string | undefined> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  let description = z.globalRegistry.get(schema)?.description;

  if (!description && baseSchema instanceof z.ZodMiniType) {
    description = z.globalRegistry.get(baseSchema)?.description;
  }

  if (description) {
    descriptions[key] = description;
  }

  recursiveCollect(baseSchema, descriptions, key, collectDescriptions);

  return descriptions as Record<keyof z.infer<T> | '', string | undefined>;
};

export const collectGroups = <T extends z.ZodMiniType>(schema: T) => {
  const groups: Record<string, string> = {};

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodMiniObject) {
    for (const prop in baseSchema.shape) {
      // Unreachable guard
      /* v8 ignore if -- @preserve */
      if (!Object.prototype.hasOwnProperty.call(baseSchema.shape, prop)) {
        continue;
      }

      const field = baseSchema.shape[prop] as z.ZodMiniType;

      const group =
        z.globalRegistry.get(field)?.['group'] ??
        z.globalRegistry.get(getBaseType(field))?.['group'];

      if (typeof group === 'string' && group.length > 0) {
        groups[prop] = group;
      }

      assertNoNestedGroups(field);
    }
  }

  return groups as Record<keyof z.infer<T>, string>;
};

export const getPath = <T extends object>(_data: T, expression: (data: T) => unknown) => {
  const parts: string[] = [];
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'string') {
          parts.push(prop);
        }

        return proxy;
      },
    }
  );

  try {
    expression(proxy as T);
  } catch {
    // ignore errors of side effects
  }

  return parts as FormStatePath<T>;
};

export const getPathAsString = <T extends object>(
  _data: T,
  expression: (data: T) => unknown,
  format: 'bracket' | 'dot'
) => {
  const parts = getPath(_data, expression).map(String);

  if (format === 'dot') {
    return parts.join('.');
  }

  let result = '';

  for (const part of parts) {
    if (result === '') {
      result = part;
    } else if (Number.isInteger(Number(part))) {
      result += `[${part}]`;
    } else {
      result += `["${part}"]`;
    }
  }

  return result;
};

export const getPathNotation = <T extends z.ZodMiniObject>(path: FormStatePath<z.infer<T>>) => {
  return path
    .map((pathPart) => {
      if (DIGIT_RE.test(pathPart)) {
        // array index is stored as 0
        return '0';
      }
      return pathPart;
    })
    .join('.');
};

export const combinePath = (path: PropertyKey | PropertyKey[] | undefined) => {
  if (!Array.isArray(path)) {
    return String(path || '');
  }

  return path
    .filter((part) => typeof part !== 'symbol')
    .map((part) => part.toString())
    .join('.');
};
