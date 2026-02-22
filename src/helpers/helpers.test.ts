import { describe, expect, it } from 'vitest';

import type { FormMutableState, Immutable } from '../form-types';

import {
  createState,
  formatDate,
  formDataToURL,
  safeParseDate,
  updateState,
  validateState,
  z,
} from '..';
import { cleanEmpty, diffedState } from './state-manager';
import { getSchemaType } from './schema-visitor';

// Error Formatter and Schema Visitor have no public methods and are extensively tested
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
      // We are simulating immutable state, otherwise, those methods are not neccessary.

      const state: Immutable<z.infer<typeof formSchema>> = createState(formSchema);

      expect(state).toEqual({ a: [], b: '', b2: false, n: '', s: '', v: '', z: { id: '' } });

      const itemState: Immutable<z.infer<typeof formSchema.shape.a.element>> = createState(
        formSchema.shape.a.element
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

      // change('a', updatedArrayState)
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
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('2020-12-31', 'yyyy-MM-dd');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('12/31/2020', 'MM/dd/yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('31/12/2020', 'dd/MM/yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('12-31-2020', 'MM-dd-yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('31-12-2020', 'dd-MM-yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));

      parsedDate = safeParseDate('31.12.2020', 'dd.MM.yyyy');

      expect(parsedDate.success).toBe(true);
      expect(parsedDate.date).toEqual(new Date(Date.UTC(2020, 11, 31)));
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

      const urlParams = formDataToURL(formData).toString();

      expect(urlParams).toBe(
        'param1=Some+value&param2=value1&param2=value2&param3=&param4=some%3Cfile%3E.txt'
      );
    });
  });
});
