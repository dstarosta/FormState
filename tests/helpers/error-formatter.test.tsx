import { describe, expect, it } from 'vitest';
import { z } from '../../src';
import { parseState } from '../../src/helpers/state-manager';

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
