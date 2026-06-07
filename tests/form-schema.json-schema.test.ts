import { describe, expect, it } from 'vitest';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import { z } from '../src';

describe('toJSONSchema', () => {
  it('should return a stringified JSON schema', () => {
    const testSchema = z
      .object({
        name: z.formString({ required: true }).with(z.describe('Name')),
        age: z.formNumber(),
      })
      .with(z.describe('Person'));

    const result = testSchema.toJSONSchema();

    expect(typeof result).toBe('string');

    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed['type']).toBe('object');
    expect(parsed['description']).toBe('Person');
  });

  it('should pretty-print with two-space indentation by default', () => {
    const testSchema = z.object({ name: z.formString() });

    const pretty = testSchema.toJSONSchema();
    const compact = testSchema.toJSONSchema(false);

    expect(pretty).toBe(JSON.stringify(JSON.parse(compact), undefined, 2));
    expect(pretty).toContain('\n  ');
  });

  it('should produce compact output when formatted is false', () => {
    const testSchema = z.object({ name: z.formString() });

    const compact = testSchema.toJSONSchema(false);

    expect(compact).not.toContain('\n');
    expect(JSON.parse(compact)).toStrictEqual(JSON.parse(testSchema.toJSONSchema()));
  });

  it('should include the schema description and properties', () => {
    const testSchema = z
      .object({
        name: z.formString({ required: true }),
        age: z.formNumber(),
      })
      .with(z.describe('Person'));

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      description?: string;
      properties?: Record<string, unknown>;
    };

    expect(parsed.description).toBe('Person');
    expect(parsed.properties).toHaveProperty('name');
    expect(parsed.properties).toHaveProperty('age');
  });

  it('should reflect constraint checks (min/max/pattern)', () => {
    const testSchema = z.object({
      name: z.formString(
        { required: true },
        z.maxLength(25, 'Too long'),
        z.regex(/^[a-z]+$/, 'Invalid')
      ),
      age: z.formNumber({ required: true }, z.gte(1, 'Too small'), z.lte(120, 'Too big')),
      tags: z.formArray(z.formString({ required: true }), { minLength: 1, maxLength: 5 }),
    });

    const json = testSchema.toJSONSchema(false);

    expect(json).toContain('"maxLength":25');
    expect(json).toContain('"pattern"');
    expect(json).toContain('"minimum":1');
    expect(json).toContain('"maximum":120');
    expect(json).toContain('"minItems":1');
    expect(json).toContain('"maxItems":5');
  });

  it('should strip empty-string editing artifacts and collapse optional fields', () => {
    const testSchema = z.object({
      num: z.formNumber(),
      bool: z.formBoolean(),
      str: z.formString(),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, unknown>;
    };

    expect(testSchema.toJSONSchema(false)).not.toContain('"const":""');
    expect(parsed.properties['num']).toStrictEqual({ type: 'number' });
    expect(parsed.properties['bool']).toStrictEqual({ type: 'boolean' });
    expect(parsed.properties['str']).toStrictEqual({ type: 'string' });
  });

  it('should not emit form-only meta keys (allowEmpty, per-field required)', () => {
    const testSchema = z.object({
      a: z.formString({ required: true }),
      b: z.formString({ allowEmpty: false }),
      c: z.formNumber(),
    });

    const json = testSchema.toJSONSchema(false);

    expect(json).not.toContain('"allowEmpty"');
    expect(json).not.toContain('"required":true');
  });

  it('should express optionality natively via the object required array', () => {
    const testSchema = z.object({
      reqStr: z.formString({ required: true }),
      optStr: z.formString(),
      reqNum: z.formNumber({ required: true }),
      optNum: z.formNumber(),
      reqDate: z.formDate({ required: true }),
      optDate: z.formDate(),
      reqValues: z.formValues(['a', 'b'], { required: true }),
      optValues: z.formValues(['a', 'b']),
      reqArr: z.formArray(z.formString({ required: true }), { required: true }),
      optArr: z.formArray(z.formString({ required: true }), { required: false }),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as { required?: string[] };
    const required = parsed.required ?? [];

    for (const name of ['reqArr', 'reqDate', 'reqNum', 'reqStr', 'reqValues']) {
      expect(required).toContain(name);
    }
    for (const optional of ['optStr', 'optNum', 'optDate', 'optValues', 'optArr']) {
      expect(required).not.toContain(optional);
    }
    expect(required).toHaveLength(5);
  });

  it('should omit the required array entirely when every field is optional', () => {
    const testSchema = z.object({
      a: z.formString(),
      b: z.formNumber(),
      c: z.formBoolean(),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as Record<string, unknown>;

    expect(parsed).not.toHaveProperty('required');
  });

  it('should strip the empty-string entry from an optional formValues enum', () => {
    const testSchema = z.object({
      required: z.formValues(['a', 'b'], { required: true }),
      optional: z.formValues(['a', 'b']),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, { enum?: string[] }>;
    };

    expect(parsed.properties['required']?.enum).toStrictEqual(['a', 'b']);
    expect(parsed.properties['optional']?.enum).toStrictEqual(['a', 'b']);
    expect(parsed.properties['optional']?.enum).not.toContain('');
  });

  it('should prune symbol fields and drop them from required (mirrors toObject)', () => {
    const testSchema = z.object({
      uuid: z.symbol(),
      birthDate: z.formDate({ dateFormat: 'MM-dd-yyyy' }),
      name: z.formString({ required: true }),
    });

    expect(() => testSchema.toJSONSchema()).not.toThrow();

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, unknown>;
      required?: string[];
    };

    expect(parsed.properties).not.toHaveProperty('uuid');
    expect(parsed.required).not.toContain('uuid');

    expect(parsed.properties).toHaveProperty('birthDate');
    expect(parsed.properties).toHaveProperty('name');
    expect(parsed.required).toContain('name');
  });

  it('should render formDate as a date-typed string with a format-specific pattern', () => {
    const testSchema = z.object({
      created: z.formDate({ dateFormat: 'MM/dd/yyyy', required: true }),
      updated: z.formDate({ dateFormat: 'dd.MM.yyyy' }),
      isoDefault: z.formDate(),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, { type?: string; format?: string; pattern?: string }>;
    };

    expect(parsed.properties['created']).toMatchObject({ type: 'string' });
    expect(parsed.properties['created']).not.toHaveProperty('format');
    expect(parsed.properties['updated']).toMatchObject({ type: 'string' });
    expect(parsed.properties['updated']).not.toHaveProperty('format');
    expect(parsed.properties['isoDefault']).toMatchObject({ type: 'string', format: 'date' });

    const created = new RegExp(parsed.properties['created']?.pattern ?? '');
    const updated = new RegExp(parsed.properties['updated']?.pattern ?? '');
    const iso = new RegExp(parsed.properties['isoDefault']?.pattern ?? '');

    expect(created.test('12/31/2025')).toBe(true);
    expect(created.test('2025-12-31')).toBe(false);
    expect(created.test('13/31/2025')).toBe(false); // invalid month
    expect(updated.test('31.12.2025')).toBe(true);
    expect(updated.test('12/31/2025')).toBe(false);
    expect(iso.test('2025-12-31')).toBe(true);
    expect(iso.test('2025-13-31')).toBe(false); // invalid month
    expect(iso.test('2025-12-32')).toBe(false); // invalid day

    expect(testSchema.toJSONSchema(false)).not.toContain('x-dateFormat');
    expect(testSchema.toJSONSchema(false)).not.toContain('{}');
  });

  it('should preserve a genuine multi-member union (no empty-string artifact to strip)', () => {
    const testSchema = z.object({
      value: z.advanced.union([z.string(), z.number(), z.boolean()]),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, { anyOf?: { type?: string }[] }>;
    };

    const members = parsed.properties['value']?.anyOf ?? [];

    expect(members).toHaveLength(3);
    expect(members.map((member) => member.type)).toEqual(
      expect.arrayContaining(['string', 'number', 'boolean'])
    );
  });

  it('should keep a deliberate empty-string literal in a genuine multi-member union', () => {
    const testSchema = z.object({
      value: z.advanced.union([
        z.advanced.literal('a'),
        z.advanced.literal('b'),
        z.advanced.literal(''),
      ]),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, { anyOf?: { const?: string }[] }>;
    };

    const members = parsed.properties['value']?.anyOf ?? [];

    expect(members).toHaveLength(3);
    expect(members.some((member) => member.const === '')).toBe(true);
  });

  it('should recurse into array-valued keywords such as tuple prefixItems', () => {
    const testSchema = z.object({
      pair: z.advanced.tuple([z.formString({ required: true }), z.formNumber({ required: true })]),
    });

    const parsed = JSON.parse(testSchema.toJSONSchema()) as {
      properties: Record<string, { type?: string; prefixItems?: { type?: string }[] }>;
    };

    const pair = parsed.properties['pair'];

    expect(pair?.type).toBe('array');
    expect(pair?.prefixItems).toHaveLength(2);
    expect(pair?.prefixItems?.[0]).toMatchObject({ type: 'string' });
    expect(pair?.prefixItems?.[1]).toMatchObject({ type: 'number' });
  });
});

const buildSchema = () =>
  z.object({
    name: z.formString({ required: true }, z.maxLength(25)),
    nickname: z.formString(),
    age: z.formNumber({ required: true }, z.gte(0), z.lte(150)),
    score: z.formNumber(),
    active: z.formBoolean({ required: true }),
    archived: z.formBoolean(),
    category: z.formValues(['a', 'b'], { required: true }),
    optCategory: z.formValues(['x', 'y']),
    joined: z.formDate({ required: true, dateFormat: 'MM/dd/yyyy' }),
    left: z.formDate({ dateFormat: 'dd.MM.yyyy' }),
    tags: z.formArray(z.formString({ required: true }), { minLength: 1, maxLength: 3 }),
    optTags: z.formArray(z.formString({ required: true }), { required: false }),
    profile: z.object({
      bio: z.formString(),
      rating: z.formNumber({ required: true }, z.gte(1), z.lte(5)),
      address: z.object({
        city: z.formString({ required: true }),
        zip: z.formString(),
      }),
    }),
    contacts: z.array(
      z.object({
        label: z.formString({ required: true }),
        verified: z.formBoolean(),
      })
    ),
  });

const compile = (schema: ReturnType<typeof buildSchema>) => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  return ajv.compile(JSON.parse(schema.toJSONSchema()));
};

describe('toObject output validates against toJSONSchema', () => {
  it('accepts the cleaned object for a fully-populated complex schema', () => {
    const schema = buildSchema();

    const editingData = {
      name: 'John',
      nickname: '',
      age: 30,
      score: '',
      active: true,
      archived: false,
      category: 'a',
      optCategory: '',
      joined: '12/31/2025',
      left: '',
      tags: ['react', 'forms'],
      optTags: [],
      profile: {
        bio: '',
        rating: 4,
        address: { city: 'NYC', zip: '' },
      },
      contacts: [{ label: 'home', verified: true }],
    } as unknown as z.infer<typeof schema>;

    const parsed = schema.safeParse(editingData);
    expect(parsed.success).toBe(true);

    const cleaned = schema.toObject(parsed.data ?? editingData);
    const validate = compile(schema);
    const valid = validate(cleaned);

    expect(validate.errors ?? []).toStrictEqual([]);
    expect(valid).toBe(true);
  });

  it('accepts the cleaned object when only required fields are provided', () => {
    const schema = buildSchema();

    const minimalData = {
      name: 'Jane',
      nickname: '',
      age: 0,
      score: '',
      active: false,
      archived: false,
      category: 'b',
      optCategory: '',
      joined: '01/01/2000',
      left: '',
      tags: ['only'],
      optTags: [],
      profile: {
        bio: '',
        rating: 1,
        address: { city: 'LA', zip: '' },
      },
      contacts: [],
    } as unknown as z.infer<typeof schema>;

    const parsed = schema.safeParse(minimalData);
    expect(parsed.success).toBe(true);

    const cleaned = schema.toObject(parsed.data ?? minimalData);
    const validate = compile(schema);

    expect(validate.errors ?? []).toStrictEqual([]);
    expect(validate(cleaned)).toBe(true);
  });

  it('rejects an object missing a required field', () => {
    const schema = buildSchema();
    const validate = compile(schema);

    // `name` (required) and `joined` (required) removed.
    const invalid = {
      age: 30,
      active: true,
      category: 'a',
      tags: ['x'],
      profile: { rating: 4, address: { city: 'NYC' } },
      contacts: [],
    };

    expect(validate(invalid)).toBe(false);
    const missing = (validate.errors ?? [])
      .filter((error) => error.keyword === 'required')
      .map((error) => (error.params as { missingProperty: string }).missingProperty);

    expect(missing).toContain('name');
    expect(missing).toContain('joined');
  });

  it('rejects a date that does not match its format pattern', () => {
    const schema = buildSchema();
    const validate = compile(schema);

    const base = {
      name: 'John',
      age: 30,
      active: true,
      category: 'a',
      joined: '2025-12-31', // ISO, but `joined` requires MM/dd/yyyy
      tags: ['x'],
      profile: { rating: 4, address: { city: 'NYC' } },
      contacts: [],
    };

    expect(validate(base)).toBe(false);
    expect((validate.errors ?? []).some((error) => error.keyword === 'pattern')).toBe(true);
  });

  it('rejects a value outside an enum', () => {
    const schema = buildSchema();
    const validate = compile(schema);

    const base = {
      name: 'John',
      age: 30,
      active: true,
      category: 'z', // not in ['a','b']
      joined: '12/31/2025',
      tags: ['x'],
      profile: { rating: 4, address: { city: 'NYC' } },
      contacts: [],
    };

    expect(validate(base)).toBe(false);
    expect((validate.errors ?? []).some((error) => error.keyword === 'enum')).toBe(true);
  });
});
