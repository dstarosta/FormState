import * as z from 'zod/v4';
import type { FieldRange, FormStatePath } from '../form-types';
import { toUTC } from './date-formatter';

// Private methods

const getSchemaMaxLength = (schema: z.ZodString | z.ZodArray) => {
  let maxLength: number | undefined;

  if (
    schema instanceof z.ZodString &&
    typeof schema.maxLength === 'number' &&
    Number.isInteger(schema.maxLength)
  ) {
    maxLength = schema.maxLength;
  } else if (schema instanceof z.ZodArray && Array.isArray(schema.def.checks)) {
    const check = schema.def.checks.find(
      (chk): chk is z.core.$ZodCheckMaxLength => chk._zod?.def?.check === 'max_length'
    )?._zod.def;

    if (check) {
      maxLength = check.maximum;
    }
  }

  return maxLength;
};

const getNumericSchemaRange = (schema: z.ZodNumber) => {
  const minValue =
    schema.minValue !== null &&
    !Number.isNaN(schema.minValue) &&
    schema.minValue !== Number.NEGATIVE_INFINITY
      ? schema.minValue
      : undefined;

  const maxValue =
    schema.maxValue !== null &&
    !Number.isNaN(schema.maxValue) &&
    schema.maxValue !== Number.POSITIVE_INFINITY
      ? schema.maxValue
      : undefined;

  const hasNonInteger =
    (minValue !== undefined && !Number.isInteger(minValue)) ||
    (maxValue !== undefined && !Number.isInteger(maxValue));

  const numberFormat = hasNonInteger ? 'numeric' : 'integer';

  return { min: minValue, max: maxValue, format: numberFormat };
};

const getDateSchemaRange = (schema: z.ZodDate) => {
  const minCheck = schema.def.checks?.find(
    (chk): chk is z.core.$ZodCheckGreaterThan<Date> => chk._zod?.def?.check === 'greater_than'
  )?._zod.def;

  const maxCheck = schema.def.checks?.find(
    (chk): chk is z.core.$ZodCheckLessThan<Date> => chk._zod?.def?.check === 'less_than'
  )?._zod.def;

  const minDate = minCheck?.value instanceof Date ? minCheck.value : undefined;
  const maxDate = maxCheck?.value instanceof Date ? maxCheck.value : undefined;

  let dateFormat = 'yyyy-MM-dd';

  const meta = schema.meta();

  if (meta && typeof meta['format'] === 'string' && meta['format'].length > 0) {
    dateFormat = meta['format'];
  }

  return { min: toUTC(minDate), max: toUTC(maxDate), format: dateFormat };
};

const getSchemaPattern = (schema: z.ZodString) => {
  let pattern: string | undefined;

  if (Array.isArray(schema.def.checks)) {
    const check = schema.def.checks.find(
      (chk): chk is z.core.$ZodCheckStringFormat => chk._zod?.def?.check === 'string_format'
    )?._zod.def;

    if (check?.pattern instanceof RegExp) {
      pattern = check.pattern.source;
    }
  }

  return pattern;
};

const recursiveCollect = <T>(
  schema: z.ZodType,
  obj: Record<string, T>,
  key: string,
  collect: (schema: z.ZodType, field: string, parentKey: string) => Record<string, T>
) => {
  if (
    schema instanceof z.ZodArray &&
    (schema.element instanceof z.ZodArray ||
      schema.element instanceof z.ZodObject ||
      schema.element instanceof z.ZodNumber ||
      schema.element instanceof z.ZodUnion)
  ) {
    Object.assign(obj, collect(schema.element, '0', key));
  } else if (schema instanceof z.ZodObject) {
    for (const prop in schema.shape) {
      if (Object.prototype.hasOwnProperty.call(schema.shape, prop)) {
        Object.assign(obj, collect(schema.shape[prop] as z.ZodType, prop, key));
      }
    }
  }
};

// Internal methods

export const getBaseType = (value: unknown) => {
  let innerValue = value;

  while (
    innerValue instanceof z.ZodReadonly ||
    innerValue instanceof z.ZodOptional ||
    innerValue instanceof z.ZodNonOptional ||
    innerValue instanceof z.ZodDefault ||
    innerValue instanceof z.ZodPrefault ||
    innerValue instanceof z.ZodCatch ||
    innerValue instanceof z.ZodNullable ||
    innerValue instanceof z.ZodPipe ||
    innerValue instanceof z.ZodUnion
  ) {
    if (innerValue instanceof z.ZodPipe) {
      innerValue = innerValue.def.out instanceof z.ZodTransform ? innerValue.in : innerValue.out;
    } else if (innerValue instanceof z.ZodUnion) {
      innerValue = innerValue.options.find(
        (option) => !(option instanceof z.ZodLiteral) && !(option instanceof z.ZodTransform)
      );
    } else {
      innerValue = innerValue.def.innerType;
    }
  }

  return innerValue as z.ZodType;
};

