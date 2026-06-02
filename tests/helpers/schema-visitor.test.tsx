import { describe, expect, it, vi } from 'vitest';
import type { AsyncCheckMetaMap } from '../../src/types/form-types';
import { z } from '../../src';
import {
  coerceFormData,
  collectActiveAsyncCheckPaths,
  collectAsyncCheckPaths,
  commitActiveAsyncCheckPaths,
  invalidateAsyncCheckPrevByPath,
  isAsyncSchema,
  setAsyncCheckPhase,
  withMetaMap,
} from '../../src/helpers/schema-visitor';

const skipWhenPrevExists = (_item: unknown, prevItem: unknown) => prevItem !== undefined;

describe('isAsyncSchema', () => {
  it('returns false for a schema with no async checks', () => {
    const schema = z.object({ name: z.formString({ required: true }) });

    expect(isAsyncSchema(schema)).toBe(false);
  });

  it('returns true for a schema with a top-level async check', () => {
    const schema = z
      .object({ name: z.formString({ required: true }) })
      .check(z.validateAsync(() => Promise.resolve(true), 'nope'));

    expect(isAsyncSchema(schema)).toBe(true);
  });

  it('returns true for an optional schema with a top-level async check', () => {
    const schema = z.advanced.optional(
      z
        .object({ name: z.formString({ required: true }) })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope'))
    );

    expect(isAsyncSchema(schema)).toBe(true);
  });

  it('returns true when an async check is nested in an object property', () => {
    const schema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
    });

    expect(isAsyncSchema(schema)).toBe(true);
  });

  it('returns true when an async check is nested in an array element', () => {
    const schema = z.object({
      tags: z.formArray(
        z.formString({ required: true }).check(z.validateAsync(() => Promise.resolve(true), 'nope'))
      ),
    });

    expect(isAsyncSchema(schema)).toBe(true);
  });

  it('returns true when the schema is a string', () => {
    const schema = z.string().check(z.validateAsync(() => Promise.resolve(true), 'nope'));

    expect(isAsyncSchema(schema)).toBe(true);
  });

  it('returns true when the schema is an array', () => {
    const schema = z
      .formArray(z.formString({ required: true }))
      .check(z.validateAsync(() => Promise.resolve(true), 'nope'));

    expect(isAsyncSchema(schema)).toBe(true);
  });
});

describe('collectAsyncCheckPaths', () => {
  it('returns an empty array for a schema with no async checks', () => {
    const schema = z.object({ name: z.formString({ required: true }) });

    expect(collectAsyncCheckPaths(schema)).toStrictEqual([]);
  });

  it('returns the field path for an async check nested in an object property', () => {
    const schema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
    });

    expect(collectAsyncCheckPaths(schema)).toStrictEqual(['name']);
  });

  it('returns an empty string for a top-level async check', () => {
    const schema = z
      .object({ name: z.formString({ required: true }) })
      .check(z.validateAsync(() => Promise.resolve(true), 'nope'));

    expect(collectAsyncCheckPaths(schema)).toStrictEqual(['']);
  });

  it('includes an array-element async path with a .0 segment', () => {
    const schema = z.object({
      tags: z.formArray(
        z.formString({ required: true }).check(z.validateAsync(() => Promise.resolve(true), 'nope'))
      ),
    });

    expect(collectAsyncCheckPaths(schema)).toStrictEqual(['tags.0']);
  });

  it('honors an explicit path override on the async check', () => {
    const schema = z
      .object({ name: z.formString({ required: true }) })
      .check(z.validateAsync(() => Promise.resolve(true), { path: 'name', error: 'nope' }));

    expect(collectAsyncCheckPaths(schema)).toStrictEqual(['name']);
  });

  it('filters out symbol parts from the schema path', () => {
    // Async refinement carrying a symbol in its path (zod stores path as PropertyKey[]).
    const sym = Symbol('hidden');
    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        path: [sym, 'name'] as unknown as string[],
        error: 'nope',
      })
    );

    // The symbol is filtered; only the string segment remains.
    expect(collectAsyncCheckPaths(schema)).toStrictEqual(['name']);
  });

  it('collects multiple async checks across nested fields', () => {
    const schema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      info: z.object({
        email: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      }),
    });

    const paths = collectAsyncCheckPaths(schema);
    expect(paths).toContain('name');
    expect(paths).toContain('info.email');
    expect(paths).toHaveLength(2);
  });

  it('caches the result per schema instance', () => {
    const schema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
    });

    const first = collectAsyncCheckPaths(schema);
    const second = collectAsyncCheckPaths(schema);

    expect(second).toBe(first);
  });
});

