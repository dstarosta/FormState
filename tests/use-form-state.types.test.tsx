import { describe, expect, expectTypeOf, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  convert,
  MaskedInput,
  SecureInput,
  useFormState,
  useFormStateContext,
  z,
  type FormStateResponse,
} from '../src';
import { schema } from './fixtures';

// These checks are enforced by `tsc --noEmit` (npm run typecheck); the closures are never invoked.
describe('type inference', () => {
  it('array actions infer the element type from the path', () => {
    const { result } = renderHook(() => useFormState(schema));
    const { append, insert, update, remove, swap, clear } = result.current.formActions.array;

    const typeChecks = () => {
      append('tags', 'a');
      append('tags', ['a', 'b']);
      append((path) => path.tags, 'a');
      insert('tags', 0, 'a');
      update('tags', 0, 'a');
      swap('tags', 0, 1);
      clear('tags');

      remove('tags', (value, index) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        expectTypeOf(index).toEqualTypeOf<number>();
        return value === 'a';
      });

      // @ts-expect-error -- tags are strings
      append('tags', 1);
      // @ts-expect-error -- tags are strings
      insert('tags', 0, [1]);
      // @ts-expect-error -- tags are strings
      update((path) => path.tags, 0, true);
      // @ts-expect-error -- unknown field
      clear('nope');

      swap((path) => path.tags, 0, 1);
      remove((path) => path.tags, 0);
      clear((path) => path.tags);

      // @ts-expect-error -- not an array field
      swap('name', 0, 1);
      // @ts-expect-error -- not an array field
      clear('isArchived');
      // @ts-expect-error -- not an array field
      remove('name', 0);
      // @ts-expect-error -- not an array field
      clear((path) => path.info.age);
    };

    expect(typeChecks).toBeTypeOf('function');
  });

  it('array action results keep the inferred data type', () => {
    const { result } = renderHook(() => useFormState(schema));

    expectTypeOf(result.current.formState.data.tags).toEqualTypeOf<readonly string[]>();
  });

  it('state getters infer path expressions from the schema', () => {
    const { result } = renderHook(() => useFormState(schema));
    const { errors, touched, required, ranges, patterns, descriptions } = result.current.formState;

    const typeChecks = () => {
      expectTypeOf(errors.get((path) => path.name)).toEqualTypeOf<string | undefined>();
      expectTypeOf(touched.get((path) => path.info.age)).toEqualTypeOf<boolean>();
      expectTypeOf(required.get((path) => path.name)).toEqualTypeOf<boolean>();
      expectTypeOf(descriptions.get((path) => path.name)).toEqualTypeOf<string>();
      expectTypeOf(patterns.get((path) => path.name)).toEqualTypeOf<string | undefined>();
      ranges.getMin((path) => path.version);

      // @ts-expect-error -- unknown field
      errors.get((path) => path.nope);
      // @ts-expect-error -- unknown field
      touched.get((path) => path.nope);
      // @ts-expect-error -- unknown field
      required.get((path) => path.nope);
      // @ts-expect-error -- unknown field
      ranges.getMax((path) => path.nope as unknown as number);
      // @ts-expect-error -- unknown field
      patterns.get((path) => path.nope);
      // @ts-expect-error -- unknown field
      descriptions.get((path) => path.nope);
    };

    expect(typeChecks).toBeTypeOf('function');
  });

  it('useFormStateContext overloads infer their return types', () => {
    const contextSchema = z.object({
      name: z.formString(),
      email: z.group(z.formString(), 'contact'),
      phone: z.group(z.formString(), 'contact'),
    });

    const useTypeChecks = () => {
      expectTypeOf(useFormStateContext(contextSchema)).toEqualTypeOf<
        FormStateResponse<typeof contextSchema>
      >();
      expectTypeOf(
        useFormStateContext(contextSchema, (form) => form.formState.data.name)
      ).toEqualTypeOf<string>();
      expectTypeOf(useFormStateContext(contextSchema, (form) => form.formActions)).toEqualTypeOf<
        FormStateResponse<typeof contextSchema>['formActions']
      >();
      expectTypeOf(useFormStateContext(contextSchema, 'contact')).toEqualTypeOf<
        Readonly<{ email: string; phone: string }>
      >();

      // @ts-expect-error -- unknown group
      useFormStateContext(contextSchema, 'nope');
    };

    expect(useTypeChecks).toBeTypeOf('function');
  });

  it('ranges entries may be missing (only fields with a min or max have one)', () => {
    const { result } = renderHook(() => useFormState(schema));
    const { ranges } = result.current.formState;

    expectTypeOf(ranges.name).toEqualTypeOf<NonNullable<typeof ranges.name> | undefined>();
    expect(ranges).toBeTypeOf('object');
  });

  it('asDateString only accepts supported date formats', () => {
    const date = new Date(2024, 0, 15);

    expect(convert.asDateString(date, 'MM/dd/yyyy')).toBe('01/15/2024');
    expect(convert.asDateString(date)).toBe('2024-01-15');

    // @ts-expect-error -- unsupported format
    expect(() => convert.asDateString(date, 'bogus')).toThrow(TypeError);
  });

  it('input props that are always overridden cannot be passed', () => {
    const elements = [
      <SecureInput key="ok" name="password" onBlur={() => {}} />,
      <MaskedInput key="ok-mask" mask="999" onFocus={() => {}} onClick={() => {}} />,
      // @ts-expect-error -- always "off"
      <SecureInput key="a" autoComplete="current-password" />,
      // @ts-expect-error -- always disabled
      <SecureInput key="b" spellCheck />,
      // @ts-expect-error -- handled internally
      <SecureInput key="c" onKeyDown={() => {}} />,
      // @ts-expect-error -- handled internally
      <SecureInput key="d" onPaste={() => {}} />,
      // @ts-expect-error -- handled internally
      <SecureInput key="e" onCopy={() => {}} />,
      // @ts-expect-error -- handled internally
      <SecureInput key="f" onCut={() => {}} />,
      // @ts-expect-error -- handled internally
      <SecureInput key="g" onDrop={() => {}} />,
      // @ts-expect-error -- handled internally
      <SecureInput key="h" onDragStart={() => {}} />,
      // @ts-expect-error -- handled internally
      <MaskedInput key="i" mask="999" onPaste={() => {}} />,
    ];

    expect(elements).toHaveLength(11);
  });

  it('validate and validateAsync paths are checked against the schema', () => {
    const base = z.object({
      name: z.formString(),
      info: z.object({ age: z.formNumber() }),
      tags: z.array(z.object({ label: z.formString() })),
    });

    const checked = base
      .check(z.validate((item) => item.name !== '', { path: 'name' }))
      .check(z.validate(() => true, { path: ['info', 'age'] }))
      .check(z.validate(() => true, { path: ['tags', 0, 'label'] as const }))
      .check(z.validateAsync(() => Promise.resolve(true), { path: 'info' }))
      // @ts-expect-error -- unknown field
      .check(z.validate(() => true, { path: 'nope' }))
      // @ts-expect-error -- unknown nested field
      .check(z.validate(() => true, { path: ['info', 'nope'] }))
      // @ts-expect-error -- unknown field
      .check(z.validateAsync(() => Promise.resolve(true), { path: 'nope' }));

    expect(checked).toBeTypeOf('object');
  });

  it('state getters accept a field name or a path expression', () => {
    const { result } = renderHook(() => useFormState(schema));
    const { errors, touched, dirty, required, ranges, patterns, descriptions } =
      result.current.formState;

    const typeChecks = () => {
      expectTypeOf(errors.get('name')).toEqualTypeOf<string | undefined>();
      expectTypeOf(touched.get('name')).toEqualTypeOf<boolean>();
      expectTypeOf(required.get('name')).toEqualTypeOf<boolean>();
      expectTypeOf(patterns.get('name')).toEqualTypeOf<string | undefined>();
      expectTypeOf(descriptions.get('name')).toEqualTypeOf<string>();
      expectTypeOf(ranges.get('version')).toEqualTypeOf(ranges.get((path) => path.version));
      expectTypeOf(ranges.get('name')).toEqualTypeOf(ranges.get((path) => path.name));
      expectTypeOf(dirty.get('name')).toEqualTypeOf<boolean>();
      expectTypeOf(dirty.get((path) => path.info.age)).toEqualTypeOf<boolean>();
      expectTypeOf(dirty.get('#custom')).toEqualTypeOf<boolean>();

      // @ts-expect-error -- unknown field
      errors.get('nope');
      // @ts-expect-error -- unknown field
      dirty.get('nope');
      // @ts-expect-error -- unknown field
      ranges.get('nope');
    };

    expect(typeChecks).toBeTypeOf('function');
  });

  it('group getters only accept the group fields by name', () => {
    const groupSchema = z.object({
      email: z.group(z.formString(), 'contact'),
      age: z.group(z.formNumber(), 'demographics'),
    });
    const { result } = renderHook(() => useFormState(groupSchema));
    const contact = result.current.formState.getGroup('contact');

    const typeChecks = () => {
      expectTypeOf(contact.errors.get('email')).toEqualTypeOf<string | undefined>();
      expectTypeOf(contact.dirty.get('email')).toEqualTypeOf<boolean>();

      // @ts-expect-error -- not in the "contact" group
      contact.errors.get('age');
      // @ts-expect-error -- not in the "contact" group
      contact.touched.get('age');
    };

    expect(typeChecks).toBeTypeOf('function');
  });

  it('partialRecord infers optional keys', () => {
    const partial = z.advanced.partialRecord(z.advanced.enum(['a', 'b']), z.number());
    const full = z.advanced.record(z.advanced.enum(['a', 'b']), z.number());

    expectTypeOf(partial.parse({ a: 1 })).toEqualTypeOf<Partial<Record<'a' | 'b', number>>>();
    expectTypeOf(full.parse({ a: 1, b: 2 })).toEqualTypeOf<Record<'a' | 'b', number>>();
  });
});