export function getSchemaType(schema: z.ZodType, path: string) {
  let current: z.ZodType = getBaseType(schema);

  const parts = path.split('.');

  for (const part of parts) {
    if (current instanceof z.ZodObject) {
      current = current.shape[part] ? getBaseType(current.shape[part]) : z.undefined();
    } else if (current instanceof z.ZodArray && /^\d+$/.test(part)) {
      current = getBaseType(current.element);
    }

    if (
      current instanceof z.ZodEnum &&
      typeof current.enum === 'object' &&
      typeof Object.values(current.enum)[0] === 'string'
    ) {
      current = z.string();
    }
  }

  return current?.type;
}

export const collectMaxLengths = (
  schema: z.ZodType,
  field: string = '',
  parentKey: string = ''
): Record<string, number> => {
  const maxLengths: Record<string, number> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodArray || baseSchema instanceof z.ZodString) {
    const maxLength = getSchemaMaxLength(baseSchema);

    if (typeof maxLength === 'number') {
      maxLengths[key] = maxLength;
    }

    if (baseSchema instanceof z.ZodArray) {
      const baseElementSchema = getBaseType(baseSchema.element);

      if (baseElementSchema instanceof z.ZodString) {
        const elementMaxLength = getSchemaMaxLength(baseElementSchema);

        if (typeof elementMaxLength === 'number') {
          maxLengths[key + '.0'] = elementMaxLength;
        }
      }
    }
  }

  recursiveCollect(baseSchema, maxLengths, key, collectMaxLengths);

  return maxLengths;
};

export const collectRanges = (
  schema: z.ZodType,
  field: string = '',
  parentKey: string = ''
): Record<string, { min: FieldRange; max: FieldRange; format: string }> => {
  const ranges: Record<string, { min: FieldRange; max: FieldRange; format: string }> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodNumber) {
    const range = getNumericSchemaRange(baseSchema);

    if (range.min !== undefined || range.max !== undefined) {
      ranges[key] = range;
    }
  } else if (baseSchema instanceof z.ZodDate) {
    const range = getDateSchemaRange(baseSchema);

    if (range.min !== undefined || range.max !== undefined) {
      ranges[key] = range;
    }
  } else if (baseSchema instanceof z.ZodArray) {
    const baseElementSchema = getBaseType(baseSchema.element);

    if (baseElementSchema instanceof z.ZodNumber) {
      const elementRange = getNumericSchemaRange(baseElementSchema);

      if (elementRange.min !== undefined || elementRange.max !== undefined) {
        ranges[key + '.0'] = elementRange;
      }
    } else if (baseElementSchema instanceof z.ZodDate) {
      const elementRange = getDateSchemaRange(baseElementSchema);

      if (elementRange.min !== undefined || elementRange.max !== undefined) {
        ranges[key + '.0'] = elementRange;
      }
    }
  }

  recursiveCollect(baseSchema, ranges, key, collectRanges);

  return ranges;
};

export const collectDescriptions = (
  schema: z.ZodType,
  field: string = '',
  parentKey: string = ''
): Record<string, string | undefined> => {
  const descriptions: Record<string, string | undefined> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  let description = schema.description;

  if (!description && baseSchema instanceof z.ZodType) {
    description = baseSchema.description;
  }

  if (description) {
    descriptions[key] = description;
  }

  if (baseSchema instanceof z.ZodArray) {
    const baseElementSchema = getBaseType(baseSchema.element);

    if (baseElementSchema.description) {
      descriptions[key + '.0'] = baseElementSchema.description;
    }
  }

  recursiveCollect(baseSchema, descriptions, key, collectDescriptions);

  return descriptions;
};

export const collectPatterns = (
  schema: z.ZodType,
  field: string = '',
  parentKey: string = ''
): Record<string, string | undefined> => {
  const patterns: Record<string, string | undefined> = {};
  const key = parentKey ? `${parentKey}.${field}` : field;

  const baseSchema = getBaseType(schema);

  if (baseSchema instanceof z.ZodString) {
    const pattern = getSchemaPattern(baseSchema);

    if (pattern) {
      patterns[key] = pattern;
    }
  } else if (baseSchema instanceof z.ZodArray) {
    const baseElementSchema = getBaseType(baseSchema.element);

    if (baseElementSchema instanceof z.ZodString) {
      const elementPattern = getSchemaPattern(baseElementSchema);

      if (elementPattern) {
        patterns[key + '.0'] = elementPattern;
      }
    }
  }

  recursiveCollect(baseSchema, patterns, key, collectPatterns);

  return patterns;
};

export const getPath = <T extends object>(_data: T, expression: (data: T) => unknown) => {
  const parts: string[] = [];

  const proxy = (() => {
    const handler: ProxyHandler<object> = {
      get(_target, prop) {
        if (typeof prop === 'string') {
          parts.push(prop);
        }

        return proxy;
      },
    };

    return new Proxy({}, handler) as T;
  })();

  try {
    expression(proxy);
  } catch {
    // ignore errors of side effects
  }

  return parts as FormStatePath<T>;
};

export const getPathNotation = <T extends z.ZodObject>(path: FormStatePath<z.infer<T>>) => {
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
