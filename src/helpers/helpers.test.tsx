import { createRef } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import type { FormMutableState, Immutable } from '../types/form-types';

import { formatDate, formDataEncode, safeParseDate, z } from '..';
import {
  cleanEmpty,
  createState,
  diffedState,
  getState,
  parseState,
  updateState,
} from './state-manager';
import { getSchemaType } from './schema-visitor';
import { isValidDate } from './date-formatter';
import {
  toInt,
  toFloat,
  toDate,
  toBoolean,
  toLiteral,
  toString,
  asBoolean,
  asNumber,
  asDateString,
} from './value-converter';
import { dotPathGet, dotPathSet } from './dot-path';
import { debounce } from './debouncer';
import { classNames } from './class-helper';
import { createFormStore } from './form-store';
import { createUseWatch } from './use-watch-builder';
import { FormResetBlocker } from './form-reset-blocker';
import { mergeRefs } from './ref-merge';
import { generateUniqueId } from './random-id-generator';
import { useDeepMemo } from './use-deep-memo';

const mockUseFormStatus = vi.hoisted(() => vi.fn(() => ({ pending: false })));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, useFormStatus: mockUseFormStatus };
});

// Error Formatter and Schema Visitor have no public functions and are extensively tested
// by the "useFormState" tests.

describe('helpers', () => {
  describe('state manager', () => {
    const formSchema = z.object({
      a: z.array(
        z.object({
          id: z.symbol(),
          i: z.formNumber({ required: true }),
        })
      ),
      b: z.formBoolean(),
      b2: z.formBoolean({ required: true }),
      n: z.formNumber(),
      s: z.formString(),
      s2: z.formString({ allowEmpty: false }),
      v: z.formValues(['a', 'b']),
      z: z.object({
        id: z.formNumber(),
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

      expect(state).toEqual({
        a: [],
        b: '',
        b2: false,
        n: '',
        s: '',
        s2: '',
        v: '',
        z: { id: '' },
      });

      const extendedState = {
        ...state,
        someFunc: () => {},
        prom: Promise.resolve(),
        abc: undefined,
      };

      expect(cleanEmpty(formSchema, extendedState)).toEqual({
        a: [],
        b2: false,
        s: '',
      });
      expect(cleanEmpty(formSchema, null)).toBeNull();
    });

    it('should create and update state correctly', () => {
      // The form state hook generates immutable state but createState does not.
      // We are simulating immutable state and its functions are not relevant.

      const state: Immutable<z.infer<typeof formSchema>> = createState(formSchema);

      expect(state).toEqual({
        a: [],
        b: '',
        b2: false,
        n: '',
        s: '',
        s2: '',
        v: '',
        z: { id: '' },
      });

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
        s2: 'aa',
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

    it('ignores non-array incoming value for array field', () => {
      const state = createState(formSchema, { a: 'not-an-array' as unknown as [] });

      expect(state.a).toEqual([]);
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

    parsedDate = safeParseDate('abcd1234', 'MM/dd/yyyy');

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
          i: z.formNumber({ required: true, error: 'Invalid a[].i value' }),
        })
      ),
      n: z.formNumber({ required: true, error: 'Invalid n value' }),
      v: z.formValues(['a', 'b'], { required: true, error: 'Invalid v value' }),
      y: z.formBoolean({ error: 'Invalid y value' }),
      z: z.object({
        id: z.formNumber(),
      }),
    });

    it('parses state successfully with defaults', () => {
      const { success, data, errors } = parseState(formSchema, { a: [{ i: 1 }], n: 2, v: 'b' });
      const idSymbol = data.a[0]?.id;

      expect(success).toBe(true);
      expect(idSymbol).toBeTypeOf('symbol');
      expect(data).toStrictEqual({
        a: [{ i: 1, id: idSymbol }],
        n: 2,
        v: 'b',
        y: '',
        z: { id: '' },
      });
      expect(errors.getAll()).toHaveLength(0);
    });

    it('parses state unsuccessfully without defaults', () => {
      const { success, data, errors } = parseState(formSchema, {
        n: '2',
        v: 1,
        y: 'false',
        z: { id: 1 },
      });

      expect(success).toBe(false);
      expect(errors['n']).toEqual('Invalid n value');
      expect(errors.get((path) => path.n)).toEqual('Invalid n value');
      expect(errors['v']).toEqual('Invalid v value');
      expect(errors.get((path) => path.v)).toEqual('Invalid v value');
      expect(errors['y']).toEqual('Invalid y value');
      expect(errors.get((path) => path.y)).toEqual('Invalid y value');
      expect(errors['a']).toBeUndefined();
      expect(errors.get((path) => path.a)).toBeUndefined();
      expect(errors['z']).toBeUndefined();
      expect(errors.get((path) => path.z)).toBeUndefined();
      expect(errors.getAll()).toStrictEqual([
        'Invalid n value',
        'Invalid v value',
        'Invalid y value',
      ]);
      expect(errors.getKeys()).toStrictEqual(['n', 'v', 'y']);

      expect(data).toStrictEqual({
        a: [],
        n: '2',
        v: 1,
        y: 'false',
        z: { id: 1 },
      });
    });

    it('parses state unsuccessfully without data', () => {
      expect(() => {
        parseState(formSchema, null as unknown as object);
      }).toThrow(TypeError);
    });

    it('parses state successfully with asSchemaData = true, stripping empty form values', () => {
      const { success, data } = parseState(formSchema, { a: [{ i: 1 }], n: 2, v: 'b' }, true);

      expect(success).toBe(true);
      // Symbols, empty formBoolean (y), and nested formNumber (z.id) are stripped by toObject()
      expect(data).toStrictEqual({
        a: [{ i: 1 }],
        n: 2,
        v: 'b',
      });
    });

    it('asSchemaData = true strips data on a failed parse', () => {
      const { success, data } = parseState(formSchema, { n: '2', v: 1 }, true);

      expect(success).toBe(false);
      // Empty formBoolean (y) and nested formNumber (z.id) are stripped even on failure
      expect(data).toStrictEqual({
        a: [],
        n: '2',
        v: 1,
      });
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
      expect(decodeURIComponent(urlParams)).toBe(
        'param1=Some+value&param2=value1&param2=value2&param3=&param4=some<file>.txt'
      );
    });

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

    describe('notation', () => {
      it('converts bracket string keys to dot notation', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info["age"]', '30');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe('name=Alice&info.age=30');
      });

      it('converts bracket numeric indices to dot notation', () => {
        const formData = new FormData();
        formData.append('tags[0]', 'a');
        formData.append('tags[1]', 'b');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe('tags.0=a&tags.1=b');
      });

      it('converts deeply nested bracket keys to dot notation', () => {
        const formData = new FormData();
        formData.append('a["b"]["c"]', 'val');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe('a.b.c=val');
      });

      it('converts mixed bracket keys (string and numeric) to dot notation', () => {
        const formData = new FormData();
        formData.append('items[0]["name"]', 'Alice');
        formData.append('items[1]["name"]', 'Bob');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe(
          'items.0.name=Alice&items.1.name=Bob'
        );
      });

      it('converts dot string keys to bracket notation', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info.age', '30');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(urlParams).toBe('name=Alice&info%5B%22age%22%5D=30');
        expect(decodeURIComponent(urlParams)).toBe('name=Alice&info["age"]=30');
      });

      it('converts dot numeric indices to bracket notation', () => {
        const formData = new FormData();
        formData.append('tags.0', 'a');
        formData.append('tags.1', 'b');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(urlParams).toBe('tags%5B0%5D=a&tags%5B1%5D=b');
        expect(decodeURIComponent(urlParams)).toBe('tags[0]=a&tags[1]=b');
      });

      it('converts deeply nested dot keys to bracket notation', () => {
        const formData = new FormData();
        formData.append('a.b.c', 'val');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(urlParams).toBe('a%5B%22b%22%5D%5B%22c%22%5D=val');
        expect(decodeURIComponent(urlParams)).toBe('a["b"]["c"]=val');
      });

      it('converts mixed dot keys (string and numeric) to bracket notation', () => {
        const formData = new FormData();
        formData.append('items.0.name', 'Alice');
        formData.append('items.1.name', 'Bob');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(urlParams).toBe(
          'items%5B0%5D%5B%22name%22%5D=Alice&items%5B1%5D%5B%22name%22%5D=Bob'
        );
        expect(decodeURIComponent(urlParams)).toBe('items[0]["name"]=Alice&items[1]["name"]=Bob');
      });

      it('leaves bracket keys unchanged under bracket notation', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info["age"]', '30');
        formData.append('items[0]["name"]', 'Bob');

        const urlParams = formDataEncode(formData, [], 'bracket').toString();

        expect(decodeURIComponent(urlParams)).toBe(
          'name=Alice&info["age"]=30&items[0]["name"]=Bob'
        );
      });

      it('leaves dot keys unchanged under dot notation', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info.age', '30');
        formData.append('items.0.name', 'Bob');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe(
          'name=Alice&info.age=30&items.0.name=Bob'
        );
      });

      it('leaves flat keys unchanged under either notation', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('email', 'alice@example.com');

        expect(formDataEncode(formData, [], 'dot').toString()).toBe(
          formDataEncode(formData, [], 'bracket').toString()
        );
      });

      it('applies notation and omitNames together', () => {
        const formData = new FormData();
        formData.append('name', 'Alice');
        formData.append('info["age"]', '30');
        formData.append('_csrf', 'token');

        expect(formDataEncode(formData, ['_csrf'], 'dot').toString()).toBe(
          'name=Alice&info.age=30'
        );
      });

      it('applies notation to file entry names', () => {
        const formData = new FormData();
        formData.append('attachments[0]', new File([], 'report.pdf'));

        expect(formDataEncode(formData, [], 'dot').toString()).toBe('attachments.0=report.pdf');
      });

      it('does not alter keys when notation is omitted', () => {
        const formData = new FormData();
        formData.append('info["age"]', '30');
        formData.append('info.name', 'Alice');

        const urlParams = formDataEncode(formData).toString();

        expect(urlParams).toBe('info%5B%22age%22%5D=30&info.name=Alice');
        expect(decodeURIComponent(urlParams)).toBe('info["age"]=30&info.name=Alice');
      });

      describe('useFormState inferredNameFormat defaults', () => {
        it('bracket keys (inferredNameFormat default) round-trip through dot notation', () => {
          // Simulates FormData produced when inferredNameFormat is 'bracket' (the useFormState default)
          const formData = new FormData();
          formData.append('name', 'Alice');
          formData.append('info["age"]', '30');
          formData.append('tags[0]', 'typescript');
          formData.append('tags[1]', 'react');

          expect(formDataEncode(formData, [], 'dot').toString()).toBe(
            'name=Alice&info.age=30&tags.0=typescript&tags.1=react'
          );
        });

        it('dot keys (inferredNameFormat: dot) round-trip through bracket notation', () => {
          // Simulates FormData produced when inferredNameFormat is 'dot'
          const formData = new FormData();
          formData.append('name', 'Alice');
          formData.append('info.age', '30');
          formData.append('tags.0', 'typescript');
          formData.append('tags.1', 'react');

          const urlParams = formDataEncode(formData, [], 'bracket').toString();

          expect(urlParams).toBe(
            'name=Alice&info%5B%22age%22%5D=30&tags%5B0%5D=typescript&tags%5B1%5D=react'
          );
          expect(decodeURIComponent(urlParams)).toBe(
            'name=Alice&info["age"]=30&tags[0]=typescript&tags[1]=react'
          );
        });

        it('dot keys (inferredNameFormat: dot) are unchanged without notation', () => {
          // When inferredNameFormat is 'dot', omitting notation preserves dot keys as-is
          const formData = new FormData();
          formData.append('name', 'Alice');
          formData.append('info.age', '30');

          expect(formDataEncode(formData).toString()).toBe('name=Alice&info.age=30');
        });
      });
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

    describe('asBoolean', () => {
      it('converts a valid boolean value', () => {
        expect(asBoolean(true)).toBe(true);
        expect(asBoolean(false)).toBe(false);
        expect(asBoolean(true, false)).toBe(true);
        expect(asBoolean(false, true)).toBe(false);
      });

      it('converts an empty string to the default value', () => {
        expect(asBoolean('')).toBe(false);
        expect(asBoolean('', false)).toBe(false);
        expect(asBoolean('', true)).toBe(true);
      });
    });

    describe('asNumber', () => {
      it('converts a valid number value', () => {
        expect(asNumber(0)).toBe(0);
        expect(asNumber(0, 1)).toBe(0);
        expect(asNumber(Infinity)).toBe(Infinity);
        expect(asNumber(Infinity, 1)).toBe(Infinity);
        expect(asNumber(-1.2451)).toBe(-1.2451);
        expect(asNumber(-1.2451, 1)).toBe(-1.2451);
      });

      it('converts an empty string to the default value', () => {
        expect(asNumber('')).toBe(0);
        expect(asNumber('', 1)).toBe(1);
        expect(asNumber('', -1.2451)).toBe(-1.2451);
      });
    });

    describe('asDateString', () => {
      it('converts a valid Date value', () => {
        expect(asDateString(new Date(2022, 1, 28), 'yyyy-MM-dd')).toBe('2022-02-28');
        expect(asDateString(new Date(2022, 1, 28))).toBe('2022-02-28');
        // eslint-disable-next-line sonarjs/no-undefined-argument
        expect(asDateString(new Date(2022, 1, 28), undefined)).toBe('2022-02-28');
        expect(asDateString(new Date(2022, 21, 28), 'MM/dd/yyyy')).toBe('10/28/2023');
        expect(asDateString(new Date('invalid value'))).toBe('Invalid Date');

        expect(() => {
          asDateString(new Date(2022, 21, 28), 'MMddyyyy');
        }).throws(TypeError);
      });

      it('passes a string value through', () => {
        expect(asDateString('2022-02-28')).toBe('2022-02-28');
        expect(asDateString('Invalid Date')).toBe('Invalid Date');
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
          "Array index 'invalid' must be a non-negative integer."
        );
      });

      it('should return the same reference when setting a primitive to its current value', () => {
        const obj = { a: { b: 1 } };
        const result = dotPathSet(obj, 'a.b', 1);

        expect(result).toBe(obj);
      });

      it('should return the same reference when setting an object slot to the same reference', () => {
        const inner = { c: 1 };
        const obj = { a: { b: inner } };
        const result = dotPathSet(obj, 'a.b', inner);

        expect(result).toBe(obj);
        expect((result as { a: { b: unknown } }).a).toBe(obj.a);
      });

      it('should return the same reference when an updater returns the existing leaf value', () => {
        const obj = { a: { b: 1 } };
        const result = dotPathSet(obj, 'a.b', (current: unknown) => current);

        expect(result).toBe(obj);
      });

      it('should return the same array reference when setting an index to its current value', () => {
        const obj = { items: [10, 20, 30] };
        const result = dotPathSet(obj, 'items.1', 20);

        expect(result).toBe(obj);
        expect((result as { items: number[] }).items).toBe(obj.items);
      });

      it('should handle escaped dots in path', () => {
        const obj = { 'a.b': { c: 1 } };
        const result = dotPathSet(obj, String.raw`a\.b.c`, 2);

        expect(result).toEqual({ 'a.b': { c: 2 } });
      });
    });
  });

  describe('mergeRefs', () => {
    it('assigns the node to object refs and nulls them on cleanup', () => {
      const ref = createRef<HTMLDivElement>();
      const node = document.createElement('div');

      const cleanupRefs = mergeRefs<HTMLDivElement>(ref)(node);

      expect(ref.current).toBe(node);

      cleanupRefs();

      expect(ref.current).toBeNull();
    });

    it('calls a legacy function ref with the node and again with null on cleanup', () => {
      const fn = vi.fn();
      const node = document.createElement('div');

      const cleanupRefs = mergeRefs<HTMLDivElement>(fn)(node);

      expect(fn).toHaveBeenCalledWith(node);

      cleanupRefs();

      expect(fn).toHaveBeenLastCalledWith(null);
    });

    it('invokes the cleanup returned by a function ref instead of calling it with null', () => {
      const refCleanup = vi.fn();
      const fn = vi.fn(() => refCleanup);
      const node = document.createElement('div');

      const cleanupRefs = mergeRefs<HTMLDivElement>(fn)(node);

      expect(fn).toHaveBeenCalledWith(node);
      expect(refCleanup).not.toHaveBeenCalled();

      cleanupRefs();

      expect(refCleanup).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('skips null or undefined refs', () => {
      const ref = createRef<HTMLDivElement>();
      const node = document.createElement('div');

      const cleanupRefs = mergeRefs<HTMLDivElement>(null, undefined, ref)(node);

      expect(ref.current).toBe(node);

      cleanupRefs();

      expect(ref.current).toBeNull();
    });
  });

  describe('generateUniqueId', () => {
    const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[\da-f]{4}-[\da-f]{12}$/i;

    it('returns a UUID via crypto.randomUUID when available', () => {
      expect(generateUniqueId()).toMatch(UUID_PATTERN);
    });

    it('falls back to crypto.getRandomValues when crypto.randomUUID is unavailable', () => {
      const originalRandomUUID = crypto.randomUUID.bind(crypto);
      const originalGetRandomValues = crypto.getRandomValues.bind(crypto);

      const getRandomValuesSpy = vi.fn((buffer: Uint8Array<ArrayBuffer>) =>
        originalGetRandomValues(buffer)
      );

      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(crypto, 'getRandomValues', {
        configurable: true,
        value: getRandomValuesSpy,
      });

      try {
        const id = generateUniqueId();

        expect(id).toMatch(UUID_PATTERN);
        expect(getRandomValuesSpy).toHaveBeenCalledOnce();
        expect(getRandomValuesSpy.mock.calls[0]?.[0]).toBeInstanceOf(Uint8Array);
      } finally {
        Object.defineProperty(crypto, 'randomUUID', {
          configurable: true,
          value: originalRandomUUID,
        });

        Object.defineProperty(crypto, 'getRandomValues', {
          configurable: true,
          value: originalGetRandomValues,
        });
      }
    });
  });

  describe('debouncer', () => {
    it('cancel with no pending invocation does nothing', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced.cancel();

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('class helper', () => {
    it('returns empty string when called with no arguments', () => {
      expect(classNames()).toBe('');
    });

    it('returns the string as-is for a single string argument', () => {
      expect(classNames('foo')).toBe('foo');
    });

    it('joins multiple string arguments with a space', () => {
      expect(classNames('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('filters out falsy values', () => {
      expect(classNames('foo', false, null, undefined, '', 'bar')).toBe('foo bar');
    });

    it('includes object keys whose values are truthy', () => {
      expect(classNames({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('filters object keys with null or undefined values', () => {
      expect(classNames({ foo: true, bar: null, baz: undefined })).toBe('foo');
    });

    it('flattens nested arrays recursively', () => {
      expect(classNames(['foo', ['bar', ['baz', 'qux']]])).toBe('foo bar baz qux');
    });

    it('mixes strings, objects, arrays, and falsy values', () => {
      expect(
        classNames('foo', { bar: true, baz: false }, ['qux', null, { quux: true }], undefined)
      ).toBe('foo bar qux quux');
    });

    it('returns empty string when all arguments are falsy', () => {
      expect(classNames(false, null, undefined, '', [], {})).toBe('');
    });

    it('skips empty objects and arrays without adding extra whitespace', () => {
      expect(classNames('foo', {}, [], 'bar')).toBe('foo bar');
    });
  });

  describe('form store', () => {
    it('setValue with unchanged value does not notify subscribers', async () => {
      const store = createFormStore();
      const listener = vi.fn();

      store.subscribeToField('x', listener);
      store.setValue('x', 'hello');
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(1);

      store.setValue('x', 'hello');
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('still notifies later listeners and listeners on other fields when one throws', async () => {
      const store = createFormStore();
      const throwing = vi.fn(() => {
        throw new Error('boom');
      });
      const afterSameField = vi.fn();
      const otherField = vi.fn();

      store.subscribeToField('x', throwing);
      store.subscribeToField('x', afterSameField);
      store.subscribeToField('y', otherField);

      // Swallow the rethrow emitted from the microtask so vitest does not
      // flag it as an unhandled error.
      const originalOnError = [...process.listeners('uncaughtException')];
      process.removeAllListeners('uncaughtException');
      process.on('uncaughtException', () => {
        // intentionally empty
      });

      try {
        store.setValue('x', 'a');
        store.setValue('y', 'b');

        await new Promise<void>((resolve) => {
          queueMicrotask(() => {
            resolve();
          });
        });
      } finally {
        process.removeAllListeners('uncaughtException');
        for (const listener of originalOnError) {
          process.on('uncaughtException', listener);
        }
      }

      expect(throwing).toHaveBeenCalledTimes(1);
      expect(afterSameField).toHaveBeenCalledTimes(1);
      expect(otherField).toHaveBeenCalledTimes(1);
    });

    it('safely handles repeated unsubscribe calls and resubscribe after unsubscribe', () => {
      const store = createFormStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribeToField('x', listener);

      unsubscribe();
      // Second call should be a no-op even though the empty Set was dropped.
      unsubscribe();

      // Resubscribing creates a fresh Set and resumes notifications.
      const second = store.subscribeToField('x', listener);
      second();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('createUseWatch server snapshot', () => {
    const store = createFormStore();
    const useWatch = createUseWatch(store);

    function WatchDisplay({ compute }: Readonly<{ compute?: (value: string) => string }>) {
      const value = useWatch('name', compute);
      return <span>{value}</span>;
    }

    it('returns empty string when no compute is provided', () => {
      const html = renderToString(<WatchDisplay />);

      expect(html).toMatch(/<span[^>]*><\/span>/);
    });

    it('applies compute to empty string', () => {
      const html = renderToString(<WatchDisplay compute={(v) => v + '!'} />);

      expect(html).toMatch(/<span[^>]*>!<\/span>/);
    });
  });

  describe('FormResetBlocker', () => {
    afterEach(() => {
      cleanup();
      mockUseFormStatus.mockReturnValue({ pending: false });
    });

    describe('reset blocking via innerRef (no formRef prop)', () => {
      it('does not block reset events when not pending', () => {
        mockUseFormStatus.mockReturnValue({ pending: false });

        render(
          <form data-testid="form">
            <input name="name" />
            <FormResetBlocker />
          </form>
        );

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('');
      });

      it('blocks reset events when pending', () => {
        mockUseFormStatus.mockReturnValue({ pending: true });

        render(
          <form data-testid="form">
            <input name="name" />
            <FormResetBlocker />
          </form>
        );

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('Tom');
      });
    });

    describe('reset blocking via formRef prop', () => {
      it('does not block reset events when not pending', () => {
        mockUseFormStatus.mockReturnValue({ pending: false });

        const ref = createRef<HTMLFormElement>();

        render(
          <form data-testid="form" ref={ref}>
            <input name="name" />
            <FormResetBlocker formRef={ref} />
          </form>
        );

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('');
      });

      it('blocks reset events when pending', () => {
        mockUseFormStatus.mockReturnValue({ pending: true });

        const ref = createRef<HTMLFormElement>();

        render(
          <form data-testid="form" ref={ref}>
            <input name="name" />
            <FormResetBlocker formRef={ref} />
          </form>
        );

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('Tom');
      });
    });

    describe('listener lifecycle', () => {
      it('removes the event listener on unmount', () => {
        mockUseFormStatus.mockReturnValue({ pending: true });

        const { unmount } = render(
          <form data-testid="form">
            <input name="name" />
            <FormResetBlocker />
          </form>
        );

        const form = screen.getByTestId<HTMLFormElement>('form');
        const input = screen.getByRole('textbox');

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        unmount();

        // After unmount the listener is removed — reset should proceed.
        form.reset();

        expect(input).toHaveValue('');
      });

      it('allows reset after pending transitions from true to false', () => {
        mockUseFormStatus.mockReturnValue({ pending: true });

        const { rerender } = render(
          <form data-testid="form">
            <input name="name" />
            <FormResetBlocker />
          </form>
        );

        screen.getByRole<HTMLInputElement>('textbox').value = 'Tom';
        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('Tom');

        mockUseFormStatus.mockReturnValue({ pending: false });

        act(() => {
          rerender(
            <form data-testid="form">
              <input name="name" />
              <FormResetBlocker />
            </form>
          );
        });

        screen.getByTestId<HTMLFormElement>('form').reset();

        expect(screen.getByRole('textbox')).toHaveValue('');
      });

      it('does not throw when rendered outside a form element', () => {
        expect(() => render(<FormResetBlocker />)).not.toThrow();
      });

      it('does not throw when formRef is not attached to a form element', () => {
        const ref = createRef<HTMLFormElement>();

        expect(() =>
          render(
            <div>
              <FormResetBlocker formRef={ref} />
            </div>
          )
        ).not.toThrow();
      });
    });
  });

  describe('useDeepMemo', () => {
    it('runs the factory on first render and caches the result', () => {
      const factory = vi.fn(() => ({ produced: true }));
      const { result } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [1, 2, 3] as unknown[] },
      });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual({ produced: true });
    });

    it('reuses the cached value when the deps array reference is identical (a === b)', () => {
      const factory = vi.fn(() => ({}));
      const stableDeps: unknown[] = [{ a: 1 }];

      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: stableDeps },
      });

      const first = result.current;
      rerender({ deps: stableDeps });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(first);
    });

    it('recomputes when the deps array length changes', () => {
      const factory = vi.fn(() => ({}));
      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [1, 2] as unknown[] },
      });

      const first = result.current;
      rerender({ deps: [1, 2, 3] });

      expect(factory).toHaveBeenCalledTimes(2);
      expect(result.current).not.toBe(first);
    });

    it('reuses the cached value when each dep is referentially equal (Object.is fast-path)', () => {
      const factory = vi.fn(() => ({}));
      const sharedObj = { nested: 1 };

      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [1, 'a', sharedObj] as unknown[] },
      });

      const first = result.current;
      rerender({ deps: [1, 'a', sharedObj] });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(first);
    });

    it('treats NaN deps as equal via Object.is', () => {
      const factory = vi.fn(() => ({}));
      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [Number.NaN] as unknown[] },
      });

      const first = result.current;
      rerender({ deps: [Number.NaN] });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(first);
    });

    it('reuses the cached value when deps are different references but deeply equal', () => {
      const factory = vi.fn(() => ({}));
      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [{ a: { b: [1, 2] } }] as unknown[] },
      });

      const first = result.current;
      rerender({ deps: [{ a: { b: [1, 2] } }] });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(first);
    });

    it('recomputes when a dep differs both referentially and by deep equality', () => {
      const factory = vi.fn(() => ({}));
      const { result, rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), {
        initialProps: { deps: [{ a: 1 }] as unknown[] },
      });

      const first = result.current;
      rerender({ deps: [{ a: 2 }] });

      expect(factory).toHaveBeenCalledTimes(2);
      expect(result.current).not.toBe(first);
    });
  });
});
