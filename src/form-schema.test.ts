import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { formatErrors } from './helpers/error-formatter';
import { useFormState, z } from '.';

describe('form schema', () => {
  it('formBoolean should parse values', () => {
    const fieldSchema = z.formBoolean(z.boolean());

    expect(fieldSchema.safeParse(false).success).toBe(true);
    expect(fieldSchema.safeParse(false).data).toBe(false);
    expect(fieldSchema.safeParse(true).success).toBe(true);
    expect(fieldSchema.safeParse(true).data).toBe(true);
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');
    expect(fieldSchema.safeParse('false').success).toBe(true);
    expect(fieldSchema.safeParse('false').data).toBe(false);
    expect(fieldSchema.safeParse('true').success).toBe(true);
    expect(fieldSchema.safeParse('true').data).toBe(true);
    expect(fieldSchema.safeParse('abcdefg').success).toBe(true);
    expect(fieldSchema.safeParse('abcdefg').data).toBe(true);

    const requiredFieldSchema = z.formBoolean(z.boolean(), {
      required: true,
      error: 'Field required',
    });

    expect(requiredFieldSchema.safeParse(false).success).toBe(true);
    expect(requiredFieldSchema.safeParse(false).data).toBe(false);
    expect(requiredFieldSchema.safeParse(true).success).toBe(true);
    expect(requiredFieldSchema.safeParse(true).data).toBe(true);
    expect(requiredFieldSchema.safeParse('').success).toBe(false);
    expect(requiredFieldSchema.safeParse('').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(undefined).success).toBe(false);
    expect(requiredFieldSchema.safeParse(undefined).error).toBeDefined();
  });

  it('formNumeric should parse values', () => {
    const fieldSchema = z.formNumber(z.number());

    expect(fieldSchema.safeParse(1).success).toBe(true);
    expect(fieldSchema.safeParse(1).data).toBe(1);
    expect(fieldSchema.safeParse(10.2).success).toBe(true);
    expect(fieldSchema.safeParse(10.2).data).toBe(10.2);
    expect(fieldSchema.safeParse('10.2').success).toBe(true);
    expect(fieldSchema.safeParse('10.2').data).toBe(10.2);
    expect(fieldSchema.safeParse('abcd').success).toBe(false);
    expect(fieldSchema.safeParse('abcd').error).toBeDefined();
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');

    const requiredFieldSchema = z.formNumber(z.number(), {
      required: true,
      error: 'Field required',
    });

    expect(requiredFieldSchema.safeParse(1).success).toBe(true);
    expect(requiredFieldSchema.safeParse(1).data).toBe(1);
    expect(requiredFieldSchema.safeParse(10.2).success).toBe(true);
    expect(requiredFieldSchema.safeParse(10.2).data).toBe(10.2);
    expect(requiredFieldSchema.safeParse('10.2').success).toBe(true);
    expect(requiredFieldSchema.safeParse('10.2').data).toBe(10.2);
    expect(requiredFieldSchema.safeParse('abcd').success).toBe(false);
    expect(requiredFieldSchema.safeParse('abcd').error).toBeDefined();
    expect(requiredFieldSchema.safeParse('').success).toBe(false);
    expect(requiredFieldSchema.safeParse('').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(undefined).success).toBe(false);
    expect(requiredFieldSchema.safeParse(undefined).error).toBeDefined();
  });

  it('formDate should parse values', () => {
    const fieldSchema = z.formDate(z.date(), { required: false, dateFormat: 'MM-dd-yyyy' });

    const date = new Date(Date.UTC(2025, 11, 31));

    expect(fieldSchema.safeParse(date).success).toBe(true);
    expect(fieldSchema.safeParse(date).data).toBe(date);
    expect(fieldSchema.safeParse('12-31-2025').success).toBe(true);
    expect(fieldSchema.safeParse('12-31-2025').data).toEqual(date);
    expect(fieldSchema.safeParse('2025-12-31').success).toBe(false);
    expect(fieldSchema.safeParse('2025-12-31').error).toBeDefined();
    expect(fieldSchema.safeParse(new Date(Number.NaN)).success).toBe(false);
    expect(fieldSchema.safeParse(new Date(Number.NaN)).error).toBeDefined();
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');

    const requiredFieldSchema = z.formDate(z.date(), {
      required: true,
      error: 'Field required',
      // dateFormat: 'yyyy-MM-dd' - default
    });

    expect(requiredFieldSchema.safeParse(date).success).toBe(true);
    expect(requiredFieldSchema.safeParse(date).data).toBe(date);
    expect(requiredFieldSchema.safeParse('2025-12-31').success).toBe(true);
    expect(requiredFieldSchema.safeParse('2025-12-31').data).toEqual(date);
    expect(requiredFieldSchema.safeParse('12-31-2025').success).toBe(false);
    expect(requiredFieldSchema.safeParse('12-31-2025').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(new Date(Number.NaN)).success).toBe(false);
    expect(requiredFieldSchema.safeParse(new Date(Number.NaN)).error).toBeDefined();
    expect(requiredFieldSchema.safeParse('').success).toBe(false);
    expect(requiredFieldSchema.safeParse('').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(undefined).success).toBe(false);
    expect(requiredFieldSchema.safeParse(undefined).error).toBeDefined();
  });

  it('formValues should not allow empty values', () => {
    expect(() => z.formValues(undefined as never)).toThrow(TypeError);
    expect(() => z.formValues([''])).toThrow(TypeError);
    expect(() => z.formValues(['a', ''])).toThrow(TypeError);
  });

  it('should initialize with ZodDefault values', () => {
    const schemaWithDefault = z.object({
      foo: z.string().default('bar'),
      age: z.formNumber(z.number()).default(99),
    });
    const { result } = renderHook(() => useFormState(schemaWithDefault));
    const { formState } = result.current;

    expect(formState.data.foo).toBe('bar');
    expect(formState.data.age).toBe(99);
  });

  it('should initialize with ZodCatch values', () => {
    const schemaWithCatch = z.object({
      foo: z.string().catch('fallback'),
      age: z.formNumber(z.number()).catch(123),
    });
    const { result } = renderHook(() => useFormState(schemaWithCatch));
    const { formState } = result.current;

    expect(formState.data.foo).toBe('fallback');
    expect(formState.data.age).toBe(123);
  });

  it('should initialize with ZodPipe', () => {
    const testSchema = z.object({
      value: z.string().pipe(z.string().min(3)),
    });
    const initialState: z.infer<typeof testSchema> = { value: 'test' };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
  });

  it('should initialize with ZodOptional values', () => {
    const testSchema = z.object({
      value: z.number().optional(),
    });
    const initialState: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNonOptional values', () => {
    const testSchema = z.object({
      value: z.number().nonoptional(),
    });
    const initialState: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNullable values', () => {
    const testSchema = z.object({
      value: z.number().nullable(),
    });
    const initialState: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNullish (null and undefined) values', () => {
    const testSchema = z.object({
      value: z.number().nullish(),
    });
    const initialState: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodEnum values', () => {
    const testSchema = z.object({
      value: z.advanced.enum(['a', 'b', 'c']),
      value2: z.advanced.enum(['a', 'b', 'c']),
    });
    const initialState: z.infer<typeof testSchema> = { value: 'a', value2: 'c' };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change('value2', 'z' as 'a' | 'b' | 'c');
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(false);
    expect(formState.errors.value).toBeUndefined();
    expect(formState.errors.value2).toMatch(/invalid option/i);
    expect(formState.data.value).toBe('a');
    expect(formState.data.value2).toBe('z');
  });

  it('should initialize with ZodLiteral values', () => {
    const testSchema = z.object({
      value: z.advanced.literal('a').or(z.advanced.literal('b')),
      value2: z.advanced.literal('a').or(z.advanced.literal('b')),
    });
    const initialState: z.infer<typeof testSchema> = { value: 'a', value2: 'b' };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change('value2', 'z' as 'a' | 'b');
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(false);
    expect(formState.errors.value).toBeUndefined();
    expect(formState.errors.value2).toMatch(/invalid input/i);
    expect(formState.data.value).toBe('a');
    expect(formState.data.value2).toBe('z');
  });

  it('should initialize with ZodTransform values', () => {
    const testSchema = z.object({
      value: z.string().transform((arg) => arg.trim()),
      value2: z.number().transform((arg) => arg * 2),
    });
    const initialState: z.infer<typeof testSchema> = { value: ' test ', value2: 5 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
    expect(formState.data.value2).toBe(10);
  });

  it('should initialize with a union', () => {
    const testSchema = z.object({
      value: z.advanced.union([z.string(), z.number()]),
      value2: z.advanced.union([z.boolean(), z.number()]),
    });
    const initialState: z.infer<typeof testSchema> = { value: 'test', value2: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
    expect(formState.data.value2).toBe(0);
  });

  it('should initialize with defaults in a nested ZodObject', () => {
    const testSchema = z.object({
      user: z.object({
        name: z.string().default('anon'),
        profile: z.object({
          age: z.formNumber(z.number()).default(18),
        }),
      }),
    });
    const { result } = renderHook(() => useFormState(testSchema));
    const { formState } = result.current;

    expect(formState.data.user.name).toBe('anon');
    expect(formState.data.user.profile.age).toBe(18);
  });

  it('should initialize with defaults in a ZodArray', () => {
    const testSchema = z.object({
      users: z.array(
        z.object({
          name: z.string().default('anon').optional(),
        })
      ),
    });
    const initialState: z.infer<typeof testSchema> = { users: [{}] };
    const { result } = renderHook(() => useFormState(testSchema, { initialState }));
    const { formState } = result.current;

    expect(formState.data.users).toHaveLength(1);
    expect(formState.data.users[0]?.name).toBe('anon');
  });

  it('should format wrong required value', () => {
    const error = 'Value is required';

    const unionSchema = z.object({
      arr: z.formArray(z.string(), { required: true, error }),
      bool: z.formBoolean(z.boolean(), { required: true, error }),
      date: z.formDate(z.date(), { required: true, error }),
      num: z.formNumber(z.number(), { required: true, error }),
      string: z.formString(z.string(), { required: true, error }),
      value: z.formValues(['a', 'b'], { required: true, error }),
    });

    const result = unionSchema.safeParse({});
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.arr).toBe(error);
    expect(errors.bool).toBe(error);
    expect(errors.date).toBe(error);
    expect(errors.num).toBe(error);
    expect(errors.string).toBe(error);
    expect(errors.value).toBe(error);
  });

  it('should not throw errors with non-required value', () => {
    const error = 'Value is required';

    const unionSchema = z.object({
      arr: z.formArray(z.string(), { required: false, error }),
      bool: z.formBoolean(z.boolean(), { required: false, error }),
      date: z.formDate(z.date(), { required: false, error }),
      num: z.formNumber(z.number(), { required: false, error }),
      string: z.formString(z.string(), { required: false, error }),
      value: z.formValues(['a', 'b'], { required: false, error }),
    });

    const result = unionSchema.safeParse({});
    expect(result.success).toBe(true);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.arr).toBeUndefined();
    expect(errors.bool).toBeUndefined();
    expect(errors.date).toBeUndefined();
    expect(errors.num).toBeUndefined();
    expect(errors.string).toBeUndefined();
    expect(errors.value).toBeUndefined();
  });

  it('should format wrong value error', () => {
    const unionSchema = z.object({
      value: z.formValues(['a', 'b'], { required: true, error: 'Wrong value provided' }),
    });

    const result = unionSchema.safeParse({ value: '' });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.value).toBe('Wrong value provided');
  });

  it('should use the fallback message for a wrong value if no custom message exists', () => {
    const unionSchema = z.object({
      value: z.formValues(['a', 'b']),
    });

    let result = unionSchema.safeParse({ value: '' });
    expect(result.success).toBe(true); // allowed for a non-required value

    result = unionSchema.safeParse({ value: 'z' });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.value).toMatch(/invalid option/i);
  });

  it('should format invalid_union errors', () => {
    const unionSchema = z.object({
      value: z.advanced.union([z.string().min(2, 'Too short'), z.number().min(10, 'Very small')]),
    });

    const result = unionSchema.safeParse({ value: 1 });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.value).toBe('Very small');
  });

  it('should use the fallback message for invalid_union if no custom message exists', () => {
    const unionSchema = z.object({
      value: z.advanced.union([z.string(), z.number().min(10)]),
    });

    const result = unionSchema.safeParse({ value: 1 });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.value).toMatch(/^Too small/);
  });

  it('should use the custom message for invalid_union', () => {
    const unionSchema = z.object({
      status: z.advanced.union([
        z.advanced.literal('active'),
        z.advanced.literal('inactive', {
          message: 'Only "active" and "inactive" are allowed.',
        }),
      ]),
    });

    const result = unionSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error);

    expect(errors.status).toMatch(/^Only "active" and "inactive"/);
  });
});