describe('collectActiveAsyncCheckPaths', () => {
  it('returns an empty array for a schema with no async checks', () => {
    const schema = z.object({ name: z.formString({ required: true }) });

    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' })).toStrictEqual([]);
  });

  it('returns the path of an active async check', () => {
    const schema = z.object({
      name: z
        .formString({ required: true })
        .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
    });

    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' })).toStrictEqual(['name']);
  });

  it('omits checks whose skipWhen returns true', () => {
    const schema = z.object({
      name: z.formString({ required: true }).check(
        z.validateAsync(() => Promise.resolve(true), {
          error: 'nope',
          skipWhen: (item) => item === 'skip-me',
        })
      ),
    });

    expect(collectActiveAsyncCheckPaths(schema, { name: 'skip-me' })).toStrictEqual([]);
    expect(collectActiveAsyncCheckPaths(schema, { name: 'run-me' })).toStrictEqual(['name']);
  });

  it('passes the value at the check location to skipWhen, not the root', () => {
    const seen: unknown[] = [];
    const schema = z.object({
      name: z.formString({ required: true }).check(
        z.validateAsync(() => Promise.resolve(true), {
          error: 'nope',
          skipWhen: (item) => {
            seen.push(item);
            return false;
          },
        })
      ),
    });

    collectActiveAsyncCheckPaths(schema, { name: 'Mike' });

    expect(seen).toStrictEqual(['Mike']);
  });

  it('emits one path per actual array index, honoring skipWhen per item', () => {
    const schema = z.object({
      tags: z.formArray(
        z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            skipWhen: (item) => item === 'skip',
          })
        )
      ),
    });

    const paths = collectActiveAsyncCheckPaths(schema, {
      tags: ['keep', 'skip', 'keep'],
    });

    expect(paths).toStrictEqual(['tags.0', 'tags.2']);
  });

  it('uses an empty string for a top-level async check and forwards the root value', () => {
    const seen: unknown[] = [];
    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        error: 'nope',
        skipWhen: (item) => {
          seen.push(item);
          return false;
        },
      })
    );

    const paths = collectActiveAsyncCheckPaths(schema, { name: 'Mike' });

    expect(paths).toStrictEqual(['']);
    expect(seen).toStrictEqual([{ name: 'Mike' }]);
  });

  it('filters symbol parts and joins multi-segment paths with dots', () => {
    const sym = Symbol('hidden');
    const schema = z.object({ user: z.object({ name: z.formString({ required: true }) }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        path: [sym, 'user', 'name'] as unknown as string[],
        error: 'nope',
      })
    );

    // Symbol stripped; remaining segments joined by '.'.
    expect(collectActiveAsyncCheckPaths(schema, { user: { name: 'Mike' } })).toStrictEqual([
      'user.name',
    ]);
  });

  it('does not cache — recomputes on each call so skipWhen sees fresh data', () => {
    let skipNext = false;
    const schema = z.object({
      name: z.formString({ required: true }).check(
        z.validateAsync(() => Promise.resolve(true), {
          error: 'nope',
          skipWhen: () => skipNext,
        })
      ),
    });

    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' })).toStrictEqual(['name']);
    skipNext = true;
    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' })).toStrictEqual([]);
  });

  describe('inferred attachment location (setLocation via walker)', () => {
    it('keys prevValues by the property name for property-level checks', () => {
      const skipCalls: Array<{ item: unknown; prev: unknown }> = [];
      const schema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            skipWhen: (item, prev) => {
              skipCalls.push({ item, prev });
              return false;
            },
          })
        ),
      });

      collectActiveAsyncCheckPaths(schema, { name: 'Mike' });
      commitActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'change');
      skipCalls.length = 0;

      collectActiveAsyncCheckPaths(schema, { name: 'Alice' });

      expect(skipCalls).toHaveLength(1);
      expect(skipCalls[0]).toStrictEqual({ item: 'Alice', prev: 'Mike' });
    });

    it('keys prevValues by the dot path for nested-object property checks', () => {
      const skipCalls: Array<{ item: unknown; prev: unknown }> = [];
      const schema = z.object({
        addr: z.object({
          city: z.formString({ required: true }).check(
            z.validateAsync(() => Promise.resolve(true), {
              error: 'nope',
              skipWhen: (item, prev) => {
                skipCalls.push({ item, prev });
                return false;
              },
            })
          ),
        }),
      });

      collectActiveAsyncCheckPaths(schema, { addr: { city: 'NYC' } });
      commitActiveAsyncCheckPaths(schema, { addr: { city: 'NYC' } }, 'change');
      skipCalls.length = 0;

      collectActiveAsyncCheckPaths(schema, { addr: { city: 'LA' } });

      expect(skipCalls).toHaveLength(1);
      expect(skipCalls[0]).toStrictEqual({ item: 'LA', prev: 'NYC' });
    });

    it('keys prevValues by index path for array-element property checks', () => {
      const skipCalls: Array<{ item: unknown; prev: unknown }> = [];
      const schema = z.object({
        tags: z.formArray(
          z.formString({ required: true }).check(
            z.validateAsync(() => Promise.resolve(true), {
              error: 'nope',
              skipWhen: (item, prev) => {
                skipCalls.push({ item, prev });
                return false;
              },
            })
          )
        ),
      });

      collectActiveAsyncCheckPaths(schema, { tags: ['a', 'b', 'c'] });
      commitActiveAsyncCheckPaths(schema, { tags: ['a', 'b', 'c'] }, 'change');
      skipCalls.length = 0;

      // Change only tags[1]. The walker visits each index and passes the per-
      // index prev — proving each array slot has its own `prevValues` entry.
      collectActiveAsyncCheckPaths(schema, { tags: ['a', 'B', 'c'] });

      expect(skipCalls).toStrictEqual([
        { item: 'a', prev: 'a' },
        { item: 'B', prev: 'b' },
        { item: 'c', prev: 'c' },
      ]);
    });

    it('keys prevValues by empty string for object-level (root-attached) checks', () => {
      const skipCalls: Array<{ item: unknown; prev: unknown }> = [];
      const schema = z.object({ name: z.formString({ required: true }) }).check(
        z.validateAsync(() => Promise.resolve(true), {
          path: ['name'],
          error: 'nope',
          skipWhen: (item, prev) => {
            skipCalls.push({ item, prev });
            return false;
          },
        })
      );

      const initial = { name: 'Mike' };
      collectActiveAsyncCheckPaths(schema, initial);
      commitActiveAsyncCheckPaths(schema, initial, 'change');
      skipCalls.length = 0;

      collectActiveAsyncCheckPaths(schema, { name: 'Alice' });

      expect(skipCalls).toHaveLength(1);
      // Prev is the previously committed root object at the empty-string key.
      expect(skipCalls[0]?.prev).toBe(initial);
    });
  });

  describe('submitOnly', () => {
    it('omits submitOnly checks during the change phase', () => {
      const schema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            submitOnly: true,
          })
        ),
      });

      expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'change')).toStrictEqual([]);
    });

    it('includes submitOnly checks during the submit phase', () => {
      const schema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            submitOnly: true,
          })
        ),
      });

      expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'submit')).toStrictEqual([
        'name',
      ]);
    });

    it('defaults phase to "change" when omitted', () => {
      const schema = z.object({
        name: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope',
            submitOnly: true,
          })
        ),
      });

      expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' })).toStrictEqual([]);
    });

    it('keeps non-submitOnly checks active in both phases', () => {
      const schema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope')),
      });

      expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'change')).toStrictEqual([
        'name',
      ]);
      expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'submit')).toStrictEqual([
        'name',
      ]);
    });

    it('mixes submitOnly and regular checks correctly per phase', () => {
      const schema = z.object({
        name: z
          .formString({ required: true })
          .check(z.validateAsync(() => Promise.resolve(true), 'nope-name')),
        email: z.formString({ required: true }).check(
          z.validateAsync(() => Promise.resolve(true), {
            error: 'nope-email',
            submitOnly: true,
          })
        ),
      });

      expect(
        collectActiveAsyncCheckPaths(schema, { name: 'Mike', email: 'a@b.c' }, 'change')
      ).toStrictEqual(['name']);
      expect(
        collectActiveAsyncCheckPaths(schema, { name: 'Mike', email: 'a@b.c' }, 'submit')
      ).toStrictEqual(['name', 'email']);
    });
  });
});

