import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { formatErrors } from '../src/helpers/error-formatter';
import { useFormState, z } from '../src';

describe('form schema', () => {
  it('formBoolean should parse values', () => {
    const fieldSchema = z.formBoolean();

    expect(fieldSchema.safeParse(false).success).toBe(true);
    expect(fieldSchema.safeParse(false).data).toBe(false);
    expect(fieldSchema.safeParse(true).success).toBe(true);
    expect(fieldSchema.safeParse(true).data).toBe(true);
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');

    const requiredFieldSchema = z.formBoolean({
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
    const fieldSchema = z.formNumber();

    expect(fieldSchema.safeParse(1).success).toBe(true);
    expect(fieldSchema.safeParse(1).data).toBe(1);
    expect(fieldSchema.safeParse(10.2).success).toBe(true);
    expect(fieldSchema.safeParse(10.2).data).toBeCloseTo(10.2);
    expect(fieldSchema.safeParse('abcd').success).toBe(false);
    expect(fieldSchema.safeParse('abcd').error).toBeDefined();
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');

    const requiredFieldSchema = z.formNumber({
      required: true,
      error: 'Field required',
    });

    expect(requiredFieldSchema.safeParse(1).success).toBe(true);
    expect(requiredFieldSchema.safeParse(1).data).toBe(1);
    expect(requiredFieldSchema.safeParse(10.2).success).toBe(true);
    expect(requiredFieldSchema.safeParse(10.2).data).toBeCloseTo(10.2);
    expect(requiredFieldSchema.safeParse('abcd').success).toBe(false);
    expect(requiredFieldSchema.safeParse('abcd').error).toBeDefined();
    expect(requiredFieldSchema.safeParse('').success).toBe(false);
    expect(requiredFieldSchema.safeParse('').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(undefined).success).toBe(false);
    expect(requiredFieldSchema.safeParse(undefined).error).toBeDefined();
  });

  it('formDate should parse values', () => {
    const fieldSchema = z.formDate({
      dateFormat: 'MM-dd-yyyy',
      dateFormatError: 'Invalid date format',
    });

    const date = new Date(2025, 11, 31);

    expect(fieldSchema.safeParse(date).success).toBe(true);
    expect(fieldSchema.safeParse(date).data).toBe(date);
    expect(fieldSchema.safeParse('12-31-2025').success).toBe(true);
    expect(fieldSchema.safeParse('12-31-2025').data).toEqual(date);
    expect(fieldSchema.safeParse('2025-12-31').success).toBe(false);
    expect(fieldSchema.safeParse('2025-12-31').error).toBeDefined();
    expect(fieldSchema.safeParse(new Date(NaN)).success).toBe(false);
    expect(fieldSchema.safeParse(new Date(NaN)).error).toBeDefined();
    expect(fieldSchema.safeParse('').success).toBe(true);
    expect(fieldSchema.safeParse('').data).toBe('');

    const defaultFieldSchema = z.formDate();

    expect(defaultFieldSchema.safeParse(date).success).toBe(true);
    expect(defaultFieldSchema.safeParse(date).data).toBe(date);
    expect(defaultFieldSchema.safeParse('2025-12-31').success).toBe(true);
    expect(defaultFieldSchema.safeParse('2025-12-31').data).toEqual(date);
    expect(defaultFieldSchema.safeParse('12-31-2025').success).toBe(false);
    expect(defaultFieldSchema.safeParse('12-31-2025').error).toBeDefined();
    expect(defaultFieldSchema.safeParse(new Date(NaN)).success).toBe(false);
    expect(defaultFieldSchema.safeParse(new Date(NaN)).error).toBeDefined();
    expect(defaultFieldSchema.safeParse('').success).toBe(true);
    expect(defaultFieldSchema.safeParse('').error).toBeUndefined();
    expect(defaultFieldSchema.safeParse(undefined).success).toBe(true);
    expect(defaultFieldSchema.safeParse(undefined).error).toBeUndefined();

    const requiredFieldSchema = z.formDate({
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
    expect(requiredFieldSchema.safeParse(new Date(NaN)).success).toBe(false);
    expect(requiredFieldSchema.safeParse(new Date(NaN)).error).toBeDefined();
    expect(requiredFieldSchema.safeParse('').success).toBe(false);
    expect(requiredFieldSchema.safeParse('').error).toBeDefined();
    expect(requiredFieldSchema.safeParse(undefined).success).toBe(false);
    expect(requiredFieldSchema.safeParse(undefined).error).toBeDefined();

    const refinedFieldSchema = z.formDate(z.validate((val) => val.getDate() !== 31));

    expect(refinedFieldSchema.safeParse(date).success).toBe(false);
    expect(refinedFieldSchema.safeParse(date).data).toBeUndefined();
  });

  it('formDate should not parse values that fail validation', () => {
    const date = new Date(2025, 11, 31);

    const refinedFieldSchema = z.formDate(z.validate((val) => val.getDate() !== 31));

    expect(refinedFieldSchema.safeParse(date).success).toBe(false);
    expect(refinedFieldSchema.safeParse(date).data).toBeUndefined();
  });

  it('formDate stringifies numeric and boolean inputs in the invalid-input error message', () => {
    const fieldSchema = z.formDate();

    const numberResult = fieldSchema.safeParse(12345);

    expect(numberResult.success).toBe(false);
    expect(numberResult.error?.issues[0]?.message).toBe('Invalid input: "12345".');

    const booleanResult = fieldSchema.safeParse(true);

    expect(booleanResult.success).toBe(false);
    expect(booleanResult.error?.issues[0]?.message).toBe('Invalid input: "true".');
  });

  it('formString should parse values', () => {
    const stringSchema = z.formString();

    expect(stringSchema.safeParse(null).success).toBe(true);
    expect(stringSchema.safeParse('').success).toBe(true);
    expect(stringSchema.safeParse('test').success).toBe(true);
    expect(stringSchema.safeParse(/test/).success).toBe(false);

    const requiredStringSchema = z.formString({ required: true });

    expect(requiredStringSchema.safeParse(null).success).toBe(false);
    expect(requiredStringSchema.safeParse('').success).toBe(false);
    expect(requiredStringSchema.safeParse('test').success).toBe(true);

    const nfcSchema = z.formString({ normalize: 'NFC' });
    const decomposed = '\u{6E}\u{303}'; // 'n' + combining tilde, length 2
    const composed = '\u{F1}'; // single 'n with tilde', length 1
    expect(nfcSchema.safeParse(decomposed).data).toBe(composed);

    const nfdSchema = z.formString({ normalize: 'NFD' });
    expect(nfdSchema.safeParse(composed).data).toBe(decomposed);
  });

  it('formValues should not allow empty values', () => {
    expect(() => z.formValues(undefined as never)).toThrow(TypeError);
    expect(() => z.formValues([] as never)).toThrow(TypeError);
    expect(() => z.formValues([''])).toThrow(TypeError);
    expect(() => z.formValues(['a', ''])).toThrow(TypeError);
  });

  it('should initialize with ZodDefault values', () => {
    const schema_default = z.object({
      foo: z.default(z.string(), 'bar'),
      age: z.default(z.formNumber(), 99),
    });
    const { result } = renderHook(() => useFormState(schema_default));
    const { formState } = result.current;

    expect(formState.data.foo).toBe('bar');
    expect(formState.data.age).toBe(99);
  });

  it('should initialize with ZodCatch values', () => {
    const schemaWithCatch = z.object({
      foo: z.catch(z.string(), 'fallback'),
      age: z.catch(z.formNumber(), 123),
    });
    const { result } = renderHook(() => useFormState(schemaWithCatch));
    const { formState } = result.current;

    expect(formState.data['foo']).toBe('fallback');
    expect(formState.data['age']).toBe(123);
  });

  it('should initialize with ZodPipe', () => {
    const testSchema = z.object({
      value: z.advanced.pipe(z.string(), z.string().check(z.minLength(3))),
    });
    const initialData: z.infer<typeof testSchema> = { value: 'test' };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
  });

  it('should initialize with ZodOptional values', () => {
    const testSchema = z.object({
      value: z.advanced.optional(z.number()),
    });
    const initialData: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNonOptional values', () => {
    const testSchema = z.object({
      value: z.advanced.nonoptional(z.number()),
    });
    const initialData: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNullable values', () => {
    const testSchema = z.object({
      value: z.advanced.nullable(z.number()),
    });
    const initialData: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodNullish (null and undefined) values', () => {
    const testSchema = z.object({
      value: z.advanced.nullish(z.number()),
    });
    const initialData: z.infer<typeof testSchema> = { value: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe(0);
  });

  it('should initialize with ZodEnum values', () => {
    const testSchema = z.object({
      value: z.advanced.enum(['a', 'b', 'c']),
      value2: z.advanced.enum(['a', 'b', 'c']),
    });
    const initialData: z.infer<typeof testSchema> = { value: 'a', value2: 'c' };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const {
      formActions: { change },
    } = result.current;

    act(() => {
      change('value2', 'z' as 'a' | 'b' | 'c');
    });

    const { formState, formStatus } = result.current;

    expect(formStatus.valid).toBe(false);
    expect(formState.errors.value).toBeUndefined();
    expect(formState.errors.value2).toMatch(/invalid/i);
    expect(formState.data.value).toBe('a');
    expect(formState.data.value2).toBe('z');
  });

  it('should initialize with ZodLiteral values', () => {
    const testSchema = z.object({
      value: z.advanced.union([z.advanced.literal('a'), z.advanced.literal('b')]),
      value2: z.advanced.union([z.advanced.literal('a'), z.advanced.literal('b')]),
    });
    const initialData: z.infer<typeof testSchema> = { value: 'a', value2: 'b' };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
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
      value: z.advanced.pipe(
        z.string(),
        z.advanced.transform((arg: string) => arg.trim())
      ),
      value2: z.advanced.pipe(
        z.number(),
        z.advanced.transform((arg: number) => arg * 2)
      ),
    });
    const initialData: z.infer<typeof testSchema> = { value: ' test ', value2: 5 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
    expect(formState.data.value2).toBe(10);
  });

  it('should initialize with a union', () => {
    const testSchema = z.object({
      value: z.advanced.union([z.string(), z.number()]),
      value2: z.advanced.union([z.boolean(), z.number()]),
    });
    const initialData: z.infer<typeof testSchema> = { value: 'test', value2: 0 };
    const { result } = renderHook(() => useFormState(testSchema, { initialData }));
    const { formState } = result.current;

    expect(formState.data.value).toBe('test');
    expect(formState.data.value2).toBe(0);
  });

  it('should initialize with defaults in a nested ZodObject', () => {
    const testSchema = z.object({
      user: z.object({
        name: z.default(z.string(), 'anon'),
        profile: z.object({
          age: z.default(z.formNumber(), 18),
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
          name: z.default(z.formString({ required: false }), 'anon'),
        })
      ),
    });
    const initialData: z.infer<typeof testSchema> = { users: [{ name: '' }] };
    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );
    const { formState, formStatus } = result.current;

    expect(formState.data.users).toHaveLength(1);
    expect(formState.data.users[0]?.name).toBe('anon');
    expect(formStatus.valid).toBe(true);
  });

  it('should format wrong required value', () => {
    const error = 'Value is required';

    const unionSchema = z.object({
      arr: z.formArray(z.string(), { required: true, error }),
      bool: z.formBoolean({ required: true, error }),
      date: z.formDate({ required: true, error }),
      num: z.formNumber({ required: true, error }),
      string: z.formString({ required: true, error }),
      value: z.formValues(['a', 'b'], { required: true, error }),
    });

    const result = unionSchema.safeParse({});
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

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
      bool: z.formBoolean({ error }),
      date: z.formDate({ error }),
      num: z.formNumber({ error }),
      string: z.formString({ error }),
      value: z.formValues(['a', 'b'], { error }),
    });

    const result = unionSchema.safeParse({});
    expect(result.success).toBe(true);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

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

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

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

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

    expect(errors.value).toMatch(/invalid/i);
  });

  it('should format invalid_union errors', () => {
    const unionSchema = z.object({
      value: z.advanced.union([
        z.string().check(z.minLength(2, 'Too short')),
        z.number().check(z.gte(10, 'Very small')),
      ]),
    });

    const result = unionSchema.safeParse({ value: 1 });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

    expect(errors.value).toBe('Very small');
  });

  it('should use the fallback message for invalid_union if no custom message exists', () => {
    const unionSchema = z.object({
      value: z.advanced.union([z.string(), z.number().check(z.gte(10))]),
    });

    const result = unionSchema.safeParse({ value: 1 });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

    expect(errors.value).toMatch(/invalid/i);
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

    const errors = formatErrors<z.infer<typeof unionSchema>>(result.error, '|');

    expect(errors.status).toMatch(/^Only "active" and "inactive"/);
  });

  it('should validate object schema', () => {
    const testSchema = z
      .object({
        users: z
          .array(
            z.object({
              name: z
                .formString({ required: false })
                .check(z.validate((name) => name.trim().length > 0, 'Empty names are not allowed')),
            })
          )
          .check(z.validate((arr) => arr.length > 2, 'Not enough names')),
      })
      .check(
        z.validate((obj) => obj.users.filter((user) => user.name.startsWith('M')).length === 2, {
          path: 'users',
          error: 'Not enough names that start with "M"',
          condition: (errors) => errors.every((error) => error.pathNotation !== 'users'),
        })
      );

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should not validate object schema', () => {
    const testSchema = z
      .object({
        users: z
          .array(
            z.object({
              name: z
                .formString({ required: false })
                .check(z.validate((name) => name.trim().length > 0, 'Empty names are not allowed')),
            })
          )
          .check(z.validate((arr) => arr.length > 2, 'Not enough names')),
      })
      .check(
        z.validate((obj) => obj.users.filter((user) => user.name.startsWith('M')).length === 2, {
          path: 'users',
          error: 'Not enough names that start with "M"',
        })
      );

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.users).includes('Not enough names');
    expect(result.current.formState.errors.users).includes('Not enough names that start with "M"');
  });

  it('should not validate object schema and show a conditional error', () => {
    const testSchema = z
      .object({
        users: z
          .array(
            z.object({
              name: z
                .formString({ required: false })
                .check(z.validate((name) => name.trim().length > 0, 'Empty names are not allowed')),
            })
          )
          .check(z.validate((arr) => arr.length > 2, 'Not enough names')),
      })
      .check(
        z.validate((obj) => obj.users.filter((user) => user.name.startsWith('M')).length === 2, {
          path: 'users',
          error: 'No names that start with "M"',
          condition: (errors) => errors.every((error) => error.pathNotation !== 'users'),
        })
      );

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.users).toBe('Not enough names');
  });

  it('should fail validating object schema', () => {
    const error = 'Only 2 users are supported';

    const testSchema = z
      .object({
        users: z
          .array(
            z.object({
              name: z.formString({ required: false }),
            })
          )
          .check(z.validate((obj) => obj instanceof Object, { path: ['users'] })),
      })
      .check(z.validate((obj) => obj.users.length === 2, { path: 'users', error }));

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.users).toBe(error);
  });

  it('should asynchronously validate object schema', async () => {
    const allowedNames = new Set(['Mike', 'John', 'Mary']);
    const lookupAllowedName = (name: string) =>
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(allowedNames.has(name));
        }, 2);
      });

    const testSchema = z.object({
      users: z.array(
        z.object({
          name: z
            .formString()
            .check(z.validateAsync((name) => lookupAllowedName(name), 'Name is not allowed')),
        })
      ),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'Xavier' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.validating).toBe(true);
    expect(result.current.formStatus.valid).toBeNull();

    await waitFor(() => {
      expect(result.current.formStatus.validating).toBe(false);
    });

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.get((path) => path.users[1]?.name)).toBe(
      'Name is not allowed'
    );
  });

  it('should asynchronously validate object schema with params', async () => {
    const testSchema = z
      .object({
        users: z.array(z.object({ name: z.formString() })),
      })
      .check(
        z.validateAsync(
          (obj) =>
            new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(obj.users.length >= 2);
              }, 2);
            }),
          { path: 'users', error: 'Need at least 2 users' }
        )
      );

    const result = await testSchema.safeParseAsync({ users: [{ name: 'Mike' }] });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof testSchema>>(result.error, '|');
    expect(errors.users).toBe('Need at least 2 users');
  });

  it('should suppress an async conditional error when other errors exist', async () => {
    const testSchema = z
      .object({
        users: z
          .array(
            z.object({
              name: z
                .formString({ required: false })
                .check(z.validate((name) => name.trim().length > 0, 'Empty names are not allowed')),
            })
          )
          .check(z.validate((arr) => arr.length > 2, 'Not enough names')),
      })
      .check(
        z.validateAsync(
          (obj) =>
            new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(obj.users.filter((u) => u.name.startsWith('M')).length === 2);
              }, 2);
            }),
          {
            path: 'users',
            error: 'No names that start with "M"',
            condition: (errors) => errors.every((error) => error.pathNotation !== 'users'),
          }
        )
      );

    const result = await testSchema.safeParseAsync({
      users: [{ name: 'Mike' }, { name: 'John' }],
    });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof testSchema>>(result.error, '|');
    // 'Not enough names' is on the 'users' path, so the conditional async
    // validator must not run — its error string should not appear.
    expect(errors.users).toBe('Not enough names');
    expect(errors.users).not.toContain('No names that start with "M"');
  });

  it('should surface an async conditional error when its precondition is met', async () => {
    const testSchema = z
      .object({
        users: z.array(
          z.object({
            name: z.formString({ required: false }),
          })
        ),
      })
      .check(
        z.validateAsync(
          (obj) =>
            new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(obj.users.filter((u) => u.name.startsWith('M')).length === 2);
              }, 2);
            }),
          {
            path: 'users',
            error: 'No names that start with "M"',
            // No other errors exist for 'users', so the condition is satisfied
            // and the async check runs.
            condition: (errors) => errors.every((error) => error.pathNotation !== 'users'),
          }
        )
      );

    const result = await testSchema.safeParseAsync({
      users: [{ name: 'Mike' }, { name: 'John' }],
    });
    expect(result.success).toBe(false);

    const errors = formatErrors<z.infer<typeof testSchema>>(result.error, '|');
    expect(errors.users).toBe('No names that start with "M"');
  });

  it('should pass async validation when the predicate resolves true', async () => {
    const testSchema = z
      .object({
        users: z.array(z.object({ name: z.formString() })),
      })
      .check(
        z.validateAsync(
          (obj) =>
            new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(obj.users.length > 0);
              }, 2);
            }),
          { path: 'users', error: 'Need at least one user' }
        )
      );

    const result = await testSchema.safeParseAsync({ users: [{ name: 'Mike' }] });
    expect(result.success).toBe(true);
  });

  it('debounced validateAsync collapses rapid invocations to one predicate call', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((obj: { name: string }) => Promise.resolve(obj.name === 'Mike'));

      const testSchema = z.object({ name: z.formString() }).check(
        z.validateAsync(predicate, {
          path: 'name',
          error: 'Name is not allowed',
          debounceMs: 100,
        })
      );

      const p1 = testSchema.safeParseAsync({ name: 'A' });
      const p2 = testSchema.safeParseAsync({ name: 'B' });
      const p3 = testSchema.safeParseAsync({ name: 'Mike' });

      await vi.advanceTimersByTimeAsync(100);

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      // Only the last call actually ran the predicate.
      expect(predicate).toHaveBeenCalledTimes(1);
      expect(predicate).toHaveBeenCalledWith({ name: 'Mike' });

      // Cancelled calls resolve to the fallback (true = "valid").
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounced validateAsync surfaces the real result after the debounce window', async () => {
    vi.useFakeTimers();
    try {
      const predicate = vi.fn((obj: { name: string }) => Promise.resolve(obj.name === 'Mike'));

      const testSchema = z.object({ name: z.formString() }).check(
        z.validateAsync(predicate, {
          path: 'name',
          error: 'Name is not allowed',
          debounceMs: 100,
        })
      );

      const pending = testSchema.safeParseAsync({ name: 'Xavier' });
      await vi.advanceTimersByTimeAsync(100);
      const result = await pending;

      expect(predicate).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('non-debounced validateAsync runs the predicate every call', async () => {
    const predicate = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 2);
        })
    );

    const testSchema = z
      .object({ name: z.formString() })
      .check(z.validateAsync(predicate, { path: 'name', error: 'x' }));

    await testSchema.safeParseAsync({ name: 'A' });
    await testSchema.safeParseAsync({ name: 'B' });
    await testSchema.safeParseAsync({ name: 'C' });

    expect(predicate).toHaveBeenCalledTimes(3);
  });

  it('validateAsync lets the predicate skip work by returning prevResult', async () => {
    let heavyWorkCount = 0;

    const testSchema = z.object({ name: z.formString(), other: z.formString() }).check(
      z.validateAsync(
        (item) => {
          heavyWorkCount++;
          return Promise.resolve(item.name === 'Mike');
        },
        { path: 'name', error: 'x', skipWhen: (item, prevItem) => item.name === prevItem?.name }
      )
    );

    const r1 = await testSchema.safeParseAsync({ name: 'Mike', other: '1' });
    const r2 = await testSchema.safeParseAsync({ name: 'Mike', other: '2' });
    const r3 = await testSchema.safeParseAsync({ name: 'Mike', other: '3' });

    expect(heavyWorkCount).toBe(1);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it('should validate some items in a ZodArray', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.someItem((arr) => arr.name === 'John')),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should fail validating some items in a ZodArray', () => {
    const error = 'Jonathans are not welcome';

    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.someItem((arr) => arr.name === 'Jonathan', error)),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.users).toBe(error);
  });

  it('should validate all items in a ZodArray', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.everyItem((arr) => arr.name.includes('M'))),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should fail validating all items in a ZodArray', () => {
    const error = 'There are names that do not start with "M"';

    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.everyItem((arr) => arr.name.includes('M'), error)),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.users).toBe(error);
  });

  it('should validate unique items in a ZodArray', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems(true)),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should validate unique items in a ZodArray due to reference equality', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems()),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mike' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should validate unique items using a mapping function in a ZodArray', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems(false, { mapFn: (item) => item.name })),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mary' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should not validate unique items using a mapping function in a ZodArray', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems(false, { mapFn: (item) => item.name, elementPath: ['name'] })),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mike' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.get((path) => path.users[2]?.name)).toBe(
      'Invalid input'
    );
  });

  it('should validate unique items using a mapping function in a ZodArray ignoring empty strings', () => {
    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems(true, { mapFn: (value) => value.name, ignoreValues: [null, ''] })),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: '' }, { name: 'John' }, { name: 'Mary' }, { name: '' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(true);
  });

  it('should fail validating unique items in a ZodArray due to duplicates', () => {
    const error = 'There are duplicate items';

    const testSchema = z.object({
      users: z
        .array(
          z.object({
            name: z.formString({ required: false }),
          })
        )
        .check(z.uniqueItems(true, { error })),
    });

    const initialData: z.infer<typeof testSchema> = {
      users: [{ name: 'Mike' }, { name: 'John' }, { name: 'Mike' }],
    };

    const { result } = renderHook(() =>
      useFormState(testSchema, { initialData, validateOnMount: true })
    );

    expect(result.current.formStatus.valid).toBe(false);
    expect(result.current.formState.errors.get((path) => path.users[2])).toBe(error);
  });
});
