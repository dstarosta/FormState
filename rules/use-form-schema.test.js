import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { useFormSchema } from './use-form-schema.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('use-form-schema', useFormSchema, {
  valid: [
    // Not inside any schema
    { code: 'const s = z.string()' },
    { code: 'z.number()' },

    // Already using form helpers
    { code: 'z.object({ name: z.formString() })' },
    { code: 'z.object({ age: z.formNumber() })' },
    { code: 'z.object({ active: z.formBoolean() })' },
    { code: 'z.object({ date: z.formDate() })' },
    { code: 'z.object({ tags: z.formArray() })' },

    // z.primitive() as argument to a form* helper — skip condition
    { code: 'z.object({ name: z.formString(z.string(), { required: true }) })' },
    { code: 'z.object({ age: z.formNumber(z.number()) })' },
    { code: 'z.object({ active: z.formBoolean(z.boolean()) })' },

    // z.array with z.object/z.array first arg — not reported
    { code: 'z.object({ items: z.array(z.object({ id: z.formNumber() })) })' },
    { code: 'z.object({ matrix: z.array(z.array(z.formString())) })' },

    // Non-z namespace
    { code: 'z.object({ name: foo.string() })' },

    // z methods not in the primitive mapping
    { code: "z.object({ status: z.enum(['a', 'b']) })" },
    { code: 'z.object({ id: z.literal(1) })' },
    { code: 'z.object({ val: z.unknown() })' },

    // Chained methods — z.string() is not the direct property value
    { code: 'z.object({ name: z.string().optional() })' },
    { code: 'z.object({ name: z.string().min(1) })' },
    { code: 'z.object({ age: z.number().min(0).max(120) })' },
  ],
  invalid: [
    {
      code: 'z.object({ name: z.string() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formString', primitive: 'string' } }],
      output: 'z.object({ name: z.formString() })',
    },
    {
      code: 'z.object({ age: z.number() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formNumber', primitive: 'number' } }],
      output: 'z.object({ age: z.formNumber() })',
    },
    {
      code: 'z.object({ active: z.boolean() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formBoolean', primitive: 'boolean' } }],
      output: 'z.object({ active: z.formBoolean() })',
    },
    {
      code: 'z.object({ date: z.date() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formDate', primitive: 'date' } }],
      output: 'z.object({ date: z.formDate() })',
    },
    {
      code: 'z.object({ tags: z.array() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formArray', primitive: 'array' } }],
      output: 'z.object({ tags: z.formArray() })',
    },
    // z.array with a non-object/non-array first arg
    {
      code: 'z.object({ tags: z.array(z.string()) })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formArray', primitive: 'array' } }],
      output: 'z.object({ tags: z.formArray(z.string()) })',
    },
    // z.array with a form* first arg — still reported (not z.object or z.array)
    {
      code: 'z.object({ tags: z.array(z.formString()) })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formArray', primitive: 'array' } }],
      output: 'z.object({ tags: z.formArray(z.formString()) })',
    },
    // z.strictObject
    {
      code: 'z.strictObject({ name: z.string() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formString', primitive: 'string' } }],
      output: 'z.strictObject({ name: z.formString() })',
    },
    // Other ALLOWED_PARENTS
    {
      code: 'z.nullable({ value: z.number() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formNumber', primitive: 'number' } }],
      output: 'z.nullable({ value: z.formNumber() })',
    },
    {
      code: 'z.optional({ flag: z.boolean() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formBoolean', primitive: 'boolean' } }],
      output: 'z.optional({ flag: z.formBoolean() })',
    },
    {
      code: 'z.nullish({ ts: z.date() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formDate', primitive: 'date' } }],
      output: 'z.nullish({ ts: z.formDate() })',
    },
    {
      code: 'z.default({ name: z.string() })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formString', primitive: 'string' } }],
      output: 'z.default({ name: z.formString() })',
    },
    // Multiple primitives in one schema — both fixed in one pass
    {
      code: 'z.object({ name: z.string(), age: z.number() })',
      errors: [
        { messageId: 'useFormSchema', data: { formHelper: 'formString', primitive: 'string' } },
        { messageId: 'useFormSchema', data: { formHelper: 'formNumber', primitive: 'number' } },
      ],
      output: 'z.object({ name: z.formString(), age: z.formNumber() })',
    },
    // Primitive inside a nested z.object()
    {
      code: 'z.object({ address: z.object({ city: z.string() }) })',
      errors: [{ messageId: 'useFormSchema', data: { formHelper: 'formString', primitive: 'string' } }],
      output: 'z.object({ address: z.object({ city: z.formString() }) })',
    },
  ],
});