describe('invalidateAsyncCheckPrevByPath', () => {
  it('clears committed prev for a check whose fullPath matches (object-level, empty location)', () => {
    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        path: ['name'],
        error: 'nope',
        skipWhen: skipWhenPrevExists,
      })
    );
    const metaMap: AsyncCheckMetaMap = new Map();

    commitActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'submit', metaMap);

    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'submit', metaMap)).toStrictEqual(
      []
    );

    invalidateAsyncCheckPrevByPath(schema, (key) => key === 'name', metaMap);

    expect(collectActiveAsyncCheckPaths(schema, { name: 'Mike' }, 'submit', metaMap)).toStrictEqual(
      ['name']
    );
  });

  it('clears committed prev for a check whose fullPath joins location and suffix with a dot', () => {
    const schema = z.object({
      notes: z.array(
        z.object({
          text: z.formString({ required: true }).check(
            z.validateAsync(() => Promise.resolve(true), {
              error: 'nope',
              skipWhen: skipWhenPrevExists,
            })
          ),
        })
      ),
    });
    const metaMap: AsyncCheckMetaMap = new Map();
    const data = { notes: [{ text: 'a' }] };

    commitActiveAsyncCheckPaths(schema, data, 'submit', metaMap);
    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual([]);

    invalidateAsyncCheckPrevByPath(schema, (key) => key === 'notes.0.text', metaMap);

    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual([
      'notes.0.text',
    ]);
  });

  it('handles an object-level check with no path (location and suffix both empty)', () => {
    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        error: 'nope',
        skipWhen: skipWhenPrevExists,
      })
    );
    const metaMap: AsyncCheckMetaMap = new Map();
    const data = { name: 'Mike' };

    commitActiveAsyncCheckPaths(schema, data, 'submit', metaMap);
    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual([]);

    invalidateAsyncCheckPrevByPath(schema, (key) => key === '', metaMap);

    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual(['']);
  });

  it('leaves committed prev untouched when the predicate does not match', () => {
    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(() => Promise.resolve(true), {
        path: ['name'],
        error: 'nope',
        skipWhen: skipWhenPrevExists,
      })
    );
    const metaMap: AsyncCheckMetaMap = new Map();
    const data = { name: 'Mike' };

    commitActiveAsyncCheckPaths(schema, data, 'submit', metaMap);
    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual([]);

    invalidateAsyncCheckPrevByPath(schema, (key) => key === 'other.field', metaMap);

    expect(collectActiveAsyncCheckPaths(schema, data, 'submit', metaMap)).toStrictEqual([]);
  });

  it('also clears the whenGate `prevValues` cache so Zod refines re-run after invalidation', async () => {
    const predicate = vi.fn(() => Promise.resolve(true));

    const schema = z.object({ name: z.formString({ required: true }) }).check(
      z.validateAsync(predicate, {
        path: ['name'],
        error: 'nope',
        skipWhen: (_item, prev) => prev !== undefined,
      })
    );
    const metaMap: AsyncCheckMetaMap = new Map();
    const data = { name: 'Mike' };

    await withMetaMap(metaMap, () => schema.safeParseAsync(data));
    expect(predicate).toHaveBeenCalledTimes(1);

    await withMetaMap(metaMap, () => schema.safeParseAsync(data));
    expect(predicate).toHaveBeenCalledTimes(1);

    invalidateAsyncCheckPrevByPath(schema, (key) => key === 'name', metaMap);
    await withMetaMap(metaMap, () => schema.safeParseAsync(data));
    expect(predicate).toHaveBeenCalledTimes(2);
  });
});

