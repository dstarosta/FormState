import { describe, expect, it } from 'vitest';

import type { FormMutableState, Immutable } from '../types/form-types';

import { formatDate, formDataEncode, safeParseDate, validateState, z } from '..';
import { cleanEmpty, createState, diffedState, getState, updateState } from './state-manager';
import { getSchemaType } from './schema-visitor';
import { isValidDate } from './date-formatter';
import { toInt, toFloat, toDate, toBoolean, toLiteral, toString } from './value-converter';
import { dotPathGet, dotPathSet } from './dot-path';

// Error Formatter and Schema Visitor have no public functions and are extensively tested
// by the "useFormState" tests.

describe('helpers', () => {
  describe('state manager', () => {
    const formSchema = z.object({
      a: z.array(
        z.object({
          id: z.symbol(),
          i: z.number(),
        })
      ),
      b: z.formBoolean(z.boolean()),
      b2: z.boolean(),
      n: z.formNumber(z.number()),
      s: z.formString(z.string()),
      v: z.formValues(['a', 'b']),
      z: z.object({
        id: z.formNumber(z.number()),
      }),
    });

    it('should get nested schema type correctly', () => {
      expect(getSchemaType(formSchema, 'a')).toBe('array');
      expect(getSchemaType(formSchema, 'a.0')).toBe('object');
      expect(getSchemaType(formSchema, 'a.0.id')).toBe('symbol');
      expect(getSchemaType(formSchema, 'a.0.i')).toBe('number');
      expect(getSchemaType(formSchema, 'b')).toBe('boolean');
      expect(getSchemaType(formSchema, 'b2')).toBe('boolean');
      expect(getSchemaType(formSchema, 'n')).toBe('number');
      expect(getSchemaType(formSchema, 's')).toBe('string');
      expect(getSchemaType(formSchema, 'v')).toBe('string');
      expect(getSchemaType(formSchema, 'z')).toBe('object');
      expect(getSchemaType(formSchema, 'z.id')).toBe('number');
      expect(getSchemaType(formSchema, 'xyz.id')).toBe('undefined');
    });

    it('should clean state data correctly', () => {
      const state: Immutable<z.infer<typeof formSchema>> = createState(formSchema);

      expect(state).toEqual({ a: [], b: '', b2: false, n: '', s: '', v: '', z: { id: '' } });
      expect(cleanEmpty(formSchema, state)).toEqual({ a: [], b2: false, s: '', v: '' });

      expect(cleanEmpty(formSchema, null)).toBeNull();
    });

    it('should create and update state correctly', () => {
      // The form state hook generates immutable state but createState does not.
      // We are simulating immutable state and its functions are not relevant.

      const state: Immutable<z.infer<typeof formSchema>> = createState(formSchema);

      expect(state).toEqual({ a: [], b: '', b2: false, n: '', s: '', v: '', z: { id: '' } });

      const itemState: Immutable<z.infer<typeof formSchema.shape.a.def.element>> = createState(
        formSchema.shape.a.def.element
      );

      expect(itemState.i).toBe('');
      expect(itemState.id.description).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);

      // Not possible due to immutability
      // itemState.i = 2;

      const updatedItemState = updateState(itemState, (draft) => {
        draft.i = 2;
      });

      expect(updatedItemState.id).toBe(itemState.id);
      expect(updatedItemState.i).toBe(2);

      expect(state.a).toHaveLength(0);

      const updatedArrayState = updateState(state.a, (draft) => {
        draft.push(updatedItemState);
      });

      expect(updatedArrayState).toHaveLength(1);
      expect(updatedArrayState[0]).toBe(updatedItemState);
    });

    it('should get state correctly', () => {
      const data: z.infer<typeof formSchema> = {
        a: [{ i: 1, id: Symbol(1) }],
        b: '',
        b2: true,
        n: 4,
        s: 'a',
        v: 'b',
        z: { id: 2 },
      };

      expect(getState(formSchema, data, 'a')).toBe(data.a);
      expect(getState(formSchema, data, (path) => path.a)).toBe(data.a);
      expect(getState(formSchema, data, 'c' as unknown as 'a')).toBeUndefined();
      expect(getState(formSchema, data, (path) => path.a[0])).toBe(data.a[0]);
      expect(getState(formSchema, data, (path) => path.a[1])).toBeUndefined();
      expect(getState(formSchema, data, (path) => path.a[0]?.i)).toBe(1);
      expect(getState(formSchema, data, (path) => path.a[0]?.id)).toBeTypeOf('symbol');
      expect(getState(formSchema, data, 'b')).toBe(data.b);
      expect(getState(formSchema, data, (path) => path.b)).toBe(data.b);
      expect(getState(formSchema, data, 'b2')).toBe(data.b2);
      expect(getState(formSchema, data, (path) => path.b2)).toBe(data.b2);
      expect(getState(formSchema, data, 'n')).toBe(data.n);
      expect(getState(formSchema, data, (path) => path.n)).toBe(data.n);
      expect(getState(formSchema, data, 's')).toBe(data.s);
      expect(getState(formSchema, data, (path) => path.s)).toBe(data.s);
      expect(getState(formSchema, data, 'v')).toBe(data.v);
      expect(getState(formSchema, data, (path) => path.v)).toBe(data.v);
      expect(getState(formSchema, data, 'z')).toBe(data.z);
      expect(getState(formSchema, data, (path) => path.z)).toBe(data.z);
      expect(getState(formSchema, data, (path) => path.z.id)).toBe(data.z.id);
      expect(getState(formSchema, data, (path) => path.z['id'])).toBe(data.z.id);
      expect(getState(formSchema, data, (path) => path.z['id2' as 'id'])).toBeUndefined();
    });

    it('should update state only supports arrays and objects', () => {
      expect(() => updateState(undefined, () => {})).toThrow(TypeError);
      expect(() => updateState(null as unknown as object, () => {})).toThrow(TypeError);
    });

    it('should diff state correctly', () => {
      const dataA = createState(formSchema);
      const dataB = createState(formSchema);
      dataB.b = !dataB.b;

      const stateA = { data: dataA } as FormMutableState<z.infer<typeof formSchema>>;
      const stateB = { data: dataB } as FormMutableState<z.infer<typeof formSchema>>;

      expect(diffedState(stateA, stateA)).toBe(stateA);
      expect(diffedState(stateB, stateB)).toBe(stateB);
      expect(diffedState(stateA, stateB)).toBe(stateA);
      expect(diffedState(stateB, stateA)).toBe(stateB);
    });
  });

  describe('date formatter', () => {
    it('should format dates correctly', () => {
      const date = new Date(2020, 11, 31);

      expect(formatDate(date)).toBe('2020-12-31');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2020-12-31');
      expect(formatDate(date, 'dd-MM-yyyy')).toBe('31-12-2020');
      expect(formatDate(date, 'MM-dd-yyyy')).toBe('12-31-2020');
      expect(formatDate(date, 'MM/dd/yyyy')).toBe('12/31/2020');
      expect(formatDate(date, 'dd/MM/yyyy')).toBe('31/12/2020');
      expect(formatDate(date, 'dd.MM.yyyy')).toBe('31.12.2020');
    });

    it('should throw formatting invalid dates', () => {
      expect(() => formatDate('' as unknown as Date)).toThrow(TypeError);
      expect(() => formatDate(undefined as unknown as Date)).toThrow(TypeError);
      expect(() => formatDate(new Date(Number.NaN))).toThrow(TypeError);
      expect(() => formatDate(new Date(2021, 0, 1), 'MM-MM-MM' as unknown as 'MM/dd/yyyy')).toThrow(
        TypeError
      );
    });

    it('should parse dates correctly', () => {
      let parsedDate = safeParseDate('2020-12-31');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('2020-12-31', 'yyyy-MM-dd');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('12/31/2020', 'MM/dd/yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('31/12/2020', 'dd/MM/yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('12-31-2020', 'MM-dd-yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('31-12-2020', 'dd-MM-yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));

      parsedDate = safeParseDate('31.12.2020', 'dd.MM.yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(2020, 11, 31));
    });
  });

  it('should not parse invalid dates', () => {
    let parsedDate = safeParseDate(undefined);

    expect(parsedDate.success).toBe(false);
    expect(parsedDate.date).toBeNull();

    parsedDate = safeParseDate('');

    expect(parsedDate.success).toBe(false);
    expect(parsedDate.date).toBeNull();

    parsedDate = safeParseDate('2020-99-99', 'yyyy-MM-dd');

    expect(parsedDate.success).toBe(false);
    expect(parsedDate.date).toBeNull();

    parsedDate = safeParseDate('31-12-2020', 'yyyy-MM-dd');

    expect(parsedDate.success).toBe(false);
    expect(parsedDate.date).toBeNull();

    parsedDate = safeParseDate('31-12-2020', 'MM-dd-yyyy');

    expect(parsedDate.success).toBe(false);
    expect(parsedDate.date).toBeNull();

    expect(() => safeParseDate('12-12-12', 'MM-MM-MM' as unknown as 'MM/dd/yyyy')).toThrow(
      TypeError
    );
  });

  describe('error formatter', () => {
    const formSchema = z.object({
      a: z.array(
        z.object({
          id: z.symbol(),
          i: z.formNumber(z.number(), { required: true }),
        })
      ),
      n: z.formNumber(z.number(), { required: true }),
      v: z.formValues(['a', 'b'], { required: true }),
      z: z.object({
        id: z.formNumber(z.number()),
      }),
    });

    it('validates state successfully with defaults', () => {
      const result = validateState(formSchema, { a: [{ i: 1 }], n: 2, v: 'b' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.n).toBe(2);
      expect(result.data?.v).toBe('b');
      expect(result.data?.a.length).toBe(1);
      expect(result.data?.a[0]?.id).toBeTypeOf('symbol');
      expect(result.data?.a[0]?.i).toBe(1);
      expect(result.data?.z.id).toBe('');
    });

    it('validates state unsuccessfully without defaults', () => {
      const result = validateState(formSchema, { a: [{ i: 1 }], n: 2, v: 'b' }, false);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();

      const errorKeys = Object.keys(result.error?.errors ?? {});

      expect(errorKeys).toContain('a.0.id');
      expect(errorKeys).toContain('z');
    });
  });

  describe('form builder', () => {
    it('should convert FormData into URL parameters', () => {
      const formData = new FormData();
      formData.append('param1', 'Some value');
      formData.append('param2', 'value1');
      formData.append('param2', 'value2');
      formData.append('param3', '');
      formData.append('param4', new File([], 'some<file>.txt'));

      const urlParams = formDataEncode(formData).toString();

      expect(urlParams).toBe(
        'param1=Some+value&param2=value1&param2=value2&param3=&param4=some%3Cfile%3E.txt'
      );
    });
  });

  describe('form builder', () => {
    it('should convert FormData into URL parameters except for params 3 and 4', () => {
      const formData = new FormData();
      formData.append('param1', 'Some value');
      formData.append('param2', 'value1');
      formData.append('param2', 'value2');
      formData.append('param3', '');
      formData.append('param4', new File([], 'some<file>.txt'));

      const urlParams = formDataEncode(formData, ['param4', 'param3']).toString();

      expect(urlParams).toBe('param1=Some+value&param2=value1&param2=value2');
    });
  });

  describe('value-converter', () => {
    describe('toInt', () => {
      it('returns empty string for empty input', () => {
        expect(toInt('')).toBe('');
      });

      it('parses valid integer strings', () => {
        expect(toInt('42')).toBe(42);
        expect(toInt('007')).toBe(7);
        expect(toInt('-19')).toBe(-19);
        expect(toInt('0')).toBe(0);
      });

      it('returns empty string when value is not a valid integer', () => {
        expect(toInt('12.34')).toBe('');
        expect(toInt('abc')).toBe('');
        expect(toInt('12px')).toBe('');
        expect(toInt('Infinity')).toBe('');
        expect(toInt('NaN')).toBe('');
        expect(toInt('1e3')).toBe('');
        expect(toInt('0x6')).toBe('');
        expect(toInt('100_000')).toBe('');
      });
    });

    describe('toFloat', () => {
      it('returns empty string for empty input', () => {
        expect(toFloat('')).toBe('');
      });

      it('parses valid number strings (int or float)', () => {
        expect(toFloat('42')).toBe(42);
        expect(toFloat('3.14')).toBe(3.14);
        expect(toFloat('-0.001')).toBe(-0.001);
        expect(toFloat('0')).toBe(0);
      });

      it('returns empty string for invalid float inputs', () => {
        expect(toFloat('abc')).toBe('');
        expect(toFloat('12.34.56')).toBe('');
        expect(toFloat('3,14')).toBe(''); // comma is not valid in JS parseFloat
        expect(toFloat('Infinity')).toBe('');
      });
    });

    describe('toDate', () => {
      it('returns empty string for invalid or empty date strings', () => {
        expect(toDate('')).toBe('');

        expect(toDate('invalid-date')).toBe('');
        expect(toDate('2025-13-01')).toBe(''); // invalid month
        expect(toDate('32/01/2025', { dateFormat: 'dd/MM/yyyy' })).toBe('');
      });

      it('returns valid Date object when parsing succeeds (default format)', () => {
        const result = toDate('2025-02-26') as Date;

        expect(result).toBeInstanceOf(Date);
        expect(isValidDate(result)).toBe(true);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(1); // February = 1
        expect(result.getDate()).toBe(26);
      });

      it('returns valid Date object when parsing succeeds (UTC)', () => {
        const result = toDate('2025-02-26', { asUTC: true }) as Date;

        expect(result).toBeInstanceOf(Date);
        expect(isValidDate(result)).toBe(true);
        expect(result.getUTCFullYear()).toBe(2025);
        expect(result.getUTCMonth()).toBe(1);
        expect(result.getUTCDate()).toBe(26);
      });

      it('respects custom date format when provided', () => {
        const result = toDate('26/02/2025', { dateFormat: 'dd/MM/yyyy' }) as Date;

        expect(result).toBeInstanceOf(Date);
        expect(isValidDate(result)).toBe(true);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(1);
        expect(result.getDate()).toBe(26);
      });
    });

    describe('toBoolean', () => {
      describe('non-strict mode (default)', () => {
        it.each([
          ['true', true],
          ['TRUE', true],
          ['checked', true],
          ['on', true],
          ['yes', true],
          ['Yes', true],
          ['false', false],
          ['FALSE', false],
          ['unchecked', false],
          ['off', false],
          ['no', false],
          ['No', false],
        ])('"%s" → %s', (input, expected) => {
          expect(toBoolean(input)).toBe(expected);
        });

        it('returns empty string for unknown / falsy values', () => {
          expect(toBoolean('')).toBe('');
          expect(toBoolean('maybe')).toBe('');
          expect(toBoolean('1')).toBe('');
          expect(toBoolean('0')).toBe('');
          expect(toBoolean('y')).toBe('');
        });
      });

      describe('strict mode', () => {
        it('only accepts exact "true"/"false" (case insensitive)', () => {
          expect(toBoolean('true', { strict: true })).toBe(true);
          expect(toBoolean('TRUE', { strict: true })).toBe(true);
          expect(toBoolean('false', { strict: true })).toBe(false);
          expect(toBoolean('FALSE', { strict: true })).toBe(false);
        });

        it('rejects aliases and invalid values in strict mode', () => {
          expect(toBoolean('yes', { strict: true })).toBe('');
          expect(toBoolean('on', { strict: true })).toBe('');
          expect(toBoolean('1', { strict: true })).toBe('');
          expect(toBoolean('', { strict: true })).toBe('');
          expect(toBoolean('checked', { strict: true })).toBe('');
          expect(toBoolean('maybe', { strict: true })).toBe('');
        });
      });
    });

    describe('toLiteral', () => {
      const colors = ['red', 'green', 'blue'] as const;

      it('returns the value when it matches one of the allowed literals', () => {
        expect(toLiteral('green', colors)).toBe('green');
        expect(toLiteral('red', colors)).toBe('red');
      });

      it('returns empty string when value is not in allowed list', () => {
        expect(toLiteral('yellow', colors)).toBe('');
        expect(toLiteral('', colors)).toBe('');
        expect(toLiteral('RED', colors)).toBe(''); // case sensitive
      });

      it('handles empty allowed values array', () => {
        expect(toLiteral('anything', [])).toBe('');
      });
    });

    describe('toString', () => {
      it('returns empty string for null / undefined', () => {
        expect(toString(null)).toBe('');
        expect(toString(undefined)).toBe('');
      });

      it('converts boolean values', () => {
        expect(toString(true)).toBe('true');
        expect(toString(false)).toBe('false');
      });

      it('converts numbers (including zero)', () => {
        expect(toString(42)).toBe('42');
        expect(toString(-3.14)).toBe('-3.14');
        expect(toString(0)).toBe('0');
      });

      it('returns empty string for NaN', () => {
        expect(toString(Number.NaN)).toBe('');
      });

      it('passes through strings unchanged', () => {
        expect(toString('hello')).toBe('hello');
        expect(toString('false')).toBe('false');
        expect(toString('')).toBe('');
      });

      it('treats empty string as "false" only when option is enabled', () => {
        expect(toString('', { emptyStringAsFalse: true })).toBe('false');
        expect(toString('', { emptyStringAsFalse: false })).toBe('');
        expect(toString('')).toBe(''); // default = false
      });

      it('formats valid Date objects (default format)', () => {
        const date = new Date(2025, 1, 26);
        const result = toString(date);

        expect(result).toMatch(/2025-02-26/);
      });

      it('uses custom date format when provided', () => {
        const date = new Date(2025, 1, 26);
        const result = toString(date, { dateFormat: 'dd/MM/yyyy' });

        expect(result).toMatch(/26\/02\/2025/);
      });

      it('returns empty string for invalid Date objects', () => {
        const invalid = new Date('invalid');

        expect(toString(invalid)).toBe('');
      });
    });
  });

  describe('dot-path', () => {
    describe('get', () => {
      it('should get a simple property', () => {
        const obj = { a: 1 };

        expect(dotPathGet(obj, 'a')).toBe(1);
      });

      it('should get a nested property', () => {
        const obj = { a: { b: { c: 2 } } };

        expect(dotPathGet(obj, 'a.b.c')).toBe(2);
      });

      it('should handle array indices', () => {
        const obj = { a: [1, 2, 3] };

        expect(dotPathGet(obj, 'a.1')).toBe(2);
      });

      it('should handle $end for arrays', () => {
        const obj = { a: [1, 2, 3] };

        expect(dotPathGet(obj, 'a.$end')).toBe(3);
      });

      it('should handle array of paths', () => {
        const obj = { a: { b: { c: 3 } } };

        expect(dotPathGet(obj, ['a', 'b', 'c'])).toBe(3);
      });

      it('should handle numeric prop', () => {
        const obj = { '123': 'value' };

        expect(dotPathGet(obj, 123)).toBe('value');
      });

      it('should handle escaped dots in path', () => {
        const obj = { 'a.b': { c: 4 } };

        expect(dotPathGet(obj, String.raw`a\.b.c`)).toBe(4);
      });

      it('should return undefined for non-existent property without default', () => {
        const obj = { a: 1 };

        expect(dotPathGet(obj, 'b')).toBeUndefined();
      });

      it('should return undefined when path goes through null', () => {
        const obj = { a: null };

        expect(dotPathGet(obj, 'a.b.c')).toBeUndefined();
      });

      it('should return undefined when path goes through string primitive', () => {
        const obj = { a: 'hello' };

        expect(dotPathGet(obj, 'a.b')).toBeUndefined();
      });

      it('should return undefined when path goes through boolean primitive', () => {
        const obj = { a: true };

        expect(dotPathGet(obj, 'a.b')).toBeUndefined();
      });

      it('should return undefined when path goes through number primitive', () => {
        const obj = { a: 42 };

        expect(dotPathGet(obj, 'a.b')).toBeUndefined();
      });

      it('should return undefined when path goes through undefined', () => {
        const obj = {};

        expect(dotPathGet(obj, 'a.b.c')).toBeUndefined();
      });
    });

    describe('set', () => {
      it('should set a simple property', () => {
        const obj = { a: 1 };
        const result = dotPathSet(obj, 'b', 2);

        expect(result).toEqual({ a: 1, b: 2 });
        expect(obj).toEqual({ a: 1 });
      });

      it('should set a nested property', () => {
        const obj = { a: { b: 1 } };
        const result = dotPathSet(obj, 'a.b', 2);

        expect(result).toEqual({ a: { b: 2 } });
        expect(obj.a.b).toBe(1);
      });

      it('should create nested structure if not exists', () => {
        const obj = {};
        const result = dotPathSet(obj, 'a.b.c', 3);

        expect(result).toEqual({ a: { b: { c: 3 } } });
      });

      it('should handle arrays immutably', () => {
        const obj = { a: [1, 2, 3] };
        const result = dotPathSet(obj, 'a.1', 5);

        expect(result).toEqual({ a: [1, 5, 3] });
        expect(obj.a[1]).toBe(2);
      });

      it('should handle $end for arrays', () => {
        const obj = { a: [1, 2, 3] };
        const result = dotPathSet(obj, 'a.$end', 9);

        expect(result).toEqual({ a: [1, 2, 9] });
      });

      it('should handle function values', () => {
        const obj = { a: { b: 5 } };
        const result = dotPathSet(obj, 'a.b', (current: unknown) => (current as number) * 2);

        expect(result).toEqual({ a: { b: 10 } });
      });

      it('should handle array of paths', () => {
        const obj = { a: { b: 1 } };
        const result = dotPathSet(obj, ['a', 'b'], 2);

        expect(result).toEqual({ a: { b: 2 } });
      });

      it('should handle numeric prop', () => {
        const obj = {};
        const result = dotPathSet(obj, 123, 'value');

        expect(result).toEqual({ '123': 'value' });
      });

      it('should throw error for invalid array index', () => {
        const obj = { a: [1, 2, 3] };

        expect(() => dotPathSet(obj, 'a.invalid', 5)).toThrow(
          "Array index 'invalid' has to be an integer"
        );
      });

      it('should handle escaped dots in path', () => {
        const obj = { 'a.b': { c: 1 } };
        const result = dotPathSet(obj, String.raw`a\.b.c`, 2);

        expect(result).toEqual({ 'a.b': { c: 2 } });
      });
    });
  });
});
