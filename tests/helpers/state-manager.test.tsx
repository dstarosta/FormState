import { describe, expect, it } from 'vitest';
import type { DeepPartial, FormMutableState, Immutable } from '../../src/types/form-types';
import { z } from '../../src';
import {
  cleanEmpty,
  createState,
  diffedState,
  getState,
  parseStateAsync,
  safeSyncParse,
  updateState,
} from '../../src/helpers/state-manager';
import { getSchemaType } from '../../src/helpers/schema-visitor';

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

describe('parseStateAsync', () => {
  const syncSchema = z.object({
    a: z.array(
      z.object({
        id: z.symbol(),
        i: z.formNumber({ required: true, error: 'Invalid a[].i value' }),
      })
    ),
    n: z.formNumber({ required: true, error: 'Invalid n value' }),
    v: z.formValues(['a', 'b'], { required: true, error: 'Invalid v value' }),
  });

  const buildAsyncSchema = (allowed: Set<string>) =>
    z.object({
      name: z
        .formString({ required: true, error: 'Name is required' })
        .check(
          z.validateAsync((value) => Promise.resolve(allowed.has(value)), 'Name is not allowed')
        ),
    });

  it('parses a sync schema successfully', async () => {
    const { success, data, errors } = await parseStateAsync(syncSchema, {
      a: [{ i: 1 }],
      n: 2,
      v: 'b',
    });
    const idSymbol = data.a[0]?.id;

    expect(success).toBe(true);
    expect(idSymbol).toBeTypeOf('symbol');
    expect(data).toStrictEqual({
      a: [{ i: 1, id: idSymbol }],
      n: 2,
      v: 'b',
    });
    expect(errors.getAll()).toHaveLength(0);
  });

  it('parses a sync schema unsuccessfully and reports errors', async () => {
    const { success, data, errors } = await parseStateAsync(syncSchema, {
      n: '2',
      v: 1,
    });

    expect(success).toBe(false);
    expect(errors['n']).toEqual('Invalid n value');
    expect(errors['v']).toEqual('Invalid v value');
    expect(errors.getAll()).toStrictEqual(['Invalid n value', 'Invalid v value']);
    expect(errors.getKeys()).toStrictEqual(['n', 'v']);
    expect(data).toStrictEqual({ a: [], n: '2', v: 1 });
  });

  it('parses an async schema successfully when the predicate resolves true', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike']));

    const { success, data, errors } = await parseStateAsync(asyncSchema, { name: 'Mike' });

    expect(success).toBe(true);
    expect(data).toStrictEqual({ name: 'Mike' });
    expect(errors.getAll()).toHaveLength(0);
  });

  it('parses an async schema unsuccessfully when the predicate resolves false', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike']));

    const { success, data, errors } = await parseStateAsync(asyncSchema, { name: 'Xavier' });

    expect(success).toBe(false);
    expect(errors['name']).toEqual('Name is not allowed');
    expect(errors.getAll()).toStrictEqual(['Name is not allowed']);
    expect(data).toStrictEqual({ name: 'Xavier' });
  });

  it('rejects when called with null data', async () => {
    await expect(parseStateAsync(syncSchema, null as unknown as object)).rejects.toThrow(TypeError);
  });

  it('returns SchemaDataObject when asSchemaData = true (sync schema)', async () => {
    const { success, data } = await parseStateAsync(
      syncSchema,
      { a: [{ i: 1 }], n: 2, v: 'b' },
      true
    );

    expect(success).toBe(true);
    // Symbols and empty form values stripped by toObject()
    expect(data).toStrictEqual({ a: [{ i: 1 }], n: 2, v: 'b' });
  });

  it('returns SchemaDataObject when asSchemaData = true (async schema)', async () => {
    const asyncSchema = buildAsyncSchema(new Set(['Mike']));

    const { success, data } = await parseStateAsync(asyncSchema, { name: 'Mike' }, true);

    expect(success).toBe(true);
    expect(data).toStrictEqual({ name: 'Mike' });
  });

  it('asSchemaData = true strips data on a failed parse', async () => {
    const { success, data } = await parseStateAsync(syncSchema, { n: '2', v: 1 }, true);

    expect(success).toBe(false);
    expect(data).toStrictEqual({ a: [], n: '2', v: 1 });
  });
});

describe('safeSyncParse', () => {
  it('returns the sync parse result when the schema has no async checks', () => {
    const syncSchema = z.object({ name: z.formString({ required: true }) });

    const { result, asyncPending } = safeSyncParse(syncSchema, { name: 'Mike' });

    expect(asyncPending).toBe(false);
    expect(result?.success).toBe(true);
    expect(result?.data).toStrictEqual({ name: 'Mike' });
  });

  it('returns asyncPending: true instead of throwing for an async schema', () => {
    const asyncSchema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
    });

    const { result, asyncPending } = safeSyncParse(asyncSchema, { name: 'Mike' });

    expect(asyncPending).toBe(true);
    expect(result).toBeNull();
  });

  it('rethrows non-async errors raised during parsing', () => {
    const explosiveSchema = {
      _zod: { def: {} },
      safeParse: () => {
        throw new RangeError('boom');
      },
    } as DeepPartial<z.ZodMiniType>;

    expect(() => safeSyncParse(explosiveSchema as z.ZodMiniType, {})).toThrow(RangeError);
  });
});
