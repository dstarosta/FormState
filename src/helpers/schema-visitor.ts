import * as z from 'zod/mini';

import type { FieldRange, FormStatePath } from '../types/form-types';
import { toUTC } from './date-formatter';

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

// Private functions

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

const getSchemaPattern = (schema: z.ZodMiniString) => {
  let pattern: string | undefined;

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
  if (
    schema instanceof z.ZodMiniArray &&
    (schema.def.element instanceof z.ZodMiniArray ||
      schema.def.element instanceof z.ZodMiniObject ||
      schema.def.element instanceof z.ZodMiniNumber ||
      schema.def.element instanceof z.ZodMiniUnion)
  ) {
    Object.assign(obj, collect(schema.def.element, '0', key));
  } else if (schema instanceof z.ZodMiniObject) {
    for (const prop in schema.shape) {
      if (Object.prototype.hasOwnProperty.call(schema.shape, prop)) {
        Object.assign(obj, collect(schema.shape[prop] as z.ZodMiniType, prop, key));
      }
    }
  }
};

const getSchema = (schema: z.ZodMiniType, path: string, extractEnum: boolean) => {
  let current: z.ZodMiniType = getBaseType(schema);

  const parts = path.split('.');

  for (const part of parts) {
    if (current instanceof z.ZodMiniObject) {
      current = current.shape[part] ? getBaseType(current.shape[part]) : z.undefined();
    } else if (current instanceof z.ZodMiniArray && /^\d+$/.test(part)) {
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

// Internal functions

export const getBaseType = (value: unknown) => {
  let innerValue = value;

  while (
    innerValue instanceof z.ZodMiniReadonly ||
    innerValue instanceof z.ZodMiniOptional ||
    innerValue instanceof z.ZodMiniNonOptional ||
    innerValue instanceof z.ZodMiniDefault ||
    innerValue instanceof z.ZodMiniPrefault ||
    innerValue instanceof z.ZodMiniCatch ||
    innerValue instanceof z.ZodMiniNullable ||
    innerValue instanceof z.ZodMiniPipe ||
    innerValue instanceof z.ZodMiniUnion
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

  if (baseSchema instanceof z.ZodMiniString) {
    const pattern = getSchemaPattern(baseSchema);

    if (pattern) {
      patterns[key] = pattern;
    }
  } else if (
    baseSchema instanceof z.ZodMiniArray &&
    baseSchema.def.element instanceof z.ZodMiniType
  ) {
    const baseElementSchema = getBaseType(baseSchema.def.element);

    if (baseElementSchema instanceof z.ZodMiniString) {
      const elementPattern = getSchemaPattern(baseElementSchema);

      if (elementPattern) {
        patterns[key + '.0'] = elementPattern;
      }
    }
  }

  recursiveCollect(baseSchema, patterns, key, collectPatterns);

  return patterns as Record<keyof z.infer<T>, string | undefined>;
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

  if (baseSchema instanceof z.ZodMiniArray && baseSchema.def.element instanceof z.ZodMiniType) {
    const baseElementSchema = getBaseType(baseSchema.def.element);

    if (z.globalRegistry.get(baseElementSchema)?.description) {
      descriptions[key + '.0'] = z.globalRegistry.get(baseElementSchema)?.description;
    }
  }

  recursiveCollect(baseSchema, descriptions, key, collectDescriptions);

  return descriptions as Record<keyof z.infer<T>, string | undefined>;
};

const pathParts: string[] = [];

const pathProxy: object = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === 'string') {
        pathParts.push(prop);
      }

      return pathProxy;
    },
  }
);

export const getPath = <T extends object>(_data: T, expression: (data: T) => unknown) => {
  pathParts.length = 0;

  try {
    expression(pathProxy as T);
  } catch {
    // ignore errors of side effects
  }

  return [...pathParts] as FormStatePath<T>;
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
      if (!Number.isNaN(Number.parseInt(pathPart, 10))) {
        // array index is stored as 0
        return '0';
      }
      return pathPart;
    })
    .join('.');
};
