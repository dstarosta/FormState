/* eslint-disable unicorn/consistent-function-scoping, no-sparse-arrays */
import { describe, expect, it } from 'vitest';

import { deepEqual } from './deep-equal';

describe('deepEqual', () => {
  describe('primitives (SameValueZero)', () => {
    it('returns true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(false, false)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });

    it('treats NaN as equal to NaN', () => {
      expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
    });

    it('treats +0 and -0 as equal', () => {
      expect(deepEqual(0, -0)).toBe(true);
      expect(deepEqual(-0, 0)).toBe(true);
    });

    it('returns false for differing primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('a', 'b')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it('does not coerce types', () => {
      expect(deepEqual(0, false)).toBe(false);
      expect(deepEqual('1', 1)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
      expect(deepEqual(undefined, null)).toBe(false);
    });

    it('compares literal values structurally (z.advanced.literal targets)', () => {
      // z.literal('admin') produces the runtime string 'admin'. deepEqual
      // sees no difference between a literal-typed value and a regular
      // primitive of the same value.
      expect(deepEqual('admin', 'admin')).toBe(true);
      expect(deepEqual('admin', 'viewer')).toBe(false);

      // Number literals.
      expect(deepEqual(42, 42)).toBe(true);
      expect(deepEqual(42, 43)).toBe(false);

      // Boolean and null literals.
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);

      // Inside an object — same-value literal field at every position equal,
      // differing literal field unequal.
      expect(deepEqual({ kind: 'admin' }, { kind: 'admin' })).toBe(true);
      expect(deepEqual({ kind: 'admin' }, { kind: 'viewer' })).toBe(false);
    });
  });

  describe('reference-typed values (identity)', () => {
    it('treats registry symbols with the same key as equal', () => {
      expect(deepEqual(Symbol.for('x'), Symbol.for('x'))).toBe(true);
    });

    it('treats non-registry symbols as equal only by identity', () => {
      const a = Symbol('x');
      const b = Symbol('x');
      expect(deepEqual(a, a)).toBe(true);
      expect(deepEqual(a, b)).toBe(false);
    });

    it('compares functions by reference', () => {
      const fn = () => 1;
      expect(deepEqual(fn, fn)).toBe(true);
      expect(
        deepEqual(
          () => 1,
          () => 1
        )
      ).toBe(false);
    });
  });

  describe('Map', () => {
    it('treats two empty maps as equal', () => {
      expect(deepEqual(new Map(), new Map())).toBe(true);
    });

    it('treats maps with the same entries as equal regardless of order', () => {
      expect(
        deepEqual(
          new Map([
            ['a', 1],
            ['b', 2],
          ]),
          new Map([
            ['b', 2],
            ['a', 1],
          ])
        )
      ).toBe(true);
    });

    it('returns false when sizes differ', () => {
      expect(
        deepEqual(
          new Map([['a', 1]]),
          new Map([
            ['a', 1],
            ['b', 2],
          ])
        )
      ).toBe(false);
    });

    it('returns false when a value differs', () => {
      expect(deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    });

    it('compares keys structurally', () => {
      const left = new Map<{ id: number }, string>([[{ id: 1 }, 'a']]);
      const right = new Map<{ id: number }, string>([[{ id: 1 }, 'a']]);
      expect(deepEqual(left, right)).toBe(true);
    });

    it('compares values recursively', () => {
      expect(deepEqual(new Map([['k', { x: 1 }]]), new Map([['k', { x: 1 }]]))).toBe(true);
      expect(deepEqual(new Map([['k', { x: 1 }]]), new Map([['k', { x: 2 }]]))).toBe(false);
    });
  });

  describe('Set', () => {
    it('treats two empty sets as equal', () => {
      expect(deepEqual(new Set(), new Set())).toBe(true);
    });

    it('treats sets with the same elements as equal regardless of order', () => {
      expect(deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true);
    });

    it('returns false when sizes differ', () => {
      expect(deepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
    });

    it('compares elements recursively', () => {
      expect(deepEqual(new Set([{ x: 1 }]), new Set([{ x: 1 }]))).toBe(true);
      expect(deepEqual(new Set([{ x: 1 }]), new Set([{ x: 2 }]))).toBe(false);
    });
  });

  describe('RegExp', () => {
    it('treats RegExp with the same source and flags as equal', () => {
      expect(deepEqual(/abc/g, /abc/g)).toBe(true);
    });

    it('returns false when source differs', () => {
      expect(deepEqual(/abc/, /abd/)).toBe(false);
    });

    it('returns false when flags differ', () => {
      expect(deepEqual(/abc/g, /abc/i)).toBe(false);
    });

    it('compares the same RegExp reference as equal', () => {
      const r = /abc/;
      expect(deepEqual(r, r)).toBe(true);
    });
  });

  describe('arrays', () => {
    it('treats two empty arrays as equal', () => {
      expect(deepEqual([], [])).toBe(true);
    });

    it('returns true for arrays with the same primitive elements', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('returns false when lengths differ', () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('compares nested arrays recursively', () => {
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
    });

    it('treats order as significant', () => {
      expect(deepEqual([1, 2], [2, 1])).toBe(false);
    });

    it('treats sparse holes as undefined', () => {
      const sparse: (number | undefined)[] = [1, , 3];
      expect(deepEqual(sparse, [1, undefined, 3])).toBe(true);
    });
  });

  describe('plain objects', () => {
    it('treats two empty objects as equal', () => {
      expect(deepEqual({}, {})).toBe(true);
    });

    it('returns true for objects with the same key/value pairs', () => {
      expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    });

    it('returns false when values differ', () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('returns false when key counts differ', () => {
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('treats explicit undefined as a present key', () => {
      // Different own-key counts: { a: 1, b: undefined } has 2 keys, { a: 1 } has 1.
      expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(false);
    });

    it('compares nested objects recursively', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('treats key order as insignificant', () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('treats null-prototype objects as unequal to plain objects (constructor mismatch)', () => {
      const obj = Object.create(null) as Record<string, unknown>;
      obj['a'] = 1;
      expect(deepEqual(obj, { a: 1 })).toBe(false);
    });

    it('treats two null-prototype objects with the same shape as equal', () => {
      const left = Object.create(null) as Record<string, unknown>;
      left['a'] = 1;
      const right = Object.create(null) as Record<string, unknown>;
      right['a'] = 1;
      expect(deepEqual(left, right)).toBe(true);
    });

    it('returns false when one object is missing a key the other has', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
    });
  });

  describe('cross-type comparisons', () => {
    it('treats array and object as unequal', () => {
      expect(deepEqual([], {})).toBe(false);
      expect(deepEqual([1], { 0: 1 })).toBe(false);
    });

    it('treats null/undefined as unequal to objects', () => {
      expect(deepEqual(null, {})).toBe(false);
      expect(deepEqual(undefined, {})).toBe(false);
      expect(deepEqual({}, null)).toBe(false);
    });

    it('treats primitives as unequal to objects', () => {
      expect(deepEqual(1, {})).toBe(false);
      expect(deepEqual('a', {})).toBe(false);
    });
  });

  describe('Date', () => {
    it('treats two dates with the same time as equal', () => {
      expect(deepEqual(new Date(123), new Date(123))).toBe(true);
    });

    it('treats two dates with different times as unequal', () => {
      expect(deepEqual(new Date(123), new Date(456))).toBe(false);
    });

    it('treats two Invalid Dates as equal (NaN-time SameValueZero)', () => {
      expect(deepEqual(new Date('invalid'), new Date('invalid'))).toBe(true);
    });

    it('treats Valid vs Invalid Date as unequal', () => {
      expect(deepEqual(new Date(123), new Date('invalid'))).toBe(false);
    });

    it('treats Date as unequal to non-Date', () => {
      expect(deepEqual(new Date(123), { getTime: () => 123 })).toBe(false);
      expect(deepEqual({ getTime: () => 123 }, new Date(123))).toBe(false);
    });
  });

  describe('mixed real-world form data', () => {
    it('compares a typical form-state shape', () => {
      const symbolKey = Symbol.for('id-42');
      const left = {
        name: 'Alice',
        age: 30,
        createdAt: new Date(123),
        tags: ['a', 'b'],
        notes: [
          { id: symbolKey, body: 'hi', priority: undefined },
          { id: Symbol.for('id-43'), body: 'bye', priority: 1 },
        ],
        valid: true,
      };
      const right = {
        name: 'Alice',
        age: 30,
        createdAt: new Date(123),
        tags: ['a', 'b'],
        notes: [
          { id: Symbol.for('id-42'), body: 'hi', priority: undefined },
          { id: Symbol.for('id-43'), body: 'bye', priority: 1 },
        ],
        valid: true,
      };
      expect(deepEqual(left, right)).toBe(true);
    });

    it('detects a deep mismatch in a typical form-state shape', () => {
      const left = {
        notes: [{ body: 'hi' }, { body: 'bye' }],
      };
      const right = {
        notes: [{ body: 'hi' }, { body: 'BYE' }],
      };
      expect(deepEqual(left, right)).toBe(false);
    });

    it('compares a deeply nested object that covers every z.* form type', () => {
      // Shape mirrors what `z.infer` produces for a schema that uses:
      //   z.object, z.strictObject, z.formArray, z.formString, z.formNumber,
      //   z.formBoolean, z.formDate, z.symbol, z.formValues (form enum),
      //   z.advanced.literal, z.advanced.union, z.advanced.tuple,
      //   z.advanced.record, z.advanced.optional, z.advanced.nullable.
      const buildData = () => ({
        // formString
        name: 'Alice',
        // formNumber
        age: 30,
        // formBoolean
        active: true,
        // formDate
        joinedAt: new Date('2025-01-15T12:00:00Z'),
        // z.symbol() — created via Symbol.for so registry identity matches
        userId: Symbol.for('user-1f7e3c'),
        // formValues (closed string enum)
        role: 'admin' as const,
        // z.advanced.literal
        kind: 'employee' as const,
        // z.advanced.optional formString → string | undefined
        nickname: undefined as string | undefined,
        // z.advanced.nullable formNumber → number | null
        score: null as number | null,
        // z.advanced.tuple — fixed-shape ordered list
        coords: [1, 2, 3] as [number, number, number],
        // z.advanced.union — discriminated by `type`
        contact: { type: 'email', value: 'a@example.com' } as
          | { type: 'email'; value: string }
          | { type: 'phone'; value: string },
        // z.advanced.record — dynamic-key map
        preferences: { theme: 'dark', density: 'compact' } as Record<string, string>,
        // formArray of nested objects, each carrying further nesting
        notes: [
          {
            id: Symbol.for('note-aa11'),
            body: 'first',
            // Nested formArray
            tags: ['urgent', 'later'],
            // Nested optional formNumber
            priority: 1 as number | undefined,
            // Nested formDate
            updatedAt: new Date('2025-02-01T08:30:00Z'),
            // Nested object
            author: { name: 'Alice', handle: 'alice42' },
          },
          {
            id: Symbol.for('note-bb22'),
            body: 'second',
            tags: [] as string[],
            priority: undefined as number | undefined,
            updatedAt: new Date('2025-02-02T09:00:00Z'),
            author: { name: 'Bob', handle: 'bob99' },
          },
        ],
        // Three-level-deep object nesting
        org: {
          team: {
            lead: {
              name: 'Carol',
              hiredAt: new Date('2024-06-01T00:00:00Z'),
              // Array of tuples inside the deep object
              shifts: [['mon', 9] as [string, number], ['wed', 14] as [string, number]],
            },
            // Optional nested record
            metadata: { project: 'Apollo', region: 'us-east' } as Record<string, string>,
          },
        },
        // 2D array of primitives
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        // Array of arrays of objects
        groups: [[{ name: 'g1a' }, { name: 'g1b' }], [{ name: 'g2a' }]],
      });

      const left = buildData();
      const right = buildData();
      expect(deepEqual(left, right)).toBe(true);

      // Flipping a single deeply-buried value must yield false. We test a few
      // tricky spots: a tuple element, a nested Date, a Symbol, a string in a
      // 2D array, and an entry in a record.

      const diffTuple = buildData();
      diffTuple.coords = [1, 2, 4];
      expect(deepEqual(left, diffTuple)).toBe(false);

      const diffDate = buildData();
      diffDate.org.team.lead.hiredAt = new Date('2024-06-02T00:00:00Z');
      expect(deepEqual(left, diffDate)).toBe(false);

      const diffSymbol = buildData();
      const [firstNote] = diffSymbol.notes;
      if (firstNote) {
        firstNote.id = Symbol.for('note-DIFFERENT');
      }
      expect(deepEqual(left, diffSymbol)).toBe(false);

      const diffMatrix = buildData();
      const secondRow = diffMatrix.matrix[1];
      if (secondRow) {
        secondRow[2] = 99;
      }
      expect(deepEqual(left, diffMatrix)).toBe(false);

      const diffRecord = buildData();
      diffRecord.preferences['theme'] = 'light';
      expect(deepEqual(left, diffRecord)).toBe(false);

      const diffUnion = buildData();
      diffUnion.contact = { type: 'phone', value: '555-0000' };
      expect(deepEqual(left, diffUnion)).toBe(false);

      // Flip the string literal field ('employee' → 'contractor'). Literals
      // are nominally typed but structurally just primitives — deepEqual must
      // still flag the change.
      const diffLiteral = buildData();
      diffLiteral.kind = 'employee'; // same value, expect equal
      expect(deepEqual(left, diffLiteral)).toBe(true);
      (diffLiteral as { kind: string }).kind = 'contractor';
      expect(deepEqual(left, diffLiteral)).toBe(false);

      // Flip the formValues field ('admin' → 'viewer').
      const diffEnum = buildData();
      (diffEnum as { role: string }).role = 'viewer';
      expect(deepEqual(left, diffEnum)).toBe(false);

      // Optional flipped from undefined → present should be unequal.
      const diffOptional = buildData();
      diffOptional.nickname = 'ali';
      expect(deepEqual(left, diffOptional)).toBe(false);

      // Nullable null → 0 should be unequal (and not coerced).
      const diffNullable = buildData();
      diffNullable.score = 0;
      expect(deepEqual(left, diffNullable)).toBe(false);

      // Adding a key inside a record changes its key count.
      const diffRecordKeys = buildData();
      diffRecordKeys.preferences['extra'] = 'x';
      expect(deepEqual(left, diffRecordKeys)).toBe(false);
    });
  });
});