describe('setAsyncCheckPhase', () => {
  it('gates Zod safeParseAsync so submitOnly predicates do not fire during change', async () => {
    const predicate = vi.fn((value: string) => Promise.resolve(value.length > 0));
    const schema = z.object({
      name: z.formString({ required: true }).check(
        z.validateAsync<string>(predicate, {
          error: 'nope',
          submitOnly: true,
        })
      ),
    });

    setAsyncCheckPhase(schema, 'change');
    await schema.safeParseAsync({ name: 'Mike' });

    expect(predicate).not.toHaveBeenCalled();

    setAsyncCheckPhase(schema, 'submit');
    await schema.safeParseAsync({ name: 'Mike' });

    expect(predicate).toHaveBeenCalledTimes(1);
  });
});

describe('coerceFormData', () => {
  it('returns the same reference when no field needs coercion', () => {
    const schema = z.object({
      name: z.formString({ required: true }),
      age: z.formNumber({ required: true }),
    });
    const data = { name: 'Mike', age: 42 };

    expect(coerceFormData(schema, data)).toBe(data);
  });

  it('coerces a formDate string into a Date', () => {
    const schema = z.object({
      submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
    });

    const out = coerceFormData(schema, {
      submitDate: '2026-05-22',
    });

    expect(out.submitDate).toBeInstanceOf(Date);
    expect((out.submitDate as Date).getFullYear()).toBe(2026);
    expect((out.submitDate as Date).getMonth()).toBe(4);
    expect((out.submitDate as Date).getDate()).toBe(22);
  });

  it('uses the default `yyyy-MM-dd` format when the formDate-shaped schema has no format metadata', () => {
    const dateField = z.advanced.pipe(
      z.advanced.transform((value: unknown) =>
        typeof value === 'string' ? new Date(value) : value
      ),
      z.advanced.union([z.date(), z.string()])
    );
    const schema = z.object({ d: dateField });

    const out = coerceFormData(schema, { d: '2026-05-22' });

    expect((out as { d: unknown }).d).toBeInstanceOf(Date);
  });

  it('passes through an already-coerced Date value', () => {
    const schema = z.object({
      submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
    });
    const date = new Date(2026, 4, 22);
    const data = { submitDate: date };

    const out = coerceFormData(schema, data);

    expect(out).toBe(data);
    expect(out.submitDate).toBe(date);
  });

  it('passes through an empty-string value for an optional formDate', () => {
    const schema = z.object({
      submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
    });
    const data = { submitDate: '' as unknown as Date };

    const out = coerceFormData(schema, data);

    expect(out).toBe(data);
  });

  it('keeps the raw value when the date string fails to parse', () => {
    const schema = z.object({
      submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
    });
    const data = { submitDate: 'not-a-date' as unknown as Date };

    const out = coerceFormData(schema, data);

    expect(out.submitDate).toBe('not-a-date');
  });

  it('leaves non-string formDate values untouched (e.g. numbers do not coerce here)', () => {
    const schema = z.object({
      submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
    });
    const data = { submitDate: 12345 as unknown as Date };

    const out = coerceFormData(schema, data);

    expect(out.submitDate).toBe(12345);
  });

  it('coerces a formDate nested inside an object', () => {
    const schema = z.object({
      entry: z.object({
        submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
      }),
    });

    const out = coerceFormData(schema, {
      entry: { submitDate: '2026-05-22' },
    });

    expect(out.entry.submitDate).toBeInstanceOf(Date);
  });

  it('coerces a formDate inside an array element', () => {
    type Entry = { submitDate: Date };
    const schema = z.object({
      entries: z.array(
        z.object({
          submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }),
        })
      ),
    });

    const out = coerceFormData(schema, {
      entries: [{ submitDate: '2026-05-22' }, { submitDate: '2026-05-23' }],
    }) as { entries: Entry[] };

    expect(out.entries[0]?.submitDate).toBeInstanceOf(Date);
    expect(out.entries[1]?.submitDate).toBeInstanceOf(Date);
  });

  it('preserves the references of array elements that did not change', () => {
    type Entry = { submitDate: Date };
    const schema = z.object({
      entries: z.array(z.object({ submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }) })),
    });
    const unchangedEntry = { submitDate: new Date(2026, 0, 1) };
    const changingEntry = { submitDate: '2026-05-22' };
    const data = { entries: [unchangedEntry, changingEntry] };

    const out = coerceFormData(schema, data as never) as { entries: Entry[] };

    // The whole object reference changes (one entry was coerced); the unchanged
    // entry retains its reference inside the new array.
    expect(out).not.toBe(data);
    expect(out.entries[0]).toBe(unchangedEntry);
    expect(out.entries[1]).not.toBe(changingEntry);
    expect(out.entries[1]?.submitDate).toBeInstanceOf(Date);
  });

  it('returns the same array reference when no element changed', () => {
    type Entry = { submitDate: Date };
    const schema = z.object({
      entries: z.array(z.object({ submitDate: z.formDate({ dateFormat: 'yyyy-MM-dd' }) })),
    });
    const entries = [{ submitDate: new Date(2026, 0, 1) }, { submitDate: new Date(2026, 0, 2) }];
    const data = { entries };

    const out = coerceFormData(schema, data as never) as { entries: Entry[] };

    expect(out).toBe(data);
    expect(out.entries).toBe(entries);
  });

  it('returns the input unchanged for a non-object, non-array root schema', () => {
    const schema = z.formString({ required: true });

    expect(coerceFormData(schema as never, 'hello' as never)).toBe('hello');
  });

  it('returns the input unchanged for an array root schema with non-array data', () => {
    const schema = z.formArray(z.formString({ required: true }));

    // Defensive: if the caller passes data that isn't actually an array, the
    // helper should pass it through rather than crash.
    expect(coerceFormData(schema as never, 'not-an-array' as never)).toBe('not-an-array');
  });
});
