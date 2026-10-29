import { describe, expect, expectTypeOf, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormState, useFormStateContext, z, type FormStateResponse } from '../src';
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

  it('partialRecord infers optional keys', () => {
    const partial = z.advanced.partialRecord(z.advanced.enum(['a', 'b']), z.number());
    const full = z.advanced.record(z.advanced.enum(['a', 'b']), z.number());

    expectTypeOf(partial.parse({ a: 1 })).toEqualTypeOf<Partial<Record<'a' | 'b', number>>>();
    expectTypeOf(full.parse({ a: 1, b: 2 })).toEqualTypeOf<Record<'a' | 'b', number>>();
  });
});
